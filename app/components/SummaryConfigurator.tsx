import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowRight,
  CheckSquare,
  ChevronDown,
  ClipboardList,
  FileText,
  NotebookPen,
  PlayCircle,
  Repeat,
  Share2,
  Sparkles,
  Users,
} from 'lucide-react';
import type { SummaryConfig } from '@/app/types';

interface SummaryConfiguratorProps {
  onGenerate: (config: SummaryConfig) => void;
  isGenerating: boolean;
  onCustomOpenChange?: (open: boolean) => void;
  canUsePremiumTemplates?: boolean;
  allowCustom?: boolean;
}

export const defaultConfig: SummaryConfig = {
  template: 'executive-brief',
  customInstructions: '',
  formality: 'professional',
  length: 'medium',
  focusAreas: [],
};

type QuickTemplate = {
  key: string;
  title: string;
  subtitle: string;
  icon: typeof Sparkles;
  accent: string;
  length?: SummaryConfig['length'];
  formality?: SummaryConfig['formality'];
  customInstructions: string;
};

const quickTemplates: QuickTemplate[] = [
  {
    key: 'executive-brief',
    title: 'Executive Brief',
    subtitle: 'Judgment-led strategic snapshot',
    icon: Sparkles,
    accent: 'from-cyan-400 to-emerald-400',
    customInstructions:
      'Build an executive brief with TL;DR, strategic signal, decision confidence, advisory insight, and explicit KPI mentions only.',
  },
  {
    key: 'decision-intelligence-report',
    title: 'Decision Intelligence Report',
    subtitle: 'Classified, assessed decisions',
    icon: CheckSquare,
    accent: 'from-amber-300 to-orange-400',
    customInstructions:
      'Classify decisions (Strategic, Operational, Tactical), assess reversibility and confidence, and explain rationale.',
    length: 'short',
  },
  {
    key: 'execution-risk-scan',
    title: 'Execution Risk Scan',
    subtitle: 'Task tracking plus risk watchlist',
    icon: ClipboardList,
    accent: 'from-indigo-300 to-sky-400',
    customInstructions:
      'Produce Task | Owner | Deadline and flag execution risk gaps, including missing owners, missing deadlines, dependencies, and vague commitments.',
  },
  {
    key: 'risk-prioritization-matrix',
    title: 'Risk Prioritization Matrix',
    subtitle: 'Ranked risk landscape',
    icon: AlertTriangle,
    accent: 'from-pink-300 to-fuchsia-500',
    customInstructions:
      'Group risks by impact and likelihood, include owner if mentioned, and propose next steps for top risks.',
  },
  {
    key: 'evidence-leveraging-intelligence',
    title: 'Evidence Leveraging Intelligence',
    subtitle: 'Audit-ready claims and proof',
    icon: PlayCircle,
    accent: 'from-teal-300 to-cyan-400',
    customInstructions:
      'Create claim-level evidence with transcript-only timestamps, related context, and contradictions or tension when present.',
    formality: 'technical',
    length: 'short',
  },
  {
    key: 'content-repurposing-pack',
    title: 'Content Repurposing Pack',
    subtitle: 'Multi-format executive content',
    icon: Share2,
    accent: 'from-purple-300 to-blue-400',
    customInstructions:
      'Produce a LinkedIn post, two hooks, an executive quote box, and a newsletter paragraph; add CTA only when transcript-supported.',
    length: 'short',
  },
  {
    key: 'change-impact-brief',
    title: 'Change Impact Brief',
    subtitle: 'What materially changed',
    icon: Repeat,
    accent: 'from-lime-300 to-emerald-500',
    customInstructions:
      'Highlight new decisions, changed priorities, escalated risks, deprioritized topics, and net impact.',
    length: 'short',
  },
  {
    key: 'one-page-board-memo',
    title: 'One-Page Board Memo',
    subtitle: 'Printable board-ready page',
    icon: FileText,
    accent: 'from-slate-300 to-slate-500',
    customInstructions:
      'Generate concise board memo sections: TL;DR, decisions, risks with mitigations, metrics, asks, and next review checkpoints.',
    length: 'medium',
  },
  {
    key: 'alignment-disagreement-map',
    title: 'Alignment & Disagreement Map',
    subtitle: 'Expose unresolved tension',
    icon: Users,
    accent: 'from-rose-300 to-red-500',
    customInstructions:
      'Map alignment, objections, unresolved disagreements, deferred topics, and risk of misalignment.',
    length: 'medium',
    formality: 'technical',
  },
];

const templates = [
  { value: 'executive-brief', label: 'Executive Brief' },
  { value: 'decision-intelligence-report', label: 'Decision Intelligence Report' },
  { value: 'execution-risk-scan', label: 'Execution Risk Scan' },
  { value: 'risk-prioritization-matrix', label: 'Risk Prioritization Matrix' },
  { value: 'evidence-leveraging-intelligence', label: 'Evidence Leveraging Intelligence' },
  { value: 'content-repurposing-pack', label: 'Content Repurposing Pack' },
  { value: 'change-impact-brief', label: 'Change Impact Brief' },
  { value: 'one-page-board-memo', label: 'One-Page Board Memo' },
  { value: 'alignment-disagreement-map', label: 'Alignment & Disagreement Map' },
];

const SummaryConfigurator = ({ onGenerate, isGenerating, onCustomOpenChange, canUsePremiumTemplates = true, allowCustom = true }: SummaryConfiguratorProps) => {
  const [config, setConfig] = useState<SummaryConfig>(defaultConfig);
  const [isCustomOpen, setIsCustomOpen] = useState(false);

  useEffect(() => {
    onCustomOpenChange?.(isCustomOpen);
  }, [isCustomOpen, onCustomOpenChange]);

  const handleCustomSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onGenerate(config);
  };

  const handleQuickGenerate = (template: QuickTemplate) => {
    if (isGenerating) return;
    if (!canUsePremiumTemplates && template.key !== 'executive-brief') return;
    onGenerate({
      ...defaultConfig,
      template: template.key,
      formality: template.formality || 'professional',
      length: template.length || 'medium',
      customInstructions: template.customInstructions,
      focusAreas: [],
    });
  };

  return (
    <div className="relative overflow-hidden rounded-2xl p-6">
      {/* Animated blobs (single layer visual only) */}
      <motion.div
        className="pointer-events-none absolute -left-24 -top-32 h-80 w-80 rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(77,208,225,0.32),rgba(21,41,78,0.14),transparent_60%)] blur-3xl"
        animate={{ x: [0, 55, -30, 20, 0], y: [0, 28, 12, -14, 0], scale: [1, 1.08, 0.95, 1.05, 1] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="pointer-events-none absolute -right-28 bottom-0 h-88 w-88 rounded-full bg-[radial-gradient(circle_at_70%_70%,rgba(122,229,130,0.22),rgba(55,108,166,0.16),transparent_60%)] blur-3xl"
        animate={{ x: [0, -40, 40, -12, 0], y: [0, -18, 28, -10, 0], scale: [1, 0.94, 1.07, 0.97, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="relative space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Boardroom Clarity</p>
            <h4 className="text-xl font-semibold text-slate-900 dark:text-white">Pick a template or craft your own</h4>
          </div>
          <span className="rounded-full border border-slate-200/80 bg-white px-3 py-1 text-xs text-slate-700 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
            One-click ready
          </span>
        </div>

        <div className="space-y-4">
          {/* Custom Document card (disabled for Free) */}
          {allowCustom ? (
            <motion.div
              layout
              className="rounded-xl border border-slate-200/80 bg-white/80 backdrop-blur-xl shadow-sm dark:border-white/10 dark:bg-white/5"
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            >
              <button
                type="button"
                onClick={() => setIsCustomOpen((open) => !open)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-slate-900 transition hover:bg-white/50 dark:text-white dark:hover:bg-white/5"
              >
                <div className="flex size-12 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400/80 to-blue-500/80 text-slate-950 shadow-lg shadow-cyan-500/20">
                  <motion.div
                    animate={{ rotate: [0, 2, -2, 0] }}
                    transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
                  >
                    <NotebookPen className="size-6" />
                  </motion.div>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">Custom Document</p>
                  <p className="text-xs text-slate-500 dark:text-slate-300">Open to set template, tone, length, and instructions</p>
                </div>
                <ChevronDown
                  className={`size-5 text-slate-600 transition-transform dark:text-slate-200 ${isCustomOpen ? 'rotate-180' : ''}`}
                />
              </button>

              <AnimatePresence initial={false}>
                {isCustomOpen && (
                  <motion.form
                    key="custom-form"
                    layout
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    onSubmit={handleCustomSubmit}
                    className="space-y-4 px-4 pb-4"
                  >
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm text-slate-700 dark:text-slate-200">Template</label>
                        <select
                          value={config.template}
                          onChange={(event) => setConfig({ ...config, template: event.target.value })}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-400 dark:border-white/10 dark:bg-slate-900/60 dark:text-white"
                        >
                          {templates.map((tpl) => (
                            <option key={tpl.value} value={tpl.value} className="bg-slate-900">
                              {tpl.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm text-slate-700 dark:text-slate-200">Tone</label>
                        <select
                          value={config.formality}
                          onChange={(event) =>
                            setConfig({
                              ...config,
                              formality: event.target.value as SummaryConfig['formality'],
                            })
                          }
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-400 dark:border-white/10 dark:bg-slate-900/60 dark:text-white"
                        >
                          <option value="casual">Casual</option>
                          <option value="professional">Professional</option>
                          <option value="technical">Technical</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm text-slate-700 dark:text-slate-200">Length</label>
                        <select
                          value={config.length}
                          onChange={(event) =>
                            setConfig({
                              ...config,
                              length: event.target.value as SummaryConfig['length'],
                            })
                          }
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-400 dark:border-white/10 dark:bg-slate-900/60 dark:text-white"
                        >
                          <option value="short">Short (3-5 bullets)</option>
                          <option value="medium">Medium (1 paragraph)</option>
                          <option value="detailed">Detailed (structured sections)</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm text-slate-700 dark:text-slate-200">Custom Instructions</label>
                        <textarea
                          value={config.customInstructions}
                          onChange={(event) => setConfig({ ...config, customInstructions: event.target.value })}
                          rows={2}
                          placeholder="e.g., Emphasize ROI or include competitor comparison"
                          className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-400 dark:border-white/10 dark:bg-slate-900/60 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end">
                      <button
                        type="submit"
                        disabled={isGenerating}
                        className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/50 bg-gradient-to-r from-cyan-500/90 to-blue-600/90 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/30 transition hover:translate-y-[-2px] hover:shadow-cyan-400/40 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <NotebookPen className="size-4" />
                        {isGenerating ? 'Generating...' : 'Submit'}
                      </button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200/70 bg-white/60 px-4 py-3 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
              Custom summaries are available on Pro and Power plans.
            </div>
          )}

          {/* Quick templates */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {quickTemplates.map((template) => {
              const Icon = template.icon;
              const disabled = isGenerating || (!canUsePremiumTemplates && template.key !== 'executive-brief');
              return (
                <motion.button
                  key={template.key}
                  type="button"
                  whileHover={{ y: -4, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleQuickGenerate(template)}
                  disabled={disabled}
                  className="group relative overflow-hidden rounded-xl border border-slate-200/80 bg-white/80 px-4 py-4 text-left shadow-lg backdrop-blur-xl transition disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5"
                >
                  <div className="pointer-events-none absolute inset-0 opacity-0 transition duration-200 group-hover:opacity-100">
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${template.accent} opacity-10 blur-2xl`}
                    />
                  </div>

                  <div className="flex items-start gap-3">
                    <div
                      className={`flex size-12 items-center justify-center rounded-lg bg-gradient-to-br ${template.accent} text-slate-950 shadow-lg shadow-black/20`}
                    >
                      <motion.div
                        animate={{ y: [0, -2, 0] }}
                        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        <Icon className="size-5" />
                      </motion.div>
                    </div>

                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{template.title}</p>
                        <motion.span
                          className="flex size-5 items-center justify-center rounded-full bg-white/10 text-[10px] text-white"
                          animate={{ scale: [1, 1.08, 1], opacity: [0.6, 1, 0.6] }}
                          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                        >
                          &gt;
                        </motion.span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300">{template.subtitle}</p>
                    </div>

                    <ArrowRight className="size-4 text-slate-500 transition duration-200 group-hover:translate-x-1 group-hover:text-slate-900 dark:text-slate-300 dark:group-hover:text-white" />
                  </div>

                  <div className="mt-3 text-[11px] text-slate-600 transition group-hover:text-slate-700 dark:text-slate-400 dark:group-hover:text-slate-200">
                    {template.customInstructions}
                    {!canUsePremiumTemplates && template.key !== 'executive-brief' ? ' (Upgrade for premium templates)' : ''}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SummaryConfigurator;
