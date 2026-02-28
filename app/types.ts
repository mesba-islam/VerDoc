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
    billing_interval: 'month' | 'year' | null;
    price: number;
    video_to_audio_unlimited: boolean;
    doc_export_limit?: number | null;
    premium_templates?: boolean | null;
    archive_access?: boolean | null;
  };

  declare module '@paddle/paddle-js' {
    export interface CheckoutOptions {
      passthrough?: string;
    }
  }
