import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Invalid file upload" },
        { status: 400 }
      );
    }

    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size exceeds 25MB limit" },
        { status: 413 }
      );
    }

    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: "whisper-1",
      response_format: "verbose_json", // Changed from "text"
      timestamp_granularities: ["segment"] // Get word-level timestamps
    });

    // Return segments with timestamps
return NextResponse.json({text: transcription.text, segments: transcription.segments });
    // return NextResponse.json({ text: transcription });
  } catch (error: unknown) {
    console.error("Transcription error:", error);
    
    let errorMessage = "Transcription failed";
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export const OPTIONS = async () => {
  return new NextResponse(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
};