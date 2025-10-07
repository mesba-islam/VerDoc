'use client';

import { useEffect, useMemo, useState } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase/client';
import { motion } from 'framer-motion';
import { jsPDF } from 'jspdf';

interface Summary {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

export default function ArchivePage() {
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [loading, setLoading] = useState(true);
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

  const handleDownload = (content: string, title: string) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    const processedContent = content
      .split('\n')
      .slice(2)
      .join('\n')
      .replace(/\*\*/g, '')
      .trim();

    const cleanTitle = title.replace(/\*\*/g, '');
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(cleanTitle, pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const date = new Date().toLocaleDateString();
    doc.text(`Generated on: ${date}`, pageWidth - 15, 30, { align: 'right' });

    doc.setFontSize(12);
    const margin = 20;
    const lineHeight = 8;
    let yPosition = 40;
    doc.setTextColor(0);

    processedContent.split('\n').forEach((line) => {
      const lines = doc.splitTextToSize(line, pageWidth - margin * 2);
      lines.forEach((textLine: string) => {
        if (yPosition > doc.internal.pageSize.getHeight() - 20) {
          doc.addPage();
          yPosition = 20;
        }
        doc.text(textLine, margin, yPosition);
        yPosition += lineHeight;
      });
      yPosition += lineHeight * 0.5;
    });

    doc.save(`${cleanTitle.substring(0, 50)}.pdf`);
  };

  if (loading) return <div className="text-center p-8">Loading summaries...</div>;

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
                    onClick={() => handleDownload(summary.content, summary.title)}
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
