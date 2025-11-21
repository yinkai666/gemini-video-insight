"""
Gemini Video Insight - Backend API Server
A FastAPI server that provides video analysis using Google Gemini API
"""

import os
import tempfile
import time
import asyncio
import logging
from collections import deque
from typing import Optional, Dict
from pathlib import Path
import uuid
from datetime import datetime

from fastapi import FastAPI, File, UploadFile, HTTPException, Header, Request, Response, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, HTMLResponse
from pydantic import BaseModel
from google import genai
from google.genai import types
from dotenv import load_dotenv
import httpx
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request as StarletteRequest

# Load environment variables
load_dotenv()

app = FastAPI(title="Gemini Video Insight API", version="1.0.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request logging middleware
class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: StarletteRequest, call_next):
        # Skip logging for certain endpoints to reduce noise
        skip_paths = ["/api/health", "/api/logs", "/api/progress"]

        if not any(request.url.path.startswith(path) for path in skip_paths):
            logger.info(f"📨 {request.method} {request.url.path}")

        try:
            response = await call_next(request)

            # Log response status for non-skipped endpoints
            if not any(request.url.path.startswith(path) for path in skip_paths):
                status_emoji = "✅" if response.status_code < 400 else "⚠️" if response.status_code < 500 else "❌"
                logger.info(f"{status_emoji} {request.method} {request.url.path} → {response.status_code}")

            return response
        except Exception as e:
            logger.error(f"❌ {request.method} {request.url.path} → Error: {str(e)}")
            raise

app.add_middleware(RequestLoggingMiddleware)

# Storage for uploaded files (file_name -> file object)
uploaded_files_cache = {}

# Progress tracking
progress_store: Dict[str, dict] = {}

# Log storage (keep last 100 logs)
log_store = deque(maxlen=200)

# Custom logging handler to capture logs
class LogHandler(logging.Handler):
    def emit(self, record):
        log_entry = {
            'timestamp': datetime.fromtimestamp(record.created).strftime('%Y-%m-%d %H:%M:%S'),
            'level': record.levelname,
            'message': self.format(record)
        }
        log_store.append(log_entry)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("uvicorn.error")
log_handler = LogHandler()
log_handler.setFormatter(logging.Formatter('%(message)s'))
logger.addHandler(log_handler)

# Add startup event
@app.on_event("startup")
async def startup_event():
    logger.info("🎬 Gemini Video Insight API started successfully")
    logger.info("📍 Backend server running on http://localhost:8000")
    logger.info("📚 API documentation: http://localhost:8000/docs")
    logger.info("📊 Status dashboard: http://localhost:8000/status")

# --- Request/Response Models ---

class IngestUrlRequest(BaseModel):
    url: str

class IngestResponse(BaseModel):
    file_name: str
    status: str
    upload_id: Optional[str] = None
    display_name: Optional[str] = None  # 添加原始文件名

class SummarizeRequest(BaseModel):
    file_name: str
    mode: str  # 'points', 'outline', 'long'
    language: str  # 'en', 'zh'
    custom_prompt: Optional[str] = None  # Custom prompt to override default

class QARequest(BaseModel):
    file_name: str
    question: str
    language: str
    history: Optional[list] = None  # 对话历史: [{"role": "user", "text": "..."}, {"role": "model", "text": "..."}]

# --- Helper Functions ---

def get_api_key(x_gemini_api_key: Optional[str] = None) -> str:
    """Get API key from header or environment variable"""
    api_key = x_gemini_api_key or os.getenv("GEMINI_API_KEY")
    if not api_key or api_key == "PLACEHOLDER_API_KEY":
        raise HTTPException(
            status_code=400,
            detail="API key not configured. Please set GEMINI_API_KEY in .env or provide it in the x-gemini-api-key header."
        )
    return api_key

def get_model_name(x_gemini_model: Optional[str] = None) -> str:
    """Get model name from header or use default"""
    return x_gemini_model or "gemini-2.5-flash"

def get_thinking_budget(x_gemini_thinking_budget: Optional[str] = None) -> int:
    """Get thinking budget from header (for Gemini 2.5)"""
    try:
        return int(x_gemini_thinking_budget) if x_gemini_thinking_budget else 0
    except ValueError:
        return 0

def get_thinking_level(x_gemini_thinking_level: Optional[str] = None) -> str:
    """Get thinking level from header (for Gemini 3.0 Pro)"""
    if x_gemini_thinking_level and x_gemini_thinking_level.lower() in ['low', 'high']:
        return x_gemini_thinking_level.lower()
    return ""

def get_client(api_key: str) -> genai.Client:
    """Create a Gemini API client"""
    return genai.Client(api_key=api_key)

def get_summary_prompt(mode: str, language: str) -> str:
    """Generate summary prompt based on mode and language"""
    prompts = {
        'en': {
            'points': """Please analyze this video in English and provide a concise summary in bullet-point format.

Structure your response as follows:
1. Core theme (one-sentence overview)
2. Key points (5-7 clear bullet points)
3. Important data or quotes (if applicable)
4. Main conclusions

Please respond in English.""",
            'outline': """Please provide a detailed chapter-by-chapter breakdown of this video in English.

Include the following:
1. Timestamp for each chapter
2. Chapter titles
3. Detailed description of each chapter
4. Hierarchical structure showing content flow

Please respond in English.""",
            'long': """Please provide a comprehensive in-depth analysis of this video in English.

Organize your response in four sections:

**I. Overview**
- Video topic and background
- Target audience and content positioning

**II. Detailed Content**
- Section-by-section in-depth analysis
- Key arguments and evidence
- Important data, examples, or quotes

**III. Deep Analysis**
- Core insights and innovations
- Value and significance of the content
- Strengths and limitations

**IV. Summary**
- Key takeaways and insights
- Practical application recommendations

Please respond in English."""
        },
        'zh': {
            'points': """请用中文分析这个视频，并以要点列表的形式提供简明摘要。

请按以下结构组织：
1. 核心主题（一句话概括）
2. 主要要点（5-7个清晰的bullet points）
3. 关键数据或引用（如适用）
4. 核心结论

请用中文回答。""",
            'outline': """请用中文为这个视频提供详细的章节分解。

请包含以下内容：
1. 每个章节的时间戳
2. 章节标题
3. 每个章节的详细描述
4. 层级化的结构展示内容流程

请用中文回答。""",
            'long': """请用中文对这个视频进行全面深入的分析。

请按以下四部分结构组织：

**一、概述**
- 视频主题和背景
- 目标受众和内容定位

**二、详细内容**
- 逐段/逐章节的深入分析
- 关键论点和论据
- 重要数据、案例或引用

**三、深度分析**
- 核心观点和创新点
- 内容的价值和意义
- 优势与局限性

**四、总结**
- 主要收获和启示
- 实际应用建议

请用中文回答。"""
        }
    }
    return prompts.get(language, prompts['en']).get(mode, prompts['en']['points'])

def format_question(question: str, language: str) -> str:
    """Format the question with language context"""
    if language == 'zh':
        return f"关于这个视频:{question}\n\n请用中文回答。"
    else:
        return f"About this video: {question}\n\nPlease answer in English."

def update_progress(upload_id: str, stage: str, progress: int, message: str = "", loaded: int = 0, total: int = 0, speed: float = 0):
    """Update progress for an upload"""
    progress_store[upload_id] = {
        'stage': stage,
        'progress': progress,
        'message': message,
        'loaded': loaded,
        'total': total,
        'speed': speed,
        'timestamp': time.time()
    }

# --- API Endpoints ---

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "message": "Server is running"}

@app.get("/api/logs")
async def get_logs():
    """Get recent logs"""
    return {"logs": list(log_store)}

@app.get("/status", response_class=HTMLResponse)
async def status_page():
    """Service status management page"""
    html_content = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gemini Video Insight - Service Status</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 40px 20px;
        }
        .container {
            max-width: 900px;
            margin: 0 auto;
        }
        .header {
            background: rgba(255, 255, 255, 0.95);
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            margin-bottom: 30px;
            text-align: center;
        }
        .header h1 {
            font-size: 2.5em;
            color: #2d3748;
            margin-bottom: 10px;
        }
        .header p {
            color: #718096;
            font-size: 1.1em;
        }
        .status-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .status-card {
            background: rgba(255, 255, 255, 0.95);
            border-radius: 15px;
            padding: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            text-align: center;
            transition: transform 0.3s;
        }
        .status-card:hover {
            transform: translateY(-5px);
        }
        .status-icon {
            font-size: 3em;
            margin-bottom: 15px;
        }
        .status-card h2 {
            font-size: 1.3em;
            color: #2d3748;
            margin-bottom: 10px;
        }
        .status-card p {
            color: #718096;
            margin: 5px 0;
        }
        .status-online {
            color: #48bb78;
        }
        .links-card {
            background: rgba(255, 255, 255, 0.95);
            border-radius: 15px;
            padding: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        .links-card h2 {
            font-size: 1.5em;
            color: #2d3748;
            margin-bottom: 20px;
        }
        .link-list {
            display: flex;
            flex-direction: column;
            gap: 15px;
        }
        .link-item {
            display: flex;
            align-items: center;
            padding: 15px 20px;
            background: #f7fafc;
            border-radius: 10px;
            text-decoration: none;
            color: #2d3748;
            transition: all 0.3s;
            border: 2px solid transparent;
        }
        .link-item:hover {
            background: #edf2f7;
            border-color: #667eea;
            transform: translateX(5px);
        }
        .link-icon {
            font-size: 1.5em;
            margin-right: 15px;
        }
        .link-text {
            flex: 1;
        }
        .link-text strong {
            display: block;
            margin-bottom: 3px;
        }
        .link-text small {
            color: #718096;
        }
        .badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.85em;
            font-weight: 600;
        }
        .badge-success {
            background: #c6f6d5;
            color: #22543d;
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        .pulse {
            animation: pulse 2s ease-in-out infinite;
        }
        .logs-card {
            background: rgba(255, 255, 255, 0.95);
            border-radius: 15px;
            padding: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            margin-top: 30px;
        }
        .logs-card h2 {
            font-size: 1.5em;
            color: #2d3748;
            margin-bottom: 20px;
        }
        .log-container {
            background: #1a202c;
            border-radius: 10px;
            padding: 15px;
            height: 300px;
            overflow-y: auto;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 0.85em;
        }
        .log-entry {
            margin-bottom: 8px;
            padding: 6px 10px;
            border-radius: 4px;
            background: rgba(255,255,255,0.05);
        }
        .log-timestamp {
            color: #90cdf4;
            margin-right: 10px;
        }
        .log-level {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 3px;
            font-size: 0.8em;
            font-weight: bold;
            margin-right: 10px;
        }
        .log-level-INFO {
            background: #48bb78;
            color: white;
        }
        .log-level-WARNING {
            background: #ed8936;
            color: white;
        }
        .log-level-ERROR {
            background: #f56565;
            color: white;
        }
        .log-message {
            color: #e2e8f0;
        }
        .log-empty {
            color: #718096;
            text-align: center;
            padding: 50px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎬 Gemini Video Insight</h1>
            <p>Service Status Dashboard</p>
        </div>

        <div class="status-grid">
            <div class="status-card">
                <div class="status-icon status-online pulse">✓</div>
                <h2>Backend Server</h2>
                <p><span class="badge badge-success">ONLINE</span></p>
                <p>Port: 8000</p>
            </div>

            <div class="status-card">
                <div class="status-icon status-online pulse">✓</div>
                <h2>Frontend Server</h2>
                <p><span class="badge badge-success">RUNNING</span></p>
                <p>Port: 3000</p>
            </div>

            <div class="status-card">
                <div class="status-icon">📊</div>
                <h2>Gemini API</h2>
                <p id="api-status">Checking...</p>
            </div>
        </div>

        <div class="links-card">
            <h2>🔗 Quick Links</h2>
            <div class="link-list">
                <a href="http://localhost:3000" target="_blank" class="link-item">
                    <span class="link-icon">🏠</span>
                    <div class="link-text">
                        <strong>Frontend Application</strong>
                        <small>http://localhost:3000</small>
                    </div>
                </a>

                <a href="http://localhost:8000/docs" target="_blank" class="link-item">
                    <span class="link-icon">📚</span>
                    <div class="link-text">
                        <strong>API Documentation</strong>
                        <small>http://localhost:8000/docs</small>
                    </div>
                </a>

                <a href="http://localhost:8000/api/health" target="_blank" class="link-item">
                    <span class="link-icon">❤️</span>
                    <div class="link-text">
                        <strong>Health Check</strong>
                        <small>http://localhost:8000/api/health</small>
                    </div>
                </a>

                <a href="https://ai.google.dev/gemini-api" target="_blank" class="link-item">
                    <span class="link-icon">🌐</span>
                    <div class="link-text">
                        <strong>Gemini API Docs</strong>
                        <small>Official Documentation</small>
                    </div>
                </a>
            </div>
        </div>

        <div class="logs-card">
            <h2>📋 Server Logs</h2>
            <div class="log-container" id="log-container">
                <div class="log-empty">Loading logs...</div>
            </div>
        </div>
    </div>

    <script>
        // Check API key configuration
        fetch('/api/health')
            .then(r => r.json())
            .then(data => {
                document.getElementById('api-status').innerHTML =
                    '<span class="badge badge-success">CONFIGURED</span>';
            })
            .catch(err => {
                document.getElementById('api-status').innerHTML =
                    '<span class="badge" style="background:#fed7d7;color:#742a2a">ERROR</span>';
            });

        // Load and display logs
        function loadLogs() {
            fetch('/api/logs')
                .then(r => r.json())
                .then(data => {
                    const container = document.getElementById('log-container');
                    if (data.logs && data.logs.length > 0) {
                        container.innerHTML = data.logs.map(log => `
                            <div class="log-entry">
                                <span class="log-timestamp">${log.timestamp}</span>
                                <span class="log-level log-level-${log.level}">${log.level}</span>
                                <span class="log-message">${log.message}</span>
                            </div>
                        `).join('');
                        // Auto-scroll to bottom
                        container.scrollTop = container.scrollHeight;
                    } else {
                        container.innerHTML = '<div class="log-empty">No logs yet</div>';
                    }
                })
                .catch(err => {
                    document.getElementById('log-container').innerHTML =
                        '<div class="log-empty">Failed to load logs</div>';
                });
        }

        // Load logs immediately
        loadLogs();

        // Refresh status and logs every 3 seconds
        setInterval(() => {
            fetch('/api/health').catch(() => {});
            loadLogs();
        }, 3000);
    </script>
</body>
</html>
    """
    return HTMLResponse(content=html_content)

@app.get("/api/files")
async def list_uploaded_files(
    x_gemini_api_key: Optional[str] = Header(None)
):
    """List all uploaded files in Gemini API"""
    try:
        api_key = get_api_key(x_gemini_api_key)
        client = get_client(api_key)

        files = []
        for f in client.files.list():
            files.append({
                "name": f.name,
                "display_name": getattr(f, 'display_name', None),
                "mime_type": getattr(f, 'mime_type', None),
                "size_bytes": getattr(f, 'size_bytes', None),
                "state": str(f.state) if hasattr(f, 'state') else None,
                "create_time": str(f.create_time) if hasattr(f, 'create_time') else None,
                "expiration_time": str(f.expiration_time) if hasattr(f, 'expiration_time') else None,
            })

        return {"files": files}

    except Exception as e:
        logger.error(f"Error listing files: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/files/{file_name:path}")
async def delete_file(
    file_name: str,
    x_gemini_api_key: Optional[str] = Header(None)
):
    """Delete an uploaded file"""
    try:
        api_key = get_api_key(x_gemini_api_key)
        client = get_client(api_key)

        client.files.delete(name=file_name)

        # Also remove from cache if present
        if file_name in uploaded_files_cache:
            del uploaded_files_cache[file_name]

        return {"status": "deleted", "file_name": file_name}

    except Exception as e:
        logger.error(f"Error deleting file: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.patch("/api/files/{file_name:path}")
async def update_file_display_name(
    file_name: str,
    request: Request,
    x_gemini_api_key: Optional[str] = Header(None)
):
    """Update file's display name"""
    try:
        api_key = get_api_key(x_gemini_api_key)
        client = get_client(api_key)

        # Get new display name from request body
        body = await request.json()
        new_display_name = body.get('display_name', '').strip()

        if not new_display_name:
            raise HTTPException(status_code=400, detail="display_name is required")

        # Update file's display name using Gemini API
        updated_file = client.files.update(
            name=file_name,
            config=types.UpdateFileConfig(
                display_name=new_display_name
            )
        )

        # Update cache if file is cached
        if file_name in uploaded_files_cache:
            uploaded_files_cache[file_name] = updated_file

        logger.info(f"✅ File display name updated: {file_name} -> {new_display_name}")
        return {
            "status": "success",
            "name": file_name,
            "display_name": new_display_name
        }

    except Exception as e:
        logger.error(f"Error updating file display name: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/progress/{upload_id}")
async def get_progress(upload_id: str):
    """Get upload progress"""
    if upload_id in progress_store:
        return progress_store[upload_id]
    return {"stage": "unknown", "progress": 0, "message": "Upload ID not found"}

# --- Background Tasks ---

async def process_url_upload(upload_id: str, url: str, api_key: str):
    """Background task to process URL upload"""
    try:
        client = get_client(api_key)

        # Stage 1: Download video from URL (0-50%) with real-time speed tracking
        update_progress(upload_id, "downloading", 5, "Starting download from URL...")
        logger.info(f"[{upload_id[:8]}] Downloading video from URL: {url}")

        # Simple headers for CDN direct links (like IDM)
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Trident/7.0; rv:11.0) like Gecko',
        }

        # Increased timeout for large files
        async with httpx.AsyncClient(timeout=600.0, headers=headers, follow_redirects=True) as http_client:
            update_progress(upload_id, "downloading", 10, "Connecting to URL...")

            # Use streaming to track download progress
            async with http_client.stream('GET', url) as response:
                try:
                    response.raise_for_status()
                except httpx.HTTPStatusError as e:
                    error_msg = f"Failed to download video (HTTP {e.response.status_code})"
                    if e.response.status_code == 403:
                        error_msg += " - Access denied. The link may have expired or requires authentication."
                    elif e.response.status_code == 404:
                        error_msg += " - Video not found."
                    elif e.response.status_code >= 500:
                        error_msg += " - Server error."
                    logger.error(f"[{upload_id[:8]}] {error_msg}")
                    update_progress(upload_id, "error", 0, error_msg)
                    return

                # Get content length if available
                content_length = int(response.headers.get('content-length', 0))

                # Determine file extension from URL or content-type
                content_type = response.headers.get('content-type', '')
                ext = '.mp4'  # default
                if 'video' in content_type:
                    if 'webm' in content_type:
                        ext = '.webm'
                    elif 'quicktime' in content_type:
                        ext = '.mov'

                # Extract filename from URL
                from urllib.parse import urlparse, unquote
                url_path = urlparse(url).path
                url_filename = unquote(url_path.split('/')[-1]) if url_path else 'video'
                # Add extension if not present
                if not any(url_filename.endswith(e) for e in ['.mp4', '.webm', '.mov', '.avi', '.mkv']):
                    url_filename = url_filename + ext

                # Create temporary file for streaming download
                tmp_file = tempfile.NamedTemporaryFile(delete=False, suffix=ext)
                tmp_path = tmp_file.name

                # Download with progress tracking
                downloaded = 0
                last_time = time.time()
                last_downloaded = 0
                current_speed = 0
                smoothing_factor = 0.3  # EMA smoothing

                try:
                    async for chunk in response.aiter_bytes(chunk_size=1024 * 1024):  # 1MB chunks
                        tmp_file.write(chunk)
                        downloaded += len(chunk)

                        # Calculate speed (similar to frontend implementation)
                        now = time.time()
                        time_diff = now - last_time

                        if time_diff >= 0.1:  # Update every 100ms minimum
                            bytes_diff = downloaded - last_downloaded
                            instant_speed = bytes_diff / time_diff

                            # EMA smoothing
                            if current_speed == 0:
                                current_speed = instant_speed
                            else:
                                current_speed = smoothing_factor * instant_speed + (1 - smoothing_factor) * current_speed

                            last_time = now
                            last_downloaded = downloaded

                            # Calculate progress (10-50% for download stage)
                            if content_length > 0:
                                download_percent = int((downloaded / content_length) * 40)
                                progress = 10 + min(download_percent, 40)
                            else:
                                # If no content-length, show indeterminate progress
                                progress = min(10 + int(downloaded / (1024 * 1024)), 45)  # 1MB = 1%

                            # Format message with speed and ETA
                            loaded_mb = downloaded / (1024 * 1024)
                            speed_mbps = current_speed / (1024 * 1024)

                            if content_length > 0:
                                total_mb = content_length / (1024 * 1024)
                                message = f"Downloading: {loaded_mb:.1f}MB / {total_mb:.1f}MB"
                            else:
                                message = f"Downloading: {loaded_mb:.1f}MB"

                            if current_speed > 0:
                                message += f" ({speed_mbps:.2f} MB/s)"

                                # Calculate ETA if we know total size
                                if content_length > 0 and downloaded < content_length:
                                    remaining = content_length - downloaded
                                    eta = remaining / current_speed

                                    if eta < 60:
                                        message += f" - {int(eta)}s remaining"
                                    elif eta < 3600:
                                        message += f" - {int(eta / 60)}m remaining"
                                    else:
                                        message += f" - {int(eta / 3600)}h {int((eta % 3600) / 60)}m remaining"

                            update_progress(upload_id, "downloading", progress, message, downloaded, content_length, current_speed)

                finally:
                    tmp_file.close()

                update_progress(upload_id, "downloading", 50, "Download complete!", downloaded, downloaded, 0)

        try:
            # Stage 2: Upload to Gemini (50-100%, same as file upload)
            update_progress(upload_id, "processing", 50, "Uploading to Gemini API...")

            # Upload to Gemini using new SDK
            logger.info(f"[{upload_id[:8]}] Uploading downloaded file to Gemini: {url_filename}")
            uploaded_file = client.files.upload(
                file=tmp_path,
                config=types.UploadFileConfig(
                    display_name=url_filename
                )
            )

            update_progress(upload_id, "processing", 60, "Processing video...")

            # Wait for processing (60-95%)
            retry_count = 0
            max_retries = 60

            while uploaded_file.state == "PROCESSING":
                if retry_count >= max_retries:
                    update_progress(upload_id, "error", 0, "Video processing timeout")
                    logger.error(f"[{upload_id[:8]}] Video processing timeout")
                    return

                logger.info(f"[{upload_id[:8]}] Waiting for file processing... ({retry_count + 1}/{max_retries})")
                progress = 60 + min(int((retry_count / max_retries) * 35), 35)
                update_progress(upload_id, "processing", progress, f"Processing video ({retry_count * 10}s)...")

                await asyncio.sleep(10)
                uploaded_file = client.files.get(name=uploaded_file.name)
                retry_count += 1

            if uploaded_file.state == "FAILED":
                update_progress(upload_id, "error", 0, "Video processing failed")
                logger.error(f"[{upload_id[:8]}] Video processing failed")
                return

            update_progress(upload_id, "complete", 100, "Upload complete!")

            # Store in cache
            file_id = uploaded_file.name
            uploaded_files_cache[file_id] = uploaded_file

            # Store result in progress_store
            progress_store[upload_id]['file_name'] = file_id
            progress_store[upload_id]['display_name'] = url_filename

            logger.info(f"✅ [{upload_id[:8]}] URL upload completed successfully")
            logger.info(f"   File ID: {file_id}")

        finally:
            # Clean up temporary file
            try:
                os.unlink(tmp_path)
            except:
                pass

    except Exception as e:
        logger.error(f"❌ [{upload_id[:8]}] Error in background URL processing: {str(e)}")
        update_progress(upload_id, "error", 0, str(e))

@app.post("/api/ingest", response_model=IngestResponse)
async def ingest_video(
    request: Request,
    background_tasks: BackgroundTasks,
    file: Optional[UploadFile] = File(None),
    x_gemini_api_key: Optional[str] = Header(None),
    x_gemini_model: Optional[str] = Header(None)
):
    """
    Ingest a video file or URL and upload it to Gemini API
    """
    upload_id = str(uuid.uuid4())
    logger.info(f"🎥 Starting video ingest (ID: {upload_id[:8]}...)")

    try:
        api_key = get_api_key(x_gemini_api_key)
        client = get_client(api_key)

        url = None

        # If no file, try to get URL from JSON body
        if not file:
            try:
                body = await request.json()
                url = body.get('url')
            except:
                pass

        # Handle file upload
        if file:
            update_progress(upload_id, "uploading", 10, "Receiving file...")

            # Create a temporary file to store the upload
            with tempfile.NamedTemporaryFile(delete=False, suffix=Path(file.filename).suffix) as tmp_file:
                # Read file in chunks to show progress
                chunk_size = 1024 * 1024  # 1MB chunks
                total_size = 0

                while True:
                    chunk = await file.read(chunk_size)
                    if not chunk:
                        break
                    tmp_file.write(chunk)
                    total_size += len(chunk)

                    # Update progress (10-30% for file receiving)
                    if file.size and file.size > 0:
                        progress = 10 + int((total_size / file.size) * 20)
                        update_progress(upload_id, "uploading", min(progress, 30), f"Received {total_size / (1024*1024):.1f}MB")

                tmp_path = tmp_file.name

            try:
                update_progress(upload_id, "uploading", 40, "Uploading to Gemini API...")

                # Upload to Gemini using new SDK
                logger.info(f"Uploading file to Gemini: {file.filename}")
                uploaded_file = client.files.upload(
                    file=tmp_path,
                    config=types.UploadFileConfig(
                        mime_type=file.content_type,
                        display_name=file.filename  # 保存原始文件名
                    )
                )

                update_progress(upload_id, "processing", 60, "Processing video...")

                # Wait for file to be processed
                retry_count = 0
                max_retries = 60  # Wait up to 10 minutes (60 * 10 seconds)

                while uploaded_file.state == "PROCESSING":
                    if retry_count >= max_retries:
                        raise HTTPException(status_code=504, detail="Video processing timeout. Please try a smaller video.")

                    logger.info(f"Waiting for file processing... ({retry_count + 1}/{max_retries})")
                    progress = 60 + min(int((retry_count / max_retries) * 35), 35)
                    update_progress(upload_id, "processing", progress, f"Processing video ({retry_count * 10}s)...")

                    await asyncio.sleep(10)
                    uploaded_file = client.files.get(name=uploaded_file.name)
                    retry_count += 1

                if uploaded_file.state == "FAILED":
                    raise HTTPException(status_code=500, detail="Video processing failed")

                update_progress(upload_id, "complete", 100, "Video ready!")

                # Store in cache
                file_id = uploaded_file.name
                uploaded_files_cache[file_id] = uploaded_file

                logger.info(f"✅ File upload completed successfully: {file.filename}")
                logger.info(f"   File ID: {file_id}")

                return IngestResponse(
                    file_name=file_id,
                    status="success",
                    upload_id=upload_id,
                    display_name=file.filename  # 返回原始文件名
                )
            finally:
                # Clean up temporary file
                try:
                    os.unlink(tmp_path)
                except:
                    pass

        # Handle URL
        elif url:
            # Start background task for URL processing
            logger.info(f"🎥 Starting URL download in background (ID: {upload_id[:8]}...)")

            # Initialize progress
            update_progress(upload_id, "downloading", 5, "Initiating URL download...")

            # Add background task
            background_tasks.add_task(process_url_upload, upload_id, url, api_key)

            # Return immediately with upload_id
            return IngestResponse(
                file_name="",  # Will be set by background task
                status="processing",
                upload_id=upload_id,
                display_name=""  # Will be set by background task
            )
        else:
            raise HTTPException(status_code=400, detail="No file or URL provided")

    except HTTPException:
        update_progress(upload_id, "error", 0, "Upload failed")
        raise
    except Exception as e:
        logger.error(f"Error in ingest: {str(e)}")
        update_progress(upload_id, "error", 0, str(e))
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/summarize")
async def summarize_video(
    request: SummarizeRequest,
    x_gemini_api_key: Optional[str] = Header(None),
    x_gemini_model: Optional[str] = Header(None),
    x_gemini_thinking_budget: Optional[str] = Header(None),
    x_gemini_thinking_level: Optional[str] = Header(None)
):
    """
    Generate a summary of the uploaded video
    """
    try:
        api_key = get_api_key(x_gemini_api_key)
        model_name = get_model_name(x_gemini_model)
        thinking_budget = get_thinking_budget(x_gemini_thinking_budget)
        thinking_level = get_thinking_level(x_gemini_thinking_level)

        logger.info(f"📝 Generating summary (mode: {request.mode}, model: {model_name})")

        client = get_client(api_key)

        # Check if file exists in cache
        if request.file_name not in uploaded_files_cache:
            # Try to retrieve from Gemini
            try:
                uploaded_file = client.files.get(name=request.file_name)
                uploaded_files_cache[request.file_name] = uploaded_file
            except Exception as e:
                raise HTTPException(status_code=404, detail=f"File not found: {request.file_name}")

        uploaded_file = uploaded_files_cache[request.file_name]

        # Generate prompt (use custom prompt if provided, otherwise use default)
        if request.custom_prompt:
            prompt = request.custom_prompt
            logger.info(f"Using custom prompt: {prompt[:50]}...")
        else:
            prompt = get_summary_prompt(request.mode, request.language)

        # Configure generation with thinking config
        config = None

        # Check if model is Gemini 3.0 (uses thinking_level)
        is_gemini_3 = 'gemini-3' in model_name.lower()

        # Gemini 3.0 Pro uses thinking_level
        if is_gemini_3 and thinking_level:
            config = types.GenerateContentConfig(
                thinking_config=types.ThinkingConfig(
                    thinking_level=thinking_level
                )
            )
        # Gemini 2.5 series uses thinking_budget
        elif not is_gemini_3 and thinking_budget > 0:
            config = types.GenerateContentConfig(
                thinking_config=types.ThinkingConfig(
                    thinking_budget=thinking_budget
                )
            )

        # Generate content using new SDK
        logger.info(f"Generating summary with model: {model_name}, thinking_level: {thinking_level or 'N/A'}, thinking_budget: {thinking_budget}")
        response = client.models.generate_content(
            model=model_name,
            contents=[uploaded_file, prompt],
            config=config
        )

        logger.info(f"✅ Summary generated successfully ({len(response.text)} chars)")

        return {"text": response.text}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in summarize: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/qa")
async def qa_video(
    request: QARequest,
    x_gemini_api_key: Optional[str] = Header(None),
    x_gemini_model: Optional[str] = Header(None),
    x_gemini_thinking_budget: Optional[str] = Header(None),
    x_gemini_thinking_level: Optional[str] = Header(None)
):
    """
    Answer a question about the uploaded video with conversation history support
    """
    try:
        api_key = get_api_key(x_gemini_api_key)
        model_name = get_model_name(x_gemini_model)
        thinking_budget = get_thinking_budget(x_gemini_thinking_budget)
        thinking_level = get_thinking_level(x_gemini_thinking_level)

        logger.info(f"💬 Answering question: \"{request.question[:50]}...\" (model: {model_name})")

        client = get_client(api_key)

        # Check if file exists in cache
        if request.file_name not in uploaded_files_cache:
            # Try to retrieve from Gemini
            try:
                uploaded_file = client.files.get(name=request.file_name)
                uploaded_files_cache[request.file_name] = uploaded_file
            except Exception as e:
                raise HTTPException(status_code=404, detail=f"File not found: {request.file_name}")

        uploaded_file = uploaded_files_cache[request.file_name]

        # Build conversation contents with history
        contents = []

        # Add video file first
        contents.append(uploaded_file)

        # Add conversation history if provided
        if request.history:
            for msg in request.history:
                role = msg.get("role", "user")
                text = msg.get("text", "")

                if role == "user":
                    # Format user question with language context
                    formatted_text = format_question(text, request.language)
                    contents.append({"role": "user", "parts": [{"text": formatted_text}]})
                elif role == "model":
                    contents.append({"role": "model", "parts": [{"text": text}]})

        # Add current question
        formatted_question = format_question(request.question, request.language)
        contents.append({"role": "user", "parts": [{"text": formatted_question}]})

        # Configure generation with thinking config
        config = None

        # Check if model is Gemini 3.0 (uses thinking_level)
        is_gemini_3 = 'gemini-3' in model_name.lower()

        # Gemini 3.0 Pro uses thinking_level
        if is_gemini_3 and thinking_level:
            config = types.GenerateContentConfig(
                thinking_config=types.ThinkingConfig(
                    thinking_level=thinking_level
                )
            )
        # Gemini 2.5 series uses thinking_budget
        elif not is_gemini_3 and thinking_budget > 0:
            config = types.GenerateContentConfig(
                thinking_config=types.ThinkingConfig(
                    thinking_budget=thinking_budget
                )
            )

        # Generate content using new SDK
        logger.info(f"Answering question with model: {model_name}, history length: {len(request.history) if request.history else 0}, thinking_level: {thinking_level or 'N/A'}, thinking_budget: {thinking_budget}")
        response = client.models.generate_content(
            model=model_name,
            contents=contents,
            config=config
        )

        logger.info(f"✅ Answer generated successfully ({len(response.text)} chars)")

        return {"answer": response.text}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in qa: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# --- Main Entry Point ---

if __name__ == "__main__":
    import uvicorn

    print("=" * 60)
    print("Gemini Video Insight API Server")
    print("=" * 60)
    print("Starting server on http://localhost:8000")
    print("API documentation available at http://localhost:8000/docs")
    print("=" * 60)

    logger.info("Gemini Video Insight API Server starting...")
    logger.info("Server listening on http://localhost:8000")

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info",
        timeout_keep_alive=600  # 10 minute timeout
    )
