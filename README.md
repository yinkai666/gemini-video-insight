# 🎬 Gemini Video Insight

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.8+](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/downloads/)
[![React](https://img.shields.io/badge/react-18.3-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-5.6-blue.svg)](https://www.typescriptlang.org/)

A powerful video analysis application powered by Google's Gemini API. Upload videos or provide URLs to generate AI-powered summaries, chapter breakdowns, and ask questions about video content.

[English](README.md) | [中文](README_ZH.md)

---

## ✨ Features

- **🎥 Flexible Video Input**
  - Upload local video files (drag & drop supported)
  - Ingest videos from URLs with real-time download progress
  - Support for multiple video formats (MP4, WebM, MOV, AVI, MKV)

- **📝 AI-Powered Analysis**
  - **Points Mode**: Concise bullet-point summaries with core themes
  - **Outline Mode**: Chapter-by-chapter breakdown with timestamps
  - **Long Mode**: Comprehensive in-depth analysis with structured insights

- **💬 Interactive Q&A**
  - Ask questions about video content
  - Conversational history support for follow-up questions
  - Context-aware responses

- **🧠 Advanced AI Models**
  - **Gemini 3.0 Pro**: Latest model with built-in thinking capabilities
  - **Gemini 2.5 Flash**: Fast and efficient for quick analysis
  - Configurable thinking levels (low/high) for Gemini 3.0
  - Adjustable thinking budget for Gemini 2.5

- **🎨 User Experience**
  - Bilingual interface (English & 中文)
  - Real-time upload progress with speed tracking
  - File history management with rename/delete capabilities
  - Customizable summary prompts
  - Responsive modern UI with Tailwind CSS

## 🛠️ Tech Stack

**Frontend:**
- React 18.3 + TypeScript 5.6
- Vite 6.4 (Build tool)
- Tailwind CSS 3.4 (Styling)
- Lucide React (Icons)

**Backend:**
- FastAPI (Python web framework)
- Google Generative AI SDK
- HTTPX (Async HTTP client)
- Uvicorn (ASGI server)

## 📦 Installation

### Prerequisites

- Python 3.8 or higher
- Node.js 18 or higher
- Google Gemini API key ([Get one here](https://ai.google.dev/))

### Quick Start

**Windows:**
```bash
# Clone and run - start.bat handles everything!
git clone https://github.com/yinkai666/gemini-video-insight.git
cd gemini-video-insight
start.bat
```

**macOS/Linux:**
```bash
git clone https://github.com/yinkai666/gemini-video-insight.git
cd gemini-video-insight

python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
npm install
npm run dev
```

Visit `http://localhost:3000` in your browser.

## 🚀 Usage

### Windows Batch Scripts

- **start.bat** - Start everything (auto-setup on first run)
- **start-backend.bat** - Start backend only
- **start-frontend.bat** - Start frontend only
- **stop.bat** - Stop all servers

### Manual Start

```bash
# Terminal 1: Backend
python main.py

# Terminal 2: Frontend
npm run dev
```

## ⚙️ Configuration

### Via Web Interface

1. Click the **Settings** icon in the top right
2. Configure in the **Config** tab:
   - **API Key**: Your Google Gemini API key
   - **Model**: Choose between `gemini-3-pro-preview` or `gemini-2.5-flash`
   - **Thinking Settings**:
     - For Gemini 3.0: Select Low or High thinking level
     - For Gemini 2.5: Adjust thinking budget (0-32768)

### Via Environment Variables

Create a `.env` file:

```env
GEMINI_API_KEY=your_api_key_here
```

## 📚 API Documentation

Once the backend is running, visit:

- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`
- **Status Dashboard**: `http://localhost:8000/status`

### Main Endpoints

- `POST /api/ingest` - Upload video file or URL
- `POST /api/summarize` - Generate video summary
- `POST /api/qa` - Ask questions about video
- `GET /api/files` - List uploaded files
- `DELETE /api/files/{file_name}` - Delete file
- `PATCH /api/files/{file_name}` - Rename file

## 🎯 Custom Prompts

Customize summary prompts for better results:

1. Go to **Settings** → **Prompts** tab
2. Edit prompts for each mode (Points, Outline, Long)
3. Separate configurations for Chinese and English
4. Click **Save Prompts** to apply changes
5. **Reset to Default** restores optimized templates

## 📖 Features in Detail

### Video Upload

- **File Upload**: Drag & drop or click to select (max recommended: 2GB)
- **URL Ingest**: Paste video URL for automatic download and processing
- **Progress Tracking**: Real-time upload speed, ETA, and processing status

### File History

- View all uploaded files (retained for 48 hours)
- Rename files with inline editing (Edit button or double-click)
- Delete files you no longer need
- Quick selection to analyze previous uploads

### AI Analysis Modes

**Points Mode**: Structured summary with:
- Core theme (one-sentence overview)
- 5-7 key bullet points
- Important data or quotes
- Main conclusions

**Outline Mode**: Chapter breakdown with:
- Timestamps for each section
- Chapter titles and descriptions
- Hierarchical content flow

**Long Mode**: Comprehensive analysis with:
- Overview (topic, background, audience)
- Detailed content analysis
- Deep insights and innovations
- Summary with actionable takeaways

## 🔒 Privacy & Security

- API keys stored locally in browser (localStorage)
- Videos processed through Google Gemini API
- Files automatically deleted after 48 hours
- No data stored on application servers

## 🐛 Troubleshooting

**Server offline error:**
- Ensure backend is running on port 8000
- Check if API key is configured correctly

**Upload fails:**
- Verify video format is supported
- Check file size (very large files may timeout)
- For URL uploads, ensure the URL is publicly accessible

**Summary generation errors:**
- Confirm video has been fully processed (check file state)
- Verify API key has sufficient quota
- Try a different model if issues persist

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

## 🙏 Acknowledgments

- [Google Gemini API](https://ai.google.dev/gemini-api) for powerful AI capabilities
- [FastAPI](https://fastapi.tiangolo.com/) for the excellent Python framework
- [Vite](https://vitejs.dev/) for lightning-fast frontend tooling

## 📞 Support

If you encounter any issues or have questions:

- Open an issue on GitHub
- Check the [API Documentation](http://localhost:8000/docs)
- Visit the [Status Dashboard](http://localhost:8000/status) for server logs

## 🌟 Star History

If you find this project helpful, please consider giving it a star! ⭐
