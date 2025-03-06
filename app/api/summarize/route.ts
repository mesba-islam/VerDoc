import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import type { SummaryConfig } from '@/app/types';


const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type ApiRequest = {
  text: string;
  config: SummaryConfig;
};

export async function POST(request: Request) {
  try {
    const { text, config }: ApiRequest = await request.json();
    
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: "Invalid text input" },
        { status: 400 }
      );
    }

    if (!config || typeof config !== 'object') {
      return NextResponse.json(
        { error: "Invalid configuration" },
        { status: 400 }
      );
    }

    const prompt = buildDynamicPrompt(text, config);
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [{
        role: "system",
        content: "You are a professional executive summary generator. Follow the user's specifications precisely."
      }, {
        role: "user",
        content: prompt
      }],
      temperature: config.formality === 'technical' ? 0.3 : 0.5,
      max_tokens: config.length === 'detailed' ? 1500 : 750
    });

    return NextResponse.json({
      summary: completion.choices[0].message.content
    });

  } catch (error) {
    console.error('OpenAI API error:', error);
    return NextResponse.json(
      { error: "Summary generation failed" },
      { status: 500 }
    );
  }
}

function buildDynamicPrompt(text: string, config: SummaryConfig): string {
  let prompt = `Create a professional executive summary with these requirements:\n`;
  
  prompt += `- Tone: ${config.formality}\n`;
  prompt += `- Length: ${config.length}\n`;
  prompt += `- Focus Areas: ${config.focusAreas.join(', ') || 'General overview'}\n`;
  
  if (config.customInstructions) {
    prompt += `- Custom Instructions: ${config.customInstructions}\n`;
  }

  prompt += `\Follow this structure:\n${
    config.length === 'short' ? 
    `1. Overview\n2. Key Points` :
    config.length === 'medium' ?
    `1. Introduction\n2. Main Findings\n3. Recommendations` :
    `1. Executive Overview\n2. Methodology\n3. Key Insights\n4. Strategic Recommendations\n5. Action Plan`
  }\n\nText to summarize:\n${text}`;

  return prompt;
}