import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    console.log("=== Starting transcription request ===");
    
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      console.log("❌ Invalid file upload");
      return NextResponse.json(
        { error: "Invalid file upload" },
        { status: 400 }
      );
    }

    console.log("✅ File received:", file.name, "Size:", file.size, "Type:", file.type);

    if (file.size > 25 * 1024 * 1024) {
      console.log("❌ File too large:", file.size);
      return NextResponse.json(
        { error: "File size exceeds 25MB limit" },
        { status: 413 }
      );
    }

    // Validate file type
    const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/aac'];
    if (!allowedTypes.includes(file.type)) {
      console.log("❌ Invalid file type:", file.type);
      return NextResponse.json(
        { error: "Invalid file type. Please use MP3, WAV, or M4A." },
        { status: 400 }
      );
    }

    console.log("🚀 Starting OpenAI transcription...");

    try {
      const transcription = await openai.audio.transcriptions.create({
        file: file,
        model: "whisper-1",
        response_format: "verbose_json",
        timestamp_granularities: ["segment"]
      }, {
        timeout: 120000 // 2 minutes
      });

      console.log("✅ Transcription successful");
      console.log("📝 Text length:", transcription.text?.length || 0);
      console.log("📊 Segments count:", transcription.segments?.length || 0);

      return NextResponse.json({
        text: transcription.text,
        segments: transcription.segments
      });

    } catch (openaiError: any) {
      console.error("❌ OpenAI API Error:", {
        message: openaiError.message,
        code: openaiError.code,
        type: openaiError.type,
        status: openaiError.status
      });

      let errorMessage = "Transcription failed";
      
      if (openaiError.code === 'invalid_api_key') {
        errorMessage = "API key is invalid or expired";
      } else if (openaiError.code === 'rate_limit_exceeded') {
        errorMessage = "Rate limit exceeded. Please try again later.";
      } else if (openaiError.message?.includes('timeout')) {
        errorMessage = "Request timed out. Please try with a shorter audio file.";
      } else if (openaiError.message?.includes('file')) {
        errorMessage = "Invalid audio file format.";
      } else {
        errorMessage = openaiError.message || "OpenAI API error";
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error("❌ General transcription error:", error);
    
    let errorMessage = "Transcription failed";
    
    if (error.message?.includes('ECONNRESET')) {
      errorMessage = "Network connection failed. Please check your internet and try again.";
    } else if (error.message?.includes('timeout')) {
      errorMessage = "Request timed out. Please try with a shorter audio file.";
    } else {
      errorMessage = error.message || "Transcription failed. Please try again.";
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