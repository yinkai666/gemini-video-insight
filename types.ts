export type Language = 'en' | 'zh';

export type SummaryMode = 'points' | 'outline' | 'long';

export interface IngestResponse {
  file_name: string;
  status: string;
  upload_id?: string;
  display_name?: string; // 添加原始文件名
}

export interface SummaryRequest {
  file_name: string;
  mode: SummaryMode;
  language: Language;
}

export interface QARequest {
  file_name: string;
  question: string;
  language: Language;
}

export interface IngestError {
  detail: string;
}

export enum UploadStatus {
  IDLE = 'idle',
  UPLOADING = 'uploading',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  ERROR = 'error',
}

export interface HealthResponse {
  status: string;
}

export interface AppConfig {
  apiKey: string;
  model: string;
  thinkingBudget: number; // For Gemini 2.5 series (0-32768)
  thinkingLevel: 'low' | 'high' | ''; // For Gemini 3.0 Pro ('low' or 'high')
}
