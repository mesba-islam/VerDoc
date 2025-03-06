// app/types.ts
export type SummaryConfig = {
    template: string;
    customInstructions: string;
    formality: 'casual' | 'professional' | 'technical';
    length: 'short' | 'medium' | 'detailed';
    focusAreas: string[];
  };