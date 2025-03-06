import { useState } from 'react';
// import { NotebookPen } from 'lucide-react';
import SummaryConfigurator from './SummaryConfigurator';
import type { SummaryConfig } from '@/app/types';

interface SummaryGeneratorProps {
  transcript: string;

}

const SummaryGenerator = ({ transcript }: SummaryGeneratorProps) => {
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

      // Updated error handling in handleGenerateSummary
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
    } catch (err) {
      const error = err as Error;
      console.error('Summary generation error:', error);
      setError(error.message || 'Failed to generate summary');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="summary-section space-y-4 pt-6">
      <SummaryConfigurator 
        onGenerate={handleGenerate}
        isGenerating={isGenerating}
      />
      
      {error && (
        <div className="error-message p-3 bg-red-50 text-red-700 rounded-lg">
          {error}
        </div>
      )}
      
      {summary && (
        <div className="summary-output bg-dark p-4 rounded-lg shadow">
          <h3 className="text-xl font-semibold mb-3 border-b pb-2">
            Executive Summary
          </h3>
          <div className="prose max-w-none text-gray-500 whitespace-pre-wrap">
            {summary}
          </div>
        </div>
      )}
    </div>
  );
};

export default SummaryGenerator;