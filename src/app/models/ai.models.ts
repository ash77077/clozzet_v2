export interface CustomerAiPayload {
  id: string;
  name: string;
  notes: string;
  last_contact_date: string | null;
  order_history: { date: string; amount: number }[];
  tags: string[];
  reply_language: 'Armenian' | 'English';
}

export interface CustomerAiResult {
  status: 'hot lead' | 'warm lead' | 'cold lead' | 'loyal customer' | 'new contact' | 'at risk';
  urgency: number;
  sentiment: 'positive' | 'neutral' | 'hesitant' | 'negative';
  detected_language: string;
  summary: string;
  tags: string[];
  next_action: string;
  action_type: 'call' | 'nurture' | 'close' | 'alert';
  analyzed_at: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
