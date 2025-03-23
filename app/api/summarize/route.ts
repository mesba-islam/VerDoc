import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import type { SummaryConfig } from '@/app/types';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type ApiRequest = {
  text: string;
  config: SummaryConfig;
};

export async function POST(request: Request) {
  try {
    // Initialize Supabase client with cookie store (no await needed)
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          async getAll() {
            const cookieStore = await cookies();
            return cookieStore.getAll();
          },
          async setAll(cookiesToSet) {
            const cookieStore = await cookies();
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // This can be ignored in Server Components if needed.
            }
          },
        },
      }
    );

    // Use getUser() instead of session for verified auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized: Please sign in" },
        { status: 401 }
      );
    }

    // Validate request payload
    const { text, config }: ApiRequest = await request.json();
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: "Invalid text input" }, { status: 400 });
    }
    if (!config || typeof config !== 'object') {
      return NextResponse.json({ error: "Invalid configuration" }, { status: 400 });
    }

    // Generate summary prompt and call OpenAI API
    const prompt = buildDynamicPrompt(text, config);
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: "You are a professional executive summary generator. Follow the user's specifications precisely."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: config.formality === 'technical' ? 0.3 : 0.5,
      max_tokens: config.length === 'detailed' ? 1500 : 750
    });
    const generatedSummary = completion.choices[0].message.content?.trim() || "";
    const summaryTitle = generatedSummary.split('\n')[0].substring(0, 50);

    // Save generated summary to the database
    const { error: insertError } = await supabase
      .from('summaries')
      .insert({
        user_id: user.id,
        content: generatedSummary,
        title: summaryTitle,
        created_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('Supabase save error:', insertError);
      return NextResponse.json(
        { error: "Failed to save summary to database" },
        { status: 500 }
      );
    }

    return NextResponse.json({ summary: generatedSummary });
  } catch (error) {
    console.error('OpenAI API error:', error);
    return NextResponse.json(
      { error: "Summary generation failed" },
      { status: 500 }
    );
  }
}

function buildDynamicPrompt(text: string, config: SummaryConfig): string {
  let prompt = `Create a professional executive summary make it clean text remove any unnecessary characters with these requirements:\n`;
  
  prompt += `- Tone: ${config.formality}\n`;
  prompt += `- Length: ${config.length}\n`;
  prompt += `- Focus Areas: ${config.focusAreas.join(', ') || 'General overview'}\n`;
  
  if (config.customInstructions) {
    prompt += `- Custom Instructions: ${config.customInstructions}\n`;
  }

  prompt += `\Follow this structure:\n${
    config.length === 'short' ? 
    `1.Title make it without the label\n2.Overview\n3. Key Points` :
    config.length === 'medium' ?
    `1.Title make it without the label\n 2.Introduction\n3. Main Findings\n4. Recommendations` :
    `1.Title make it without the label\n2. Executive Overview\n3. Methodology\n4. Key Insights\n5. Strategic Recommendations\n6. Action Plan`
  }\n\nText to summarize:\n${text}`;

  return prompt;
}