import { useState } from 'react';
import { NotebookPen } from 'lucide-react';
import type { SummaryConfig } from '@/app/types';

interface SummaryConfiguratorProps {
  onGenerate: (config: SummaryConfig) => void;
  isGenerating: boolean;
}

interface SummaryConfiguratorProps {
    onGenerate: (config: SummaryConfig) => void;
    isGenerating: boolean;
  }
  
  export const defaultConfig: SummaryConfig = {
    template: 'general',
    customInstructions: '',
    formality: 'professional',
    length: 'medium',
    focusAreas: [],
  };
  
  const SummaryConfigurator = ({ onGenerate, isGenerating }: SummaryConfiguratorProps) => {
    const [config, setConfig] = useState<SummaryConfig>(defaultConfig);
    const [customFocus, setCustomFocus] = useState('');

  const templates = [
    { value: 'general', label: 'General Executive Summary' },
    { value: 'startup', label: 'Startup Pitch Summary' },
    { value: 'technical', label: 'Technical Report Summary' },
    { value: 'financial', label: 'Financial Analysis Summary' },
  ];

  const focusOptions = [
    'Key Metrics',
    'Risk Analysis',
    'Cost Breakdown',
    'Timeline',
    'Competitive Analysis',
    'SWOT',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate(config);
  };

  return (
    <form onSubmit={handleSubmit} className="configurator bg-gray-900 p-6 rounded-xl border border-gray-800">
      <div className="space-y-8">
        {/* Template Selection */}
        <div className="group">
          <label className="block text-sm font-medium mb-3 text-gray-200">Template</label>
          <div className="relative">
            <select
              value={config.template}
              onChange={(e) => setConfig({ ...config, template: e.target.value })}
              className="w-full bg-gray-800 text-gray-100 px-1 py-3 border-0 border-b-2  focus:border-cyan-500 focus:ring-0 transition-colors appearance-none hover:border-gray-600"
            >
              {templates.map((tpl) => (
                <option key={tpl.value} value={tpl.value} className="bg-gray-800 text-gray-100">
                  {tpl.label}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
  
        {/* Custom Instructions */}
        <div className="group">
          <label className="block text-sm font-medium mb-3 text-gray-200">
            Custom Instructions
            <span className="text-gray-500 text-sm ml-2">(optional)</span>
          </label>
          <textarea
            value={config.customInstructions}
            onChange={(e) => setConfig({ ...config, customInstructions: e.target.value })}
            placeholder="e.g., 'Emphasize ROI projections', 'Include competitor comparison'"
            className="w-full bg-gray-800 text-gray-100 px-1 py-2 border-0 border-b-2  focus:border-cyan-500 focus:ring-0 transition-colors hover:border-gray-600 resize-none"
            rows={3}
          />
        </div>
  
        {/* Configuration Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Formality Level */}
          <div className="group">
            <label className="block text-sm font-medium mb-3 text-gray-200">Tone</label>
            <div className="relative">
              <select
                value={config.formality}
                onChange={(e) => setConfig({ 
                  ...config, 
                  formality: e.target.value as 'casual' | 'professional' | 'technical' 
                })}
                className="w-full bg-gray-800 text-gray-100 px-1 py-3 border-0 border-b-2  focus:border-cyan-500 focus:ring-0 transition-colors appearance-none hover:border-gray-600"
              >
                <option value="casual" className="bg-gray-800 text-gray-100">Casual</option>
                <option value="professional" className="bg-gray-800 text-gray-100">Professional</option>
                <option value="technical" className="bg-gray-800 text-gray-100">Technical</option>
              </select>
            </div>
          </div>
  
          {/* Summary Length */}
          <div className="group">
            <label className="block text-sm font-medium mb-3 text-gray-200">Length</label>
            <div className="relative">
              <select
                value={config.length}
                onChange={(e) => setConfig({ 
                  ...config, 
                  length: e.target.value as 'short' | 'medium' | 'detailed' 
                })}
                className="w-full bg-gray-800 text-gray-100 px-1 py-3 border-0 border-b-2  focus:border-cyan-500 focus:ring-0 transition-colors appearance-none hover:border-gray-600"
              >
                <option value="short" className="bg-gray-800 text-gray-100">Short (3-5 bullet points)</option>
                <option value="medium" className="bg-gray-800 text-gray-100">Medium (1 paragraph)</option>
                <option value="detailed" className="bg-gray-800 text-gray-100">Detailed (structured sections)</option>
              </select>
            </div>
          </div>
        </div>
  
        {/* Focus Areas */}
        <div className="group">
          <label className="block text-sm font-medium mb-3 text-gray-200">
            Key Focus Areas
            <span className="text-gray-500 text-sm ml-2">(select multiple)</span>
          </label>
          <div className="flex flex-wrap gap-2 mb-3">
            {focusOptions.map((option) => (
              <button
                type="button"
                key={option}
                onClick={() => {
                  const newFocus = config.focusAreas.includes(option)
                    ? config.focusAreas.filter((f) => f !== option)
                    : [...config.focusAreas, option];
                  setConfig({ ...config, focusAreas: newFocus });
                }}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  config.focusAreas.includes(option)
                    ? 'bg-cyan-600 text-white border border-cyan-400'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-600'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={customFocus}
              onChange={(e) => setCustomFocus(e.target.value)}
              placeholder="Add custom focus area"
              className="flex-1 bg-gray-800 text-gray-100 px-1 py-2 border-0 border-b-2 border-gray-700 focus:border-cyan-500 focus:ring-0 transition-colors hover:border-gray-600"
            />
            <button
              type="button"
              onClick={() => {
                if (customFocus.trim()) {
                  setConfig({
                    ...config,
                    focusAreas: [...config.focusAreas, customFocus.trim()],
                  });
                  setCustomFocus('');
                }
              }}
              className="px-4 py-2 bg-gray-800 text-cyan-400 rounded-lg hover:bg-gray-700 transition-colors border border-gray-700"
            >
              Add
            </button>
          </div>
        </div>
  
        {/* Generate Button */}
        <button
          type="submit"
          disabled={isGenerating}
          className="w-full py-4 px-8 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-lg hover:shadow-cyan-500/20"
        >
          {isGenerating ? (
            <>
              <span className="animate-spin">⏳</span>
              Generating...
            </>
          ) : (
            <>
              <NotebookPen className="size-6" />
              Generate Custom Summary
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default SummaryConfigurator;