import { NextResponse } from "next/server";
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

export async function GET() {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not configured" },
        { status: 500 },
      );
    }

    console.log("[test-whisper] API key configured:", Boolean(process.env.OPENAI_API_KEY));

    try {
      const models = await openai.models.list();
      console.log("[test-whisper] Available models:", models.data.map((model) => model.id));

      return NextResponse.json({
        status: "success",
        message: "OpenAI API is accessible",
        models: models.data.map((model) => model.id),
      });
    } catch (apiError: unknown) {
      const { message, code, type, status } = toOpenAIError(apiError);
      console.error("[test-whisper] OpenAI API error:", { message, code, type });

      return NextResponse.json(
        {
          status: "error",
          error: `OpenAI API Error: ${message ?? "Unknown error"}`,
          details: { code, type },
        },
        { status: status ?? 500 },
      );
    }
  } catch (error: unknown) {
    console.error("[test-whisper] Test error:", error);

    const message = error instanceof Error ? error.message : "Test failed";
    return NextResponse.json({ status: "error", error: message }, { status: 500 });
  }
}
