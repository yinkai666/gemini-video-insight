import { IngestResponse, SummaryMode, Language, AppConfig } from '../types';

// Assuming the Python backend runs on the same host or is proxied
const API_BASE = '/api';
const CONFIG_KEY = 'gemini_app_config';

// --- Config Management ---

export const getStoredConfig = (): AppConfig => {
  try {
    const stored = localStorage.getItem(CONFIG_KEY);
    // Default to gemini-2.5-flash if nothing stored
    const defaults: AppConfig = {
      apiKey: '',
      model: 'gemini-2.5-flash',
      thinkingBudget: 0,
      thinkingLevel: ''
    };
    if (!stored) return defaults;

    const parsed = JSON.parse(stored);
    return { ...defaults, ...parsed };
  } catch {
    return {
      apiKey: '',
      model: 'gemini-2.5-flash',
      thinkingBudget: 0,
      thinkingLevel: ''
    };
  }
};

export const saveConfig = (config: AppConfig) => {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
};

export const clearConfig = () => {
  localStorage.removeItem(CONFIG_KEY);
};

const getHeaders = (contentType: string | null = 'application/json') => {
  const config = getStoredConfig();
  const headers: Record<string, string> = {};

  if (contentType) {
    headers['Content-Type'] = contentType;
  }

  if (config.apiKey && config.apiKey.trim() !== '') {
    headers['x-gemini-api-key'] = config.apiKey.trim();
  }

  if (config.model && config.model.trim() !== '') {
    headers['x-gemini-model'] = config.model.trim();
  }

  // For Gemini 2.5 series: use thinking_budget
  if (config.thinkingBudget !== undefined) {
    headers['x-gemini-thinking-budget'] = config.thinkingBudget.toString();
  }

  // For Gemini 3.0 Pro: use thinking_level
  if (config.thinkingLevel && config.thinkingLevel.trim() !== '') {
    headers['x-gemini-thinking-level'] = config.thinkingLevel.trim();
  }

  return headers;
};

// --- API Calls ---

export const checkHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE}/health`);
    return response.ok;
  } catch (error) {
    return false;
  }
};

export interface UploadedFile {
  name: string;
  display_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  state: string | null;
  create_time: string | null;
  expiration_time: string | null;
}

export const listFiles = async (): Promise<UploadedFile[]> => {
  const response = await fetch(`${API_BASE}/files`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to list files');
  }

  const data = await response.json();
  return data.files || [];
};

export const deleteFile = async (fileName: string): Promise<void> => {
  const response = await fetch(`${API_BASE}/files/${encodeURIComponent(fileName)}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to delete file');
  }
};

export const renameFile = async (fileName: string, newDisplayName: string): Promise<{status: string, name: string, display_name: string}> => {
  const response = await fetch(`${API_BASE}/files/${encodeURIComponent(fileName)}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ display_name: newDisplayName }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to rename file' }));
    throw new Error(error.detail || 'Failed to rename file');
  }

  return response.json();
};

export interface UploadProgressInfo {
  progress: number;
  loaded: number;
  total: number;
  speed: number; // bytes per second
  message: string;
}

export const ingestFile = async (
  file: File,
  onProgress?: (info: UploadProgressInfo) => void
): Promise<IngestResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  const headers = getHeaders(null);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Track real-time upload speed (使用微分计算瞬时速度)
    let lastLoaded = 0;
    let lastTime = Date.now();
    let currentSpeed = 0; // 当前瞬时速度
    const smoothingFactor = 0.3; // EMA平滑因子 (0-1, 值越大对新速度反应越快)

    // Track upload progress (0-50%)
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const now = Date.now();
        const timeDiff = (now - lastTime) / 1000; // 时间差(秒)
        const loadedDiff = event.loaded - lastLoaded; // 字节差

        // 只在时间间隔足够时才更新速度 (避免除以接近0的数)
        if (timeDiff >= 0.1) { // 至少100ms间隔
          // 计算当前时间段的瞬时速度 (微分: Δbytes / Δtime)
          const instantSpeed = loadedDiff / timeDiff;

          // 使用指数移动平均(EMA)平滑速度，类似迅雷
          // EMA = α * 新值 + (1-α) * 旧值
          if (currentSpeed === 0) {
            // 首次计算直接使用瞬时速度
            currentSpeed = instantSpeed;
          } else {
            // 后续使用EMA平滑
            currentSpeed = smoothingFactor * instantSpeed + (1 - smoothingFactor) * currentSpeed;
          }

          lastLoaded = event.loaded;
          lastTime = now;
        }

        const percentComplete = Math.round((event.loaded / event.total) * 50);
        const loadedMB = event.loaded / (1024 * 1024);
        const totalMB = event.total / (1024 * 1024);
        const speedMBps = currentSpeed / (1024 * 1024);

        let message = `Uploading: ${loadedMB.toFixed(1)}MB / ${totalMB.toFixed(1)}MB`;

        if (currentSpeed > 0 && event.loaded < event.total) {
          message += ` (${speedMBps.toFixed(2)} MB/s)`;

          // 计算预计剩余时间 (ETA)
          const remaining = event.total - event.loaded;
          const eta = remaining / currentSpeed;

          if (eta < 60) {
            message += ` - ${Math.ceil(eta)}s remaining`;
          } else if (eta < 3600) {
            message += ` - ${Math.ceil(eta / 60)}m remaining`;
          } else {
            message += ` - ${Math.floor(eta / 3600)}h ${Math.ceil((eta % 3600) / 60)}m remaining`;
          }
        }

        onProgress({
          progress: percentComplete,
          loaded: event.loaded,
          total: event.total,
          speed: currentSpeed,
          message
        });
      }
    };

    xhr.onload = async () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const result: IngestResponse = JSON.parse(xhr.responseText);

          // Final progress update
          if (onProgress && file.size) {
            onProgress({
              progress: 100,
              loaded: file.size,
              total: file.size,
              speed: 0,
              message: 'Upload complete!'
            });
          }

          resolve(result);
        } catch (e) {
          reject(new Error('Failed to parse response'));
        }
      } else {
        try {
          const err = JSON.parse(xhr.responseText);
          reject(new Error(err.detail || 'Upload failed'));
        } catch {
          reject(new Error('Upload failed'));
        }
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network error'));
    };

    // Show initial progress
    if (onProgress && file.size) {
      onProgress({
        progress: 0,
        loaded: 0,
        total: file.size,
        speed: 0,
        message: 'Starting upload...'
      });
    }

    xhr.open('POST', `${API_BASE}/ingest`);

    // Set headers
    Object.entries(headers).forEach(([key, value]) => {
      xhr.setRequestHeader(key, value);
    });

    xhr.send(formData);
  });
};

export const ingestUrl = async (
  url: string,
  onProgress?: (info: UploadProgressInfo) => void
): Promise<IngestResponse> => {
  // Show initial progress
  if (onProgress) {
    onProgress({
      progress: 5,
      loaded: 0,
      total: 0,
      speed: 0,
      message: 'Initiating URL download...'
    });
  }

  // Send the request to start URL ingestion (will return immediately)
  const response = await fetch(`${API_BASE}/ingest`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'URL ingestion failed' }));
    throw new Error(err.detail || 'Network response was not ok');
  }

  const result: IngestResponse = await response.json();

  // Poll progress if upload_id is available
  if (result.upload_id && onProgress) {
    let lastProgress = 5;
    const maxAttempts = 360; // 12 minutes (360 * 2 seconds)
    let attempts = 0;

    while (attempts < maxAttempts) {
      let progressData: any = null;
      try {
        const progressResponse = await fetch(`${API_BASE}/progress/${result.upload_id}`);
        if (progressResponse.ok) {
          progressData = await progressResponse.json();

          // Update progress if changed
          if (progressData.progress > lastProgress) {
            lastProgress = progressData.progress;
            onProgress({
              progress: progressData.progress,
              loaded: progressData.loaded || 0,
              total: progressData.total || 0,
              speed: progressData.speed || 0,
              message: progressData.message || 'Processing...'
            });
          }

          // Check if complete
          if (progressData.progress >= 100 || progressData.stage === 'complete') {
            // Get final file info from progress data
            if (progressData.file_name) {
              result.file_name = progressData.file_name;
            }
            if (progressData.display_name) {
              result.display_name = progressData.display_name;
            }
            break;
          }

          // Check if error
          if (progressData.stage === 'error') {
            throw new Error(progressData.message || 'Upload failed');
          }
        }
      } catch (err) {
        // If it's an error from error stage, rethrow it
        if (progressData?.stage === 'error' || (err instanceof Error && err.message !== 'Failed to fetch')) {
          throw err;
        }
        // Otherwise just log and continue polling
        console.warn('Progress polling error:', err);
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, 2000)); // Poll every 2 seconds
      attempts++;
    }

    if (attempts >= maxAttempts) {
      throw new Error('Upload timeout - video processing took too long');
    }
  }

  // Final progress update
  if (onProgress) {
    onProgress({
      progress: 100,
      loaded: 0,
      total: 0,
      speed: 0,
      message: 'Video processed successfully!'
    });
  }

  return result;
};

export const fetchSummary = async (
  fileName: string,
  mode: SummaryMode,
  language: Language
): Promise<string> => {
  // Try to get custom prompts from localStorage
  let customPrompt: string | undefined;
  try {
    const savedPrompts = localStorage.getItem('customPrompts');
    if (savedPrompts) {
      const prompts = JSON.parse(savedPrompts);
      customPrompt = prompts[language]?.[mode];
    }
  } catch (e) {
    console.error('Failed to load custom prompts:', e);
  }

  const body: any = { file_name: fileName, mode, language };
  if (customPrompt) {
    body.custom_prompt = customPrompt;
  }

  const response = await fetch(`${API_BASE}/summarize`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch summary');
  }

  const text = await response.text();
  try {
    const json = JSON.parse(text);
    return json.text || json.response || json; // Heuristic fallback
  } catch {
    return text;
  }
};

export interface QAHistoryItem {
  role: 'user' | 'model';
  text: string;
}

export const fetchQA = async (
  fileName: string,
  question: string,
  language: Language,
  history?: QAHistoryItem[]
): Promise<string> => {
  const response = await fetch(`${API_BASE}/qa`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      file_name: fileName,
      question,
      language,
      history: history || []
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch answer');
  }

  const text = await response.text();
  try {
    const json = JSON.parse(text);
    return json.text || json.answer || json;
  } catch {
    return text;
  }
};
