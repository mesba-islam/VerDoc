'use client';

import { useEffect, useMemo, useState } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase/client';
import { motion } from 'framer-motion';
import { generateSummaryPDF } from '@/app/generatePdf';

interface Summary {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

type PlanInfo = {
  name: string;
  archive_access?: boolean | null;
  premium_templates?: boolean | null;
  doc_export_limit?: number | null;
};

export default function ArchivePage() {
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<PlanInfo | null>(null);
  const supabase = useMemo(() => createSupabaseBrowser(), []);

  useEffect(() => {
    const fetchSummaries = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          window.location.href = '/login';
          return;
        }

        const planRes = await fetch('/api/user/plan', { credentials: 'include' });
        if (planRes.status === 401) {
          window.location.href = '/login';
          return;
        }
        if (planRes.ok) {
          const planData = await planRes.json();
          setPlan(planData?.plan ?? null);
          if (!planData?.plan?.archive_access) {
            setSummaries([]);
            return;
          }
        }

        const response = await fetch('/api/summaries');
        if (!response.ok) throw new Error('Failed to fetch');

        const data = await response.json();
        setSummaries(data);
      } catch (error) {
        console.error('Fetch error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSummaries();
  }, [supabase]);

  const handleDownload = async (content: string, title: string, summaryId?: string) => {
    try {
      const res = await fetch('/api/exports/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: 1, summaryId }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(payload?.error || 'Export limit reached. Upgrade to continue.');
        return;
      }
    } catch {
      alert('Unable to record export. Please try again.');
      return;
    }

    const date = new Date().toLocaleDateString();
    generateSummaryPDF(title, content, date);
  };

  if (loading) return <div className="text-center p-8">Loading summaries...</div>;

  if (plan && !plan.archive_access) {
    return (
      <div className="max-w-xl mx-auto p-6 text-center space-y-4">
        <h1 className="text-2xl font-bold">Archive requires Pro or Power</h1>
        <p className="text-muted-foreground">
          Upgrade to unlock saved summaries and unlimited document downloads.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-8 text-secondary-800">Archive</h1>

      <div className="space-y-4">
        {summaries.map((summary, index) => {
          const cleanTitle = (summary.title || '')
            .replace(/\*\*/g, '')
            .replace(/#/g, '')
            .replace(/\*/g, '')
            .trim() || 'Untitled Summary';

          return (
            <motion.div
              key={summary.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-secondary rounded-lg shadow-sm p-6 border border-cyan-200 hover:border-cyan-500 transition-colors duration-300"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-semibold mb-2 text-secondary-800">{cleanTitle}</h2>
                  <p className="text-sm text-gray-500 mb-4">
                    Created: {new Date(summary.created_at).toLocaleDateString()}
                  </p>
                </div>

                <div className="group relative">
                  <button
                    className={`p-2 rounded-lg transition-colors group-hover:text-cyan-500 transition-colors duration-300${
                      summary ? 'hover:bg-accent text-foreground/80 hover:text-foreground' : 'text-gray-400 cursor-not-allowed'
                    }`}
                    onClick={() => handleDownload(summary.content, summary.title, summary.id)}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-5 h-5"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                  </button>
                  <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-gray-100 text-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                    {summary ? 'Download PDF' : 'Generate summary first'}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {summaries.length === 0 && (
        <div className="text-center py-12 text-gray-500">No summaries found in your archive</div>
      )}
    </div>
  );
}
