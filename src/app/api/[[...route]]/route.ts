import { Hono } from 'hono';
import { handle } from 'hono/vercel';
import { streamText } from 'hono/streaming';
import Groq from 'groq-sdk';
import { DeepgramClient } from '@deepgram/sdk';
import { getDatabase } from '@/db/data-source';
import { Chat } from '@/entity/Chat';
import { Transcription } from '@/entity/Transcription';
import type { TranscriptSegment } from '@/entity/Transcription';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const deepgram = new DeepgramClient({ apiKey: process.env.DEEPGRAM_API_KEY! });

const app = new Hono().basePath('/api');

app.post('/chat', async (c) => {
    const { prompt } = await c.req.json();

    const db = await getDatabase();
    const chatRepo = db.getRepository(Chat);
    const chatRecord = chatRepo.create({ prompt, response: "" });
    await chatRepo.save(chatRecord);

    return streamText(c, async (stream) => {
        const aiStream = await groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'llama-3.1-8b-instant',
            stream: true,
        });

        let fullResponse = "";

        for await (const chunk of aiStream) {
            const text = chunk.choices[0]?.delta?.content || "";
            fullResponse += text;
            await stream.write(text);
        }

        chatRecord.response = fullResponse;
        await chatRepo.save(chatRecord);
    });
});

type DeepgramWord = {
    word: string;
    start: number;
    end: number;
    speaker: number;
    punctuated_word?: string;
};

function parseSegments(words: DeepgramWord[]): TranscriptSegment[] {
    if (words.length === 0) return [];

    const segments: TranscriptSegment[] = [];
    let currentSpeaker = words[0].speaker ?? 0;
    let currentWords: string[] = [];
    let segStart = words[0].start;
    let segEnd = words[0].end;

    for (const word of words) {
        const speaker = word.speaker ?? 0;
        const displayWord = word.punctuated_word ?? word.word;

        if (speaker !== currentSpeaker) {
            segments.push({
                speaker: `User${currentSpeaker + 1}`,
                text: currentWords.join(' '),
                start: segStart,
                end: segEnd,
            });
            currentSpeaker = speaker;
            currentWords = [displayWord];
            segStart = word.start;
            segEnd = word.end;
        } else {
            currentWords.push(displayWord);
            segEnd = word.end;
        }
    }

    if (currentWords.length > 0) {
        segments.push({
            speaker: `User${currentSpeaker + 1}`,
            text: currentWords.join(' '),
            start: segStart,
            end: segEnd,
        });
    }

    return segments;
}

app.post('/transcribe', async (c) => {
    const formData = await c.req.formData();
    const audioFile = formData.get('audio') as File | null;
    const userEmail = (formData.get('email') as string | null) ?? '';

    if (!audioFile) {
        return c.json({ error: 'No audio file provided' }, 400);
    }

    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await deepgram.listen.v1.media.transcribeFile(
        buffer,
        {
            model: 'nova-2',
            diarize: true,
            smart_format: true,
            punctuate: true,
        }
    );

    const words = ((result as unknown as { results?: { channels?: { alternatives?: { words?: DeepgramWord[] }[] }[] } })?.results?.channels?.[0]?.alternatives?.[0]?.words ?? []) as DeepgramWord[];
    const segments = parseSegments(words);
    const duration = ((result as unknown as { metadata?: { duration?: number } })?.metadata?.duration) ?? 0;

    let summary: string | null = null;
    if (segments.length > 0) {
        const transcriptText = segments.map((s) => `${s.speaker}: ${s.text}`).join('\n');
        try {
            const summaryRes = await groq.chat.completions.create({
                messages: [{
                    role: 'user',
                    content: `Summarize this conversation in 1-3 concise bullet points. Focus on key topics, decisions, and action items. Each bullet must start with "• ". Do not add any text before or after the bullets. If the conversation is too short or lacks enough content to summarize meaningfully, reply with exactly: "Not enough conversation to summarize."\n\nTranscript:\n${transcriptText}`,
                }],
                model: 'llama-3.1-8b-instant',
                stream: false,
            });
            summary = summaryRes.choices[0]?.message?.content ?? null;
        } catch { summary = null; }
    }

    const db = await getDatabase();
    const repo = db.getRepository(Transcription);
    const record = repo.create({ duration, segments, userEmail, summary });
    await repo.save(record);

    return c.json({ id: record.id, segments, duration, summary });
});

app.get('/transcriptions', async (c) => {
    const email = c.req.query('email');
    if (!email) return c.json([]);

    const db = await getDatabase();
    const repo = db.getRepository(Transcription);
    const records = await repo.find({
        where: { userEmail: email },
        order: { createdAt: 'DESC' },
        take: 20,
    });
    return c.json(records);
});

app.post('/transcriptions/:id/summary', async (c) => {
    const id = c.req.param('id');
    const db = await getDatabase();
    const repo = db.getRepository(Transcription);
    const record = await repo.findOne({ where: { id } });
    if (!record) return c.json({ error: 'Not found' }, 404);

    const transcriptText = record.segments.map((s) => `${s.speaker}: ${s.text}`).join('\n');
    const summaryRes = await groq.chat.completions.create({
        messages: [{
            role: 'user',
            content: `Summarize this conversation in 1-3 concise bullet points. Focus on key topics, decisions, and action items. Each bullet must start with "• ". Do not add any text before or after the bullets. If the conversation is too short or lacks enough content to summarize meaningfully, reply with exactly: "Not enough conversation to summarize."\n\nTranscript:\n${transcriptText}`,
        }],
        model: 'llama-3.1-8b-instant',
        stream: false,
    });
    record.summary = summaryRes.choices[0]?.message?.content ?? null;
    await repo.save(record);
    return c.json({ summary: record.summary });
});

app.patch('/transcriptions/:id', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json() as { speakerMap?: Record<string, string>; title?: string };
    const db = await getDatabase();
    const repo = db.getRepository(Transcription);
    const record = await repo.findOne({ where: { id } });
    if (!record) return c.json({ error: 'Not found' }, 404);
    if (body.speakerMap) {
        record.segments = record.segments.map((seg) => ({
            ...seg,
            speaker: body.speakerMap![seg.speaker] ?? seg.speaker,
        }));
    }
    if (body.title !== undefined) {
        record.title = body.title || null;
    }
    await repo.save(record);
    return c.json({ segments: record.segments, title: record.title });
});

app.delete('/transcriptions/:id', async (c) => {
    const id = c.req.param('id');
    const db = await getDatabase();
    const repo = db.getRepository(Transcription);
    await repo.delete({ id });
    return c.json({ success: true });
});

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);
