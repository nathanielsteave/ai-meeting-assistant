export interface TranscriptEntry {
  timestamp: number;
  speaker: string;
  text: string;
  sentiment: SentimentData;
}

export interface SentimentData {
  overall: 'positive' | 'negative' | 'neutral';
  confidence: number;
  emotions: {
    joy?: number;
    anger?: number;
    fear?: number;
    sadness?: number;
    surprise?: number;
    neutral?: number;
    disgust?: number;
  };
  meeting_tone: string;
  urgency_detected: boolean;
  agreement_level: 'agreement' | 'disagreement' | 'neutral';
}

export interface ActionItem {
  id?: number;
  task: string;
  assignee: string;
  deadline?: string;
  priority: 'high' | 'medium' | 'low';
  status?: 'pending' | 'completed';
}

export interface MeetingSummary {
  executive_summary: string;
  detailed_summary: string[];
  decisions_made: string[];
  action_items_summary: string[];
  sentiment_overview: string;
  next_steps: string[];
  participants_engagement: string;
}

export interface WebSocketMessage {
  type: 'transcript' | 'insights' | 'summary' | 'error' | 'pong';
  data?: any;
  message?: string;
}