import { Language } from './types';

export const translations = {
  en: {
    appTitle: "Video Insight & Q&A",
    appSubtitle: "Powered by Gemini 2.5 & 3.0",
    uploadTab: "Upload File",
    urlTab: "Public URL",
    dropzoneText: "Drag & drop a video file here, or click to select",
    dropzoneSubtext: "Supports MP4, MPEG, MOV, WEBM, FLV (Max 2GB)",
    urlPlaceholder: "https://example.com/video.mp4",
    ingestBtn: "Upload & Process",
    ingesting: "Processing...",
    uploading: "Uploading...",
    successIngest: "Video processed successfully!",
    errorIngest: "Failed to process video.",
    
    sectionSummary: "Generate Summary",
    modeLabel: "Summary Mode",
    modePoints: "Key Points",
    modeOutline: "Chapter Outline",
    modeLong: "Detailed Summary",
    generateBtn: "Generate Summary",
    generating: "Generating...",
    
    sectionQA: "Ask Questions",
    questionPlaceholder: "Ask something about the video...",
    askBtn: "Ask Question",
    asking: "Thinking...",
    
    footerText: "Gemini API Local Host • Python Backend",
    
    // Help/Config Section
    serverOffline: "Cannot connect to Python Backend.",
    serverOfflineSub: "Ensure the local server is running on port 8000.",
    helpBtn: "Settings",
    helpModalTitle: "Settings & Guide",
    helpConfigTab: "API Configuration",
    helpModelTab: "Model Info",
    
    configTitle: "Client-Side Configuration",
    configDesc: "Configure your API key and Model settings. These override server defaults.",
    labelApiKey: "Gemini API Key",
    placeholderApiKey: "Paste your API key here...",
    labelModel: "Model ID",
    placeholderModel: "e.g., gemini-2.5-flash",
    labelThinking: "Thinking Budget (Tokens)",
    descThinking: "Controls reasoning depth. Higher values = smarter but slower. Set to 0 to disable.",
    btnSave: "Save Configuration",
    btnClear: "Clear & Reset",
    saveSuccess: "Settings saved!",
    
    modelTitle: "Recommended Models",
    modelPro: "Gemini 3 Pro (Preview)",
    modelProDesc: "Top-tier reasoning for complex analysis, coding, and STEM tasks.",
    modelFlash: "Gemini 2.5 Flash",
    modelFlashDesc: "Balanced performance. Fast and efficient for general text tasks.",
  },
  zh: {
    appTitle: "视频智能摘要与问答",
    appSubtitle: "由 Gemini 2.5 & 3.0 驱动",
    uploadTab: "上传文件",
    urlTab: "公开链接",
    dropzoneText: "拖拽视频文件到此处，或点击选择",
    dropzoneSubtext: "支持 MP4, MPEG, MOV, WEBM, FLV (最大 2GB)",
    urlPlaceholder: "https://example.com/video.mp4",
    ingestBtn: "上传并处理",
    ingesting: "处理中...",
    uploading: "上传中...",
    successIngest: "视频处理成功！",
    errorIngest: "视频处理失败。",
    
    sectionSummary: "生成摘要",
    modeLabel: "摘要模式",
    modePoints: "关键点",
    modeOutline: "章节大纲",
    modeLong: "详细摘要",
    generateBtn: "生成摘要",
    generating: "生成中...",
    
    sectionQA: "内容问答",
    questionPlaceholder: "关于视频内容提问...",
    askBtn: "提问",
    asking: "思考中...",
    
    footerText: "Gemini API 本地服务 • Python 后端",

    // Help/Config Section
    serverOffline: "无法连接到 Python 后端。",
    serverOfflineSub: "请确保本地服务器正在端口 8000 上运行。",
    helpBtn: "设置",
    helpModalTitle: "设置与指南",
    helpConfigTab: "API 配置",
    helpModelTab: "模型信息",
    
    configTitle: "客户端配置",
    configDesc: "配置您的 API 密钥和模型设置。这些设置将覆盖服务器默认值。",
    labelApiKey: "Gemini API 密钥",
    placeholderApiKey: "在此处粘贴您的 API 密钥...",
    labelModel: "模型 ID",
    placeholderModel: "例如：gemini-2.5-flash",
    labelThinking: "思考预算 (Tokens)",
    descThinking: "控制推理深度。数值越高越智能但速度越慢。设为 0 以禁用。",
    btnSave: "保存配置",
    btnClear: "清除并重置",
    saveSuccess: "设置已保存！",
    
    modelTitle: "推荐模型",
    modelPro: "Gemini 3 Pro (Preview)",
    modelProDesc: "顶级推理能力，适合复杂分析、编程和 STEM 任务。",
    modelFlash: "Gemini 2.5 Flash",
    modelFlashDesc: "性能均衡。快速高效，适合通用文本任务。",
  }
};

export const useTranslation = (lang: Language) => translations[lang];
