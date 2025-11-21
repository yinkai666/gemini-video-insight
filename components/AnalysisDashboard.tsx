import React, { useState } from 'react';
import { FileText, MessageSquare, Loader2, Trash2, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Language, SummaryMode } from '../types';
import { useTranslation } from '../i18n';
import { QAHistoryItem } from '../services/api';

interface AnalysisDashboardProps {
  language: Language;
  summaryMode: SummaryMode;
  setSummaryMode: (mode: SummaryMode) => void;
  onGenerateSummary: () => void;
  isGeneratingSummary: boolean;
  summaryResult: string;
  question: string;
  setQuestion: (q: string) => void;
  onAskQuestion: () => void;
  isAsking: boolean;
  qaResult: string;
  qaHistory: QAHistoryItem[];
  onClearHistory: () => void;
  uploadedFileName: string | null;
}

const AnalysisDashboard: React.FC<AnalysisDashboardProps> = ({
  language,
  summaryMode, setSummaryMode,
  onGenerateSummary, isGeneratingSummary, summaryResult,
  question, setQuestion, onAskQuestion, isAsking, qaResult,
  qaHistory, onClearHistory,
  uploadedFileName
}) => {
  const t = useTranslation(language);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [copiedQAIndex, setCopiedQAIndex] = useState<number | null>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (question.trim() && !isAsking) {
        onAskQuestion();
      }
    }
  };

  const handleCopySummary = async () => {
    if (!summaryResult) return;
    try {
      await navigator.clipboard.writeText(summaryResult);
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2000);
    } catch (err) {
      console.error('Failed to copy summary:', err);
    }
  };

  const handleCopyQAMessage = async (index: number, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedQAIndex(index);
      setTimeout(() => setCopiedQAIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy message:', err);
    }
  };

  return (
    <div className="space-y-6">

      {/* Summary Section */}
      <section className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 flex flex-col min-h-[700px]">
        <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2">
            <FileText className="text-primary-600 w-5 h-5" />
            <h2 className="text-lg font-semibold text-slate-800">{t.sectionSummary}</h2>
          </div>
          {summaryResult && (
            <button
              onClick={handleCopySummary}
              className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
              title={language === 'en' ? 'Copy summary' : '复制摘要'}
            >
              {copiedSummary ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          )}
        </div>

        <div className="space-y-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">{t.modeLabel}</label>
            <div className="flex rounded-lg bg-slate-100 p-1">
              {(['points', 'outline', 'long'] as SummaryMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setSummaryMode(mode)}
                  className={`flex-1 py-1.5 text-xs md:text-sm font-medium rounded-md transition-all ${summaryMode === mode ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {mode === 'points' ? t.modePoints : mode === 'outline' ? t.modeOutline : t.modeLong}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={onGenerateSummary}
            disabled={isGeneratingSummary || !uploadedFileName}
            className="w-full py-2.5 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 disabled:opacity-70 transition-colors flex justify-center items-center gap-2"
          >
            {isGeneratingSummary && <Loader2 className="animate-spin w-4 h-4" />}
            {isGeneratingSummary ? t.generating : t.generateBtn}
          </button>
        </div>

        <div className="flex-1 bg-slate-50 rounded-xl p-4 overflow-y-auto border border-slate-100 text-sm leading-relaxed text-slate-700">
           {summaryResult ? (
             <div className="prose prose-slate prose-sm max-w-none">
               <ReactMarkdown>{summaryResult}</ReactMarkdown>
             </div>
           ) : (
             <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50">
               <FileText className="w-12 h-12 mb-2" />
               <p>
                 {uploadedFileName
                   ? (language === 'en' ? 'Select a mode and click generate' : '选择一种模式并点击生成')
                   : (language === 'en' ? 'Upload a video first' : '请先上传视频')}
               </p>
             </div>
           )}
        </div>
      </section>

      {/* QA Section */}
      <section className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 flex flex-col min-h-[700px]">
        <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="text-primary-600 w-5 h-5" />
            <h2 className="text-lg font-semibold text-slate-800">{t.sectionQA}</h2>
            {qaHistory.length > 0 && (
              <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">
                {qaHistory.length / 2} {language === 'en' ? 'messages' : '条对话'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {qaHistory.length > 0 && (
              <button
                onClick={onClearHistory}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                title={language === 'en' ? 'Clear history' : '清除历史'}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 bg-slate-50 rounded-xl p-4 overflow-y-auto border border-slate-100 mb-4 text-sm leading-relaxed">
          {qaHistory.length > 0 || qaResult ? (
            <div className="space-y-4">
              {/* Display conversation history */}
              {qaHistory.map((msg, idx) => (
                <div
                  key={idx}
                  className={`relative group ${
                    msg.role === 'user'
                      ? 'bg-white border border-slate-200 rounded-lg p-3'
                      : 'bg-primary-50 border border-primary-200 rounded-lg p-3'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 font-semibold text-slate-900 text-sm">
                        {language === 'en' ? 'You' : '你'}: {msg.text}
                      </div>
                      <button
                        onClick={() => handleCopyQAMessage(idx, msg.text)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-400 hover:text-slate-600 transition-all shrink-0"
                        title={language === 'en' ? 'Copy' : '复制'}
                      >
                        {copiedQAIndex === idx ? (
                          <Check className="w-3.5 h-3.5 text-green-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <button
                        onClick={() => handleCopyQAMessage(idx, msg.text)}
                        className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 p-1 rounded text-slate-400 hover:text-primary-600 transition-all"
                        title={language === 'en' ? 'Copy' : '复制'}
                      >
                        {copiedQAIndex === idx ? (
                          <Check className="w-3.5 h-3.5 text-green-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <div className="prose prose-slate prose-sm max-w-none pr-8">
                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Display current result if asking */}
              {isAsking && (
                <div className="bg-primary-50 border border-primary-200 rounded-lg p-3 flex items-center gap-2">
                  <Loader2 className="animate-spin w-4 h-4 text-primary-600" />
                  <span className="text-sm text-slate-600">{language === 'en' ? 'Thinking...' : '思考中...'}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50">
              <MessageSquare className="w-12 h-12 mb-2" />
              <p>
                {uploadedFileName
                  ? (language === 'en' ? 'Ask anything about the video' : '向视频提问')
                  : (language === 'en' ? 'Upload a video first' : '请先上传视频')}
              </p>
            </div>
          )}
        </div>

        <div className="mt-auto space-y-3">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t.questionPlaceholder}
            className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm resize-none h-20"
          />
          <button
            onClick={onAskQuestion}
            disabled={isAsking || !question.trim() || !uploadedFileName}
            className="w-full py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-70 transition-colors flex justify-center items-center gap-2"
          >
            {isAsking && <Loader2 className="animate-spin w-4 h-4" />}
            {isAsking ? t.asking : t.askBtn}
          </button>
        </div>
      </section>
    </div>
  );
};

export default AnalysisDashboard;
