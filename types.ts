
export type AppMode = 'balanced' | 'thinking' | 'fast' | 'live';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: GroundingSource[];
  isRoast?: boolean;
  image?: string; // base64
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface ChatHistory {
  role: 'user' | 'model';
  parts: { text?: string; inlineData?: { mimeType: string; data: string } }[];
}
