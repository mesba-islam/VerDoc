import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type OpenAIErrorPayload = {
  message?: string;
  code?: string;
  type?: string;
  status?: number;
};

const toOpenAIError = (error: unknown): OpenAIErrorPayload => {
  if (typeof error !== "object" || error === null) {
    return {};
  }

  const record = error as Record<string, unknown>;
  return {
    message: typeof record.message === "string" ? record.message : undefined,
    code: typeof record.code === "string" ? record.code : undefined,
    type: typeof record.type === "string" ? record.type : undefined,
    status: typeof record.status === "number" ? record.status : undefined,
  };
};

export async function POST(req: NextRequest) {
  try {
    console.log("[transcribe] Received transcription request");

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      console.log("[transcribe] Invalid file upload");
      return NextResponse.json({ error: "Invalid file upload" }, { status: 400 });
    }

    console.log("[transcribe] File received", {
      name: file.name,
      size: file.size,
      type: file.type,
    });

    if (file.size > 25 * 1024 * 1024) {
      console.log("[transcribe] File too large", file.size);
      return NextResponse.json({ error: "File size exceeds 25MB limit" }, { status: 413 });
    }

    const allowedTypes = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/m4a", "audio/aac"];
    if (!allowedTypes.includes(file.type)) {
      console.log("[transcribe] Invalid file type", file.type);
      return NextResponse.json(
        { error: "Invalid file type. Please use MP3, WAV, or M4A." },
        { status: 400 },
      );
    }

    try {
      const transcription = await openai.audio.transcriptions.create(
        {
          file,
          model: "whisper-1",
          response_format: "verbose_json",
          timestamp_granularities: ["segment"],
        },
        { timeout: 120_000 },
      );

      return NextResponse.json({
        text: transcription.text,
        segments: transcription.segments,
      });
    } catch (openaiError: unknown) {
      const { message, code, type, status } = toOpenAIError(openaiError);
      console.error("[transcribe] OpenAI API error", { message, code, type, status });

      let errorMessage = "Transcription failed";
      const safeMessage = message ?? "OpenAI API error";

      if (code === "invalid_api_key") {
        errorMessage = "API key is invalid or expired";
      } else if (code === "rate_limit_exceeded") {
        errorMessage = "Rate limit exceeded. Please try again later.";
      } else if (safeMessage.toLowerCase().includes("timeout")) {
        errorMessage = "Request timed out. Please try with a shorter audio file.";
      } else if (safeMessage.toLowerCase().includes("file")) {
        errorMessage = "Invalid audio file format.";
      } else {
        errorMessage = safeMessage;
      }

      return NextResponse.json({ error: errorMessage }, { status: status ?? 500 });
    }
  } catch (error: unknown) {
    console.error("[transcribe] General transcription error", error);

    let errorMessage = "Transcription failed. Please try again.";
    if (error instanceof Error) {
      const normalized = error.message.toLowerCase();
      if (normalized.includes("econnreset")) {
        errorMessage = "Network connection failed. Please check your internet and try again.";
      } else if (normalized.includes("timeout")) {
        errorMessage = "Request timed out. Please try with a shorter audio file.";
      } else {
        errorMessage = error.message || errorMessage;
      }
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export const OPTIONS = async () =>
  new NextResponse(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
