import { useState } from 'react';
import { NotebookPen } from 'lucide-react';

interface SummaryGeneratorProps {
  transcript: string;
}

const SummaryGenerator = ({ transcript }: SummaryGeneratorProps) => {
  const [summary, setSummary] = useState<string>('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateSummary = async () => {
    if (!transcript) {
      setError('No transcript available');
      return;
    }

    try {
      setIsSummarizing(true);
      setError(null);
      
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: transcript }),
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
      setIsSummarizing(false);
    }
  };

  return (
    <div className="summary-section">
    <button
    onClick={handleGenerateSummary}
    disabled={isSummarizing || !transcript}
    className="summary-button mt-4 py-3 px-6 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
    >
    {isSummarizing ? (
        <>
        <span className="animate-spin">⏳</span> 
        Generating Summary...
        </>
    ) : (
        <>
        <NotebookPen className="size-5" />
        Generate Summary
        </>
    )}
    </button>
      {error && <div className="error-message">{error}</div>}
      
      {summary && (
        <div className="summary-output pt-4 text-2xl font-semibold">
          <h3 className='pb-4'>Executive Summary</h3>
          <p className="text-light-600 text-sm mb-2 whitespace-pre-wrap">{summary}</p>
        </div>
      )}
    </div>
  );
};

export default SummaryGenerator;