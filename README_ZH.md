# 🎬 Gemini Video Insight

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.8+](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/downloads/)
[![React](https://img.shields.io/badge/react-18.3-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-5.6-blue.svg)](https://www.typescriptlang.org/)

基于 Google Gemini API 的强大视频分析应用。上传视频或提供 URL 以生成 AI 驱动的摘要、章节分解，并对视频内容进行问答。

[English](README.md) | [中文](README_ZH.md)

---

## ✨ 功能特性

- **🎥 灵活的视频输入**
  - 上传本地视频文件（支持拖放）
  - 通过 URL 导入视频，实时显示下载进度
  - 支持多种视频格式（MP4、WebM、MOV、AVI、MKV）

- **📝 AI 驱动的分析**
  - **要点模式**：简洁的要点列表摘要，包含核心主题
  - **大纲模式**：逐章节分解，包含时间戳
  - **详细模式**：全面深入的结构化分析

- **💬 交互式问答**
  - 对视频内容提问
  - 支持对话历史，便于追问
  - 上下文感知的回答

- **🧠 先进的 AI 模型**
  - **Gemini 3.0 Pro**：最新模型，内置思考能力
  - **Gemini 2.5 Flash**：快速高效的分析
  - Gemini 3.0 可配置思考等级（低/高）
  - Gemini 2.5 可调整思考预算

- **🎨 用户体验**
  - 双语界面（English & 中文）
  - 实时上传进度和速度追踪
  - 文件历史管理，支持重命名/删除
  - 可自定义摘要提示词
  - 基于 Tailwind CSS 的现代化响应式 UI

## 🛠️ 技术栈

**前端：**
- React 18.3 + TypeScript 5.6
- Vite 6.4（构建工具）
- Tailwind CSS 3.4（样式）
- Lucide React（图标）

**后端：**
- FastAPI（Python Web 框架）
- Google Generative AI SDK
- HTTPX（异步 HTTP 客户端）
- Uvicorn（ASGI 服务器）

## 📦 安装

### 前置要求

- Python 3.8 或更高版本
- Node.js 18 或更高版本
- Google Gemini API 密钥（[在此获取](https://ai.google.dev/)）

### 快速开始

**Windows:**
```bash
# 克隆并运行 - start.bat 会自动处理一切！
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

在浏览器中访问 `http://localhost:3000`。

## 🚀 使用方法

### Windows 批处理脚本

- **start.bat** - 启动所有服务（首次运行自动安装）
- **start-backend.bat** - 仅启动后端
- **start-frontend.bat** - 仅启动前端
- **stop.bat** - 停止所有服务器

### 手动启动

```bash
# 终端 1：后端
python main.py

# 终端 2：前端
npm run dev
```

## ⚙️ 配置

### 通过 Web 界面

1. 点击右上角的**设置**图标
2. 在**配置**选项卡中配置：
   - **API Key**：您的 Google Gemini API 密钥
   - **模型**：选择 `gemini-3-pro-preview` 或 `gemini-2.5-flash`
   - **思考设置**：
     - Gemini 3.0：选择 Low 或 High 思考等级
     - Gemini 2.5：调整思考预算（0-32768）

### 通过环境变量

创建 `.env` 文件：

```env
GEMINI_API_KEY=your_api_key_here
```

## 📚 API 文档

后端运行后，访问：

- **Swagger UI**：`http://localhost:8000/docs`
- **ReDoc**：`http://localhost:8000/redoc`
- **状态面板**：`http://localhost:8000/status`

### 主要端点

- `POST /api/ingest` - 上传视频文件或 URL
- `POST /api/summarize` - 生成视频摘要
- `POST /api/qa` - 提问关于视频的问题
- `GET /api/files` - 列出已上传文件
- `DELETE /api/files/{file_name}` - 删除文件
- `PATCH /api/files/{file_name}` - 重命名文件

## 🎯 自定义提示词

自定义摘要提示词以获得更好的结果：

1. 进入**设置** → **提示词**选项卡
2. 编辑每种模式的提示词（要点、大纲、详细）
3. 中文和英文分别配置
4. 点击**保存提示词**应用更改
5. **重置为默认**恢复优化的模板

## 📖 功能详解

### 视频上传

- **文件上传**：拖放或点击选择（建议最大 2GB）
- **URL 导入**：粘贴视频 URL 自动下载和处理
- **进度追踪**：实时上传速度、预计时间和处理状态

### 文件历史

- 查看所有已上传文件（保留 48 小时）
- 重命名文件，支持内联编辑（编辑按钮或双击）
- 删除不再需要的文件
- 快速选择以分析之前上传的内容

### AI 分析模式

**要点模式**：结构化摘要包含：
- 核心主题（一句话概括）
- 5-7 个关键要点
- 重要数据或引用
- 主要结论

**大纲模式**：章节分解包含：
- 每个部分的时间戳
- 章节标题和描述
- 层级化的内容流程

**详细模式**：全面分析包含：
- 概述（主题、背景、受众）
- 详细内容分析
- 深度洞察和创新点
- 带有可操作建议的总结

## 🔒 隐私与安全

- API 密钥本地存储在浏览器中（localStorage）
- 视频通过 Google Gemini API 处理
- 文件在 48 小时后自动删除
- 应用服务器不存储任何数据

## 🐛 故障排除

**服务器离线错误：**
- 确保后端在 8000 端口运行
- 检查 API 密钥是否正确配置

**上传失败：**
- 验证视频格式是否支持
- 检查文件大小（过大的文件可能超时）
- 对于 URL 上传，确保 URL 可公开访问

**摘要生成错误：**
- 确认视频已完全处理（检查文件状态）
- 验证 API 密钥有足够的配额
- 如果问题持续，尝试其他模型

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 🙏 致谢

- [Google Gemini API](https://ai.google.dev/gemini-api) 提供强大的 AI 能力
- [FastAPI](https://fastapi.tiangolo.com/) 优秀的 Python 框架
- [Vite](https://vitejs.dev/) 闪电般快速的前端工具

## 📞 支持

如果遇到任何问题或有疑问：

- 在 GitHub 上提交 issue
- 查看 [API 文档](http://localhost:8000/docs)
- 访问[状态面板](http://localhost:8000/status)查看服务器日志

## 🌟 Star History

如果您觉得这个项目有帮助，请考虑给它一个 star！⭐
