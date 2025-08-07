import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function GET(req: NextRequest) {
  try {
    // First, check if API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not configured" },
        { status: 500 }
      );
    }

    // Log API key status (without exposing the key)
    console.log("API Key configured:", !!process.env.OPENAI_API_KEY);

    // Try to make a simple API call to verify connectivity
    try {
      const models = await openai.models.list();
      console.log("Available models:", models.data.map(m => m.id));
      
      return NextResponse.json({
        status: "success",
        message: "OpenAI API is accessible",
        models: models.data.map(m => m.id)
      });
    } catch (apiError: any) {
      console.error("OpenAI API Error:", {
        message: apiError.message,
        code: apiError.code,
        type: apiError.type
      });
      
      return NextResponse.json(
        { 
          status: "error",
          error: `OpenAI API Error: ${apiError.message}`,
          details: {
            code: apiError.code,
            type: apiError.type
          }
        },
        { status: apiError.status || 500 }
      );
    }
  } catch (error: unknown) {
    console.error("Test error:", error);
    
    let errorMessage = "Test failed";
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      { 
        status: "error",
        error: errorMessage 
      },
      { status: 500 }
    );
  }
}