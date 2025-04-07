// app/types.ts
export type SummaryConfig = {
    template: string;
    customInstructions: string;
    formality: 'casual' | 'professional' | 'technical';
    length: 'short' | 'medium' | 'detailed';
    focusAreas: string[];
  };

  export type SubscriptionPlan = {
    id: string;
    name: string;
    upload_limit_mb: number;
    transcription_mins: number;
    summarization_limit: number | null;
    monthly_price: number;
    yearly_price: number;
    monthly_price_id: string | null;
    yearly_price_id: string | null;
    paddle_price_id: string;
  };