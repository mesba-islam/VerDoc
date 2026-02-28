import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SummaryConfigurator from './SummaryConfigurator';
import type { SummaryConfig } from '@/app/types';
// import { createSupabaseBrowser } from '@/lib/supabase/client';
import { generateTitleFromSummaryByTemplate } from '@/app/lib/summaryUtils';

type TranscriptSegment = {
  text: string;
  start: number;
  end: number;
};

interface SummaryGeneratorProps {
  transcript: string;
  segments?: TranscriptSegment[];
  summary: string;
  onSummaryGenerated?: () => void;
  onTemplateUsed?: (template: string) => void;
  setSummary: (summary: string) => void;
  onCustomOpenChange?: (open: boolean) => void;
  canUsePremiumTemplates?: boolean;
  allowCustom?: boolean;
  activeTemplate?: string | null;
}

const SummaryGenerator = ({
  transcript,
  segments = [],
  summary,
  onSummaryGenerated,
  onTemplateUsed,
  setSummary,
  onCustomOpenChange,
  canUsePremiumTemplates = true,
  allowCustom = true,
  activeTemplate,
}: SummaryGeneratorProps) => {

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (config: SummaryConfig) => {
    if (!transcript) {
      setError('No transcript available');
      return;
    }

    try {
      setIsGenerating(true);
      setError(null);

      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: transcript,
          segments,
          config
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Summary generation failed';

        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = errorText.length > 200 ? "Server error" : errorText;
        }

        throw new Error(errorMessage);
      }

      const { summary } = await response.json();
      setSummary(summary);
      onTemplateUsed?.(config.template);

      onSummaryGenerated?.();
    }
    catch (err) {
      const error = err as Error;
      console.error('Summary generation error:', error);

      // Handle unauthorized error
      if (error.message.includes('Unauthorized')) {
        setError('Redirecting to login...');
        // Redirect to login page after short delay to show message
        setTimeout(() => {
          window.location.href = '/login'; // Your login page route
        }, 1500);
        return;
      }

      setError(error.message || 'Failed to generate summary');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuration Form with Animation */}
      <AnimatePresence mode="wait">
        {!summary && (
          <motion.div
            key="configurator"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <SummaryConfigurator
              onGenerate={handleGenerate}
              isGenerating={isGenerating}
              onCustomOpenChange={onCustomOpenChange}
              canUsePremiumTemplates={canUsePremiumTemplates}
              allowCustom={allowCustom}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading Animation */}
      {isGenerating && !summary && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-50 flex items-center justify-center"
        >
          <div className="flex flex-col items-center gap-4">
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-3 text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 px-6 py-4 rounded-lg shadow-lg"
            >
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-current rounded-full animate-pulse" />
                <div className="w-2 h-2 bg-current rounded-full animate-pulse delay-100" />
                <div className="w-2 h-2 bg-current rounded-full animate-pulse delay-200" />
              </div>
              <span className="text-sm font-medium">Generating summary...</span>
            </motion.div>
          </div>
        </motion.div>
      )}

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg border border-red-100 dark:border-red-900/30"
        >
          {error}
        </motion.div>
      )}

      {/* Generated Summary */}
      <AnimatePresence>
        {summary && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-white/10 dark:bg-gradient-to-br dark:from-slate-950/85 dark:via-slate-900/85 dark:to-slate-950/90"
          >
            <div className="pointer-events-none absolute inset-0 opacity-30">
              <div className="absolute -left-16 top-0 h-48 w-48 bg-[radial-gradient(circle_at_20%_20%,rgba(77,208,225,0.14),transparent_60%)] blur-2xl" />
              <div className="absolute right-0 bottom-0 h-52 w-52 bg-[radial-gradient(circle_at_80%_80%,rgba(106,175,255,0.12),transparent_60%)] blur-2xl" />
            </div>
            <div className="relative border-b border-slate-200 px-6 py-4 flex items-center justify-between dark:border-white/10">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Document preview</p>
                <h4 className="text-lg font-semibold text-slate-900 dark:text-white">Formatted summary</h4>
              </div>
            </div>
            <div className="relative px-6 py-6 text-slate-800 dark:text-slate-100">
              <div className="space-y-4 leading-7 text-sm md:text-base">
                {renderStructuredSummary(
                  generateTitleFromSummaryByTemplate(summary, activeTemplate).content,
                  activeTemplate,
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

type SummaryBlock =
  | { type: 'heading'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'paragraph'; text: string }
  | { type: 'title'; text: string };

function renderStructuredSummary(raw: string, templateKey?: string | null) {
  const isEvidenceTemplate = templateKey === 'evidence-leveraging-intelligence';
  const lines = raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => l !== '```');
  const blocks: SummaryBlock[] = [];

  lines.forEach((line, idx) => {
    const normalized = line
      .replace(/^#{1,6}\s+/, '')
      .replace(/^\*{3}(.+?)\*{3}$/, '$1')
      .replace(/^\*{2}(.+?)\*{2}$/, '$1')
      .replace(/\*{2,}/g, '')
      .trim();

    const isDateLine = idx === 0 && /[A-Za-z]+ \d{1,2}, \d{4}/.test(normalized);
    if (!normalized) return;

    if (isDateLine) {
      blocks.push({ type: 'title', text: normalized });
      return;
    }

    const isListItem = /^([-*]\s+|\d+\.\s+)/.test(normalized);
    if (isListItem) {
      const text = normalized.replace(/^([-*]\s+|\d+\.\s+)/, '').trim();
      const last = blocks[blocks.length - 1];
      if (last && last.type === 'list') {
        last.items.push(text);
      } else {
        blocks.push({ type: 'list', items: [text] });
      }
      return;
    }

    const isHeading = !isEvidenceTemplate && (
      /:$/.test(normalized) ||
      /^(TL;DR Summary|Strategic Signal|Decision Confidence|Advisory Insight|Impacted Metrics \/ KPIs|Task Tracker|Execution Watchlist|Executive TL;DR|Decisions Made|Key Risks & Mitigations|Metrics Mentioned|Asks \/ Requests|Next Review Checkpoints|Areas of Strong Alignment|Repeated Objections|Unresolved Disagreements|Topics Deferred Without Resolution|Risk of Misalignment)$/i.test(
        normalized,
      )
    );
    if (isHeading) {
      blocks.push({ type: 'heading', text: normalized.replace(/:$/, '') });
      return;
    }

    blocks.push({ type: 'paragraph', text: normalized });
  });

  const formatBold = (text: string) =>
    text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*{2,}/g, '');

  return blocks.map((block, i) => {
    if (block.type === 'title') {
      return (
        <motion.p
          key={`title-${i}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300"
        >
          {block.text}
        </motion.p>
      );
    }

    if (block.type === 'list') {
      return (
        <motion.ul
          key={`list-${i}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2 rounded-xl bg-slate-50/80 px-4 py-3 text-slate-800 shadow-sm ring-1 ring-slate-200/70 dark:bg-slate-900/40 dark:text-slate-100 dark:ring-white/10"
        >
          {block.items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-3 leading-6">
              <span className="mt-[6px] inline-block h-2 w-2 aspect-square rounded-full bg-cyan-400/85 ring-2 ring-cyan-400/25" />
              <span
                className="font-normal"
                dangerouslySetInnerHTML={{ __html: formatBold(item) }}
              />
            </li>
          ))}
        </motion.ul>
      );
    }

    if (block.type === 'heading') {
      return (
        <motion.h5
          key={`h-${i}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-slate-900 dark:text-slate-100 text-base font-bold"
          dangerouslySetInnerHTML={{ __html: formatBold(block.text) }}
        />
      );
    }

    return (
      <motion.p
        key={`p-${i}`}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className={`text-slate-800 dark:text-slate-200 ${isEvidenceTemplate ? 'font-semibold' : 'font-normal'}`}
        dangerouslySetInnerHTML={{ __html: formatBold(block.text) }}
      />
    );
  });
}

export default SummaryGenerator;
