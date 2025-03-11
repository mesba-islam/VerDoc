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
    // const [customFocus, setCustomFocus] = useState('');

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
    <form onSubmit={handleSubmit} className="configurator bg-card p-6 rounded-xl border border-border shadow-md">
      <div className="space-y-8">
        
        {/* Template Selection */}
        <div className="group">
          <label className="block text-sm font-medium mb-3 text-foreground">Template</label>
          <div className="relative">
            <select
              value={config.template}
              onChange={(e) => setConfig({ ...config, template: e.target.value })}
              className="w-full bg-secondary text-foreground px-3 py-3 border border-border rounded-lg focus:border-primary focus:ring-0 transition-all hover:border-border/80"
            >
              {templates.map((tpl) => (
                <option key={tpl.value} value={tpl.value} className="bg-card text-foreground">
                  {tpl.label}
                </option>
              ))}
            </select>
          </div>
        </div>
  
        {/* Custom Instructions */}
        <div className="group">
          <label className="block text-sm font-medium mb-3 text-foreground">
            Custom Instructions
            <span className="text-muted-foreground text-sm ml-2">(optional)</span>
          </label>
          <textarea
            value={config.customInstructions}
            onChange={(e) => setConfig({ ...config, customInstructions: e.target.value })}
            placeholder="e.g., 'Emphasize ROI projections', 'Include competitor comparison'"
            className="w-full bg-secondary text-foreground px-3 py-2 border border-border rounded-lg focus:border-primary focus:ring-0 transition-all hover:border-border/80 resize-none"
            rows={3}
          />
        </div>
  
        {/* Configuration Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Formality Level */}
          <div className="group">
            <label className="block text-sm font-medium mb-3 text-foreground">Tone</label>
            <select
              value={config.formality}
              onChange={(e) => setConfig({ 
                ...config, 
                formality: e.target.value as 'casual' | 'professional' | 'technical' 
              })}
              className="w-full bg-secondary text-foreground px-3 py-3 border border-border rounded-lg focus:border-primary focus:ring-0 transition-all hover:border-border/80"
            >
              <option value="casual">Casual</option>
              <option value="professional">Professional</option>
              <option value="technical">Technical</option>
            </select>
          </div>
  
          {/* Summary Length */}
          <div className="group">
            <label className="block text-sm font-medium mb-3 text-foreground">Length</label>
            <select
              value={config.length}
              onChange={(e) => setConfig({ 
                ...config, 
                length: e.target.value as 'short' | 'medium' | 'detailed' 
              })}
              className="w-full bg-secondary text-foreground px-3 py-3 border border-border rounded-lg focus:border-primary focus:ring-0 transition-all hover:border-border/80"
            >
              <option value="short">Short (3-5 bullet points)</option>
              <option value="medium">Medium (1 paragraph)</option>
              <option value="detailed">Detailed (structured sections)</option>
            </select>
          </div>
        </div>
  
        {/* Focus Areas */}
        <div className="group">
          <label className="block text-sm font-medium mb-3 text-foreground">
            Key Focus Areas
            <span className="text-muted-foreground text-sm ml-2">(select multiple)</span>
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
                className={`px-3 py-1 rounded-full text-sm transition-all border 
                  ${
                    config.focusAreas.includes(option)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-secondary text-foreground hover:bg-secondary/80 border-border'
                  }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
  
        {/* Generate Button */}
        <div className="relative group w-fit mx-auto">
          <button
            type="submit"
            disabled={isGenerating}
            className="w-full py-4 px-8 relative rounded-xl font-medium 
                      border-2 border-cyan-500/30 hover:border-cyan-400
                      bg-transparent text-cyan-500 hover:text-white
                      transition-all duration-300 disabled:opacity-50 
                      disabled:hover:text-cyan-500 flex items-center justify-center gap-3
                      overflow-hidden"
          >
            {/* Hover fill background - fixed positioning */}
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-700 via-cyan-800 to-gray-900 
                            opacity-0 group-hover:opacity-100 transition-all duration-300 
                            scale-x-0 group-hover:scale-x-100 origin-left transform-gpu" />

            {/* Border glow effect */}
            <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-30 
                          bg-gradient-to-r from-cyan-400/50 to-cyan-600/50 transition-all 
                          duration-500 blur-[1px] group-hover:blur-[2px]" />

            {/* Content container */}
            <div className="relative z-20 flex items-center gap-2">
              {isGenerating ? (
                <>
                  <span className="animate-spin">⏳</span>
                  <span className="bg-gradient-to-r from-cyan-400 to-cyan-300 bg-clip-text 
                                  text-transparent group-hover:text-white transition-all">
                    Generating...
                  </span>
                </>
              ) : (
                <>
                  <NotebookPen className="size-4 text-cyan-400 group-hover:text-white transition-colors" />
                  <span className="bg-gradient-to-r from-cyan-400 to-cyan-300 bg-clip-text 
                                  text-transparent group-hover:text-white transition-all">
                    VerDoc.it
                  </span>
                </>
              )}
            </div>

            {/* Disabled state overlay */}
            {isGenerating && (
              <div className="absolute inset-0 bg-gray-900/30 rounded-xl" />
            )}
          </button>
        </div>
      </div>
    </form>
  );
  
};

export default SummaryConfigurator;