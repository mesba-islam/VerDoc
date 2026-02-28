import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import type { SummaryConfig } from '@/app/types';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

type CookieToSet = {
  name: string;
  value: string;
  options?: CookieOptions;
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type TranscriptSegment = {
  text: string;
  start: number;
  end: number;
};

type ApiRequest = {
  text: string;
  segments?: TranscriptSegment[];
  config: SummaryConfig;
};

type TemplateDefinition = {
  name: string;
  description: string;
  instructionLogic: string;
};

const TEMPLATE_DEFINITIONS: Record<string, TemplateDefinition> = {
  'executive-brief': {
    name: 'Executive Brief',
    description: 'Judgment-led executive overview of what happened and why it matters.',
    instructionLogic: `Required sections:
1) TL;DR Summary (3-5 bullets) - outcome-focused.
2) Strategic Signal - what this reveals about direction, priorities, or risk.
3) Decision Confidence - provide High, Medium, or Low and justify with transcript evidence.
4) Advisory Insight - exactly one sentence recommendation or warning for executives.
5) Impacted Metrics / KPIs - include only metrics explicitly mentioned in transcript.`,
  },
  'decision-intelligence-report': {
    name: 'Decision Intelligence Report',
    description: 'Classified and assessed decision log suitable for leadership review.',
    instructionLogic: `List each decision in a consistent block with these required fields:
- Decision statement
- Type: Strategic / Operational / Tactical
- Owner: include only if explicitly mentioned
- Reversibility: Easy / Costly / Hard
- Confidence Level: High / Medium / Low, with reason
- Rationale: Why this decision was made`,
  },
  'execution-risk-scan': {
    name: 'Execution Risk Scan',
    description: 'Operational task tracker with proactive execution-risk detection.',
    instructionLogic: `Required sections:
1) Task Tracker
   Format each line as: Task | Owner | Deadline
   Include only fields explicitly present in the transcript
2) Execution Watchlist
   Include explicit bullets for:
   - Missing owners
   - Missing deadlines
   - External dependencies
   - Conflicting or vague commitments`,
  },
  'risk-prioritization-matrix': {
    name: 'Risk Prioritization Matrix',
    description: 'Ranked risk view for executive triage and follow-up.',
    instructionLogic: `Use exactly these sections:
1) High Impact / High Likelihood
2) High Impact / Low Likelihood
3) Medium Impact
4) Low Impact

For each risk include:
- Short description
- Owner (include only if explicitly mentioned)

For top risks (at least all risks in section 1), add "Suggested Next Step".`,
  },
  'evidence-leveraging-intelligence': {
    name: 'Evidence Leveraging Intelligence',
    description: 'Auditable claim-to-proof mapping with transcript-grounded evidence.',
    instructionLogic: `For each evidence item include:
- Claim
- Timestamp (from transcript only; never invent)
- Evidence (quote or faithful paraphrase)
- Contradictions or tension (if present)
- Related context

For these fields, format each present field as a bullet line:
- Timestamp: ...
- Evidence: ...
- Contradictions or Tension: ...
- Related context: ...`,
  },
  'content-repurposing-pack': {
    name: 'Content Repurposing Pack',
    description: 'Professional multi-channel repurposing outputs from meeting insights.',
    instructionLogic: `Required sections:
1) LinkedIn-ready post (professional tone)
2) Two short hooks
3) One executive quote box
4) One newsletter paragraph
5) Optional CTA suggestion only if transcript supports a clear ask or next step`,
  },
  'change-impact-brief': {
    name: 'Change Impact Brief',
    description: 'Material-change summary for recurring leadership reviews.',
    instructionLogic: `Required sections:
1) New Decisions
2) Changed Priorities
3) Escalated Risks
4) Deprioritized Topics
5) Net Impact Summary (1-2 sentences)

Only include changes explicitly referenced in transcript.`,
  },
  'one-page-board-memo': {
    name: 'One-Page Board Memo',
    description: 'Printable, concise board-ready memo for decision forums.',
    instructionLogic: `Keep output concise and scannable, with no narrative fluff.
Required sections:
1) Executive TL;DR
2) Decisions Made
3) Key Risks & Mitigations
4) Metrics Mentioned
5) Asks / Requests
6) Next Review Checkpoints

Prefer bullets. Use only transcript-backed statements.`,
  },
  'alignment-disagreement-map': {
    name: 'Alignment & Disagreement Map',
    description: 'Neutral mapping of agreement, friction, and unresolved debate.',
    instructionLogic: `Required sections:
1) Areas of Strong Alignment
2) Repeated Objections
3) Unresolved Disagreements
4) Topics Deferred Without Resolution
5) Risk of Misalignment (Low / Medium / High) with short rationale

Detection logic must rely on transcript signals:
- repeated topics
- conflicting viewpoints
- avoided conclusions`,
  },
};

const TEMPLATE_ALIASES: Record<string, string> = {
  'executive-summary': 'executive-brief',
  'decisions-made': 'decision-intelligence-report',
  'action-items': 'execution-risk-scan',
  'open-questions': 'risk-prioritization-matrix',
  'timestamped-proof': 'evidence-leveraging-intelligence',
  'linkedin-post': 'content-repurposing-pack',
  general: 'executive-brief',
  startup: 'executive-brief',
  technical: 'executive-brief',
  financial: 'executive-brief',
};

const METADATA_LINE_REGEX =
  /^(template name|template description|internal prompt|instruction logic|example output|a\.|b\.|c\.|d\.)\b/i;
const EVIDENCE_FIELD_LABEL_REGEX =
  /^(timestamp|evidence|contradictions or tension|related context)\s*:/i;

const resolveTemplateKey = (template: string): string => {
  if (template in TEMPLATE_DEFINITIONS) return template;
  return TEMPLATE_ALIASES[template] ?? 'executive-brief';
};

export async function POST(request: Request) {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          async getAll() {
            const cookieStore = await cookies();
            return cookieStore.getAll();
          },
          async setAll(cookiesToSet: CookieToSet[]) {
            const cookieStore = await cookies();
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options),
              );
            } catch {
              // Safe to ignore in this route context.
            }
          },
        },
      },
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized: Please sign in' },
        { status: 401 },
      );
    }

    const { text, config, segments }: ApiRequest = await request.json();
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Invalid text input' }, { status: 400 });
    }
    if (!config || typeof config !== 'object') {
      return NextResponse.json({ error: 'Invalid configuration' }, { status: 400 });
    }

    const normalizedSegments = sanitizeSegments(segments);
    const templateKey = resolveTemplateKey(config.template);
    const prompt = buildDynamicPrompt(text, config, templateKey, normalizedSegments);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        {
          role: 'system',
          content:
            'You are a decision-intelligence analyst producing board-ready documentation. Follow all structural requirements exactly and never invent facts.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: config.formality === 'technical' ? 0.3 : 0.5,
      max_tokens: config.length === 'detailed' ? 1800 : config.length === 'medium' ? 1200 : 850,
    });

    const rawSummary = completion.choices[0].message.content?.trim() || '';
    const generatedSummary = normalizeSummaryOutput(rawSummary, templateKey);
    const summaryTitle = buildSummaryTitle(generatedSummary, templateKey);

    const { error: insertError } = await supabase.from('summaries').insert({
      user_id: user.id,
      content: generatedSummary,
      title: summaryTitle,
      created_at: new Date().toISOString(),
    });

    if (insertError) {
      console.error('Supabase save error:', insertError);
      return NextResponse.json(
        { error: 'Failed to save summary to database' },
        { status: 500 },
      );
    }

    return NextResponse.json({ summary: generatedSummary });
  } catch (error) {
    console.error('OpenAI API error:', error);
    return NextResponse.json(
      { error: 'Summary generation failed' },
      { status: 500 },
    );
  }
}

function buildDynamicPrompt(
  text: string,
  config: SummaryConfig,
  templateKey: string,
  segments: TranscriptSegment[],
): string {
  const template = TEMPLATE_DEFINITIONS[templateKey];
  const focusAreas = config.focusAreas.length > 0
    ? config.focusAreas.join(', ')
    : 'No additional focus areas specified.';
  const customInstruction = config.customInstructions?.trim();
  const timestampContext = segments.length > 0
    ? segments
      .slice(0, 400)
      .map((segment) => `[${formatTimestamp(segment.start)} - ${formatTimestamp(segment.end)}] ${segment.text}`)
      .join('\n')
    : 'No timestamped transcript segments provided.';

  let prompt = `Use this internal configuration. Do not print these metadata labels in your output:
Template: ${template.name}
Purpose: ${template.description}
Tone: ${config.formality}
Length Preference: ${config.length}
Focus Areas: ${focusAreas}

Global rules for all templates:
1) Do not hallucinate facts. Use only transcript content.
2) Include only sections, bullets, and fields explicitly supported by the transcript.
3) Never invent timestamps.
4) Prefer concise lists over long paragraphs.
5) Output must be clean, exportable, and professional.
6) Tone must match senior professionals and executives.
7) If a requested item is not supported by transcript evidence, omit it.
8) Do not output markdown symbols such as "***", "**", "#", or code fences.
9) Do not output labels such as "Template Name", "Template Description", "Internal Prompt", or "Example Output".
10) Use clear section headings as plain text lines ending with ":".

Template-specific instruction logic:
${template.instructionLogic}
`;

  if (templateKey === 'evidence-leveraging-intelligence') {
    prompt += `
Timestamp guidance for this template:
- Use timestamps from "Timestamped transcript segments" when matching evidence claims.
- Include evidence entries only when a timestamped segment can support them.
- If a claim cannot be mapped to a timestamped segment, omit that claim.
- When present, output Timestamp, Evidence, Contradictions or Tension, and Related context as bullet lines.
`;
  }

  if (customInstruction) {
    prompt += `
User custom instruction (apply only if it does not conflict with rules above):
${customInstruction}
`;
  }

  prompt += `
Transcript:
${text}

Timestamped transcript segments:
${timestampContext}
`;

  return prompt;
}

function sanitizeSegments(segments: ApiRequest['segments']): TranscriptSegment[] {
  if (!Array.isArray(segments)) return [];

  return segments
    .filter((segment): segment is TranscriptSegment =>
      Boolean(segment) &&
      typeof segment.text === 'string' &&
      typeof segment.start === 'number' &&
      typeof segment.end === 'number' &&
      Number.isFinite(segment.start) &&
      Number.isFinite(segment.end),
    )
    .map((segment) => ({
      text: segment.text.trim(),
      start: Math.max(0, segment.start),
      end: Math.max(segment.start, segment.end),
    }))
    .filter((segment) => segment.text.length > 0);
}

function formatTimestamp(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function normalizeSummaryOutput(summary: string, templateKey: string): string {
  const isEvidenceTemplate = templateKey === 'evidence-leveraging-intelligence';
  const lines = summary
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => line !== '```')
    .map((line) =>
      line
        .replace(/^#{1,6}\s+/, '')
        .replace(/^\*{3}(.+?)\*{3}$/, '$1')
        .replace(/^\*{2}(.+?)\*{2}$/, '$1')
        .replace(/\*{2,}/g, '')
        .replace(/^`{1,3}(.*)`{1,3}$/, '$1')
        .trim(),
    )
    .filter(Boolean)
    .filter((line) => !/^[-*]{3,}$/.test(line))
    .filter((line) => !METADATA_LINE_REGEX.test(line.replace(/^[-*]\s+/, '')));

  if (isEvidenceTemplate) {
    return enforceEvidenceFieldBullets(lines).join('\n').trim();
  }

  return convertDashBulletsToNumbered(lines).join('\n').trim();
}

function convertDashBulletsToNumbered(lines: string[]): string[] {
  const normalized: string[] = [];
  let listIndex = 0;

  lines.forEach((line) => {
    if (/^[-*]\s+/.test(line)) {
      listIndex += 1;
      normalized.push(`${listIndex}. ${line.replace(/^[-*]\s+/, '').trim()}`);
      return;
    }

    if (/^\d+\.\s+/.test(line)) {
      listIndex += 1;
      normalized.push(`${listIndex}. ${line.replace(/^\d+\.\s+/, '').trim()}`);
      return;
    }

    if (/:$/.test(line)) {
      listIndex = 0;
      normalized.push(line);
      return;
    }

    listIndex = 0;
    normalized.push(line);
  });

  return normalized;
}

function enforceEvidenceFieldBullets(lines: string[]): string[] {
  return lines.map((line) => {
    const normalized = line.replace(/^(\d+\.\s+|[-*]\s+)/, '').trim();
    if (!EVIDENCE_FIELD_LABEL_REGEX.test(normalized)) {
      return line;
    }
    return `- ${normalized}`;
  });
}

function buildSummaryTitle(summary: string, templateKey: string): string {
  const firstMeaningfulLine = summary
    .split('\n')
    .map((line) => line.trim())
    .find((line) => Boolean(line) && !/^(\d+\.\s+|[-*]\s+)/.test(line));

  const fallbackTitle = TEMPLATE_DEFINITIONS[templateKey]?.name ?? 'Document Summary';
  return (firstMeaningfulLine || fallbackTitle).replace(/:$/, '').slice(0, 80);
}
