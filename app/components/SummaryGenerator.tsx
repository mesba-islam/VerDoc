import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SummaryConfigurator from './SummaryConfigurator';
import type { SummaryConfig } from '@/app/types';

interface SummaryGeneratorProps {
  transcript: string;
  onSummaryGenerated?: () => void;
  // setSummary: (summary: string) => void;
}

const SummaryGenerator = ({ transcript, onSummaryGenerated  }: SummaryGeneratorProps) => {
  const [summary, setSummary] = useState<string>('');
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
      onSummaryGenerated?.();
    } catch (err) {
      const error = err as Error;
      console.error('Summary generation error:', error);
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
            className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700"
          >
            {/* <h3 className="text-xl font-semibold mb-4 pb-2 border-b border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100">
              Executive Summary
            </h3> */}
            <div className="prose dark:prose-invert max-w-none">
              {summary.split('\n').map((line, index) => (
                <motion.p
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="text-gray-700 dark:text-gray-300"
                >
                  {line}
                </motion.p>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SummaryGenerator;