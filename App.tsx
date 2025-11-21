import React, { useState, useEffect } from 'react';
import { FileVideo, AlertCircle, Languages, Settings, History, RefreshCw, Trash2, X, Edit, Check } from 'lucide-react';
import { useTranslation } from './i18n';
import { ingestFile, ingestUrl, fetchSummary, fetchQA, checkHealth, listFiles, deleteFile, renameFile, UploadedFile, UploadProgressInfo, QAHistoryItem } from './services/api';
import { Language, UploadStatus, SummaryMode } from './types';
import SettingsModal from './components/SettingsModal';
import IngestSection from './components/IngestSection';
import AnalysisDashboard from './components/AnalysisDashboard';

const App: React.FC = () => {
  const [language, setLanguage] = useState<Language>('zh');
  const t = useTranslation(language);

  // Server Health
  const [isServerOnline, setIsServerOnline] = useState<boolean>(true);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [helpTab, setHelpTab] = useState<'config' | 'model'>('config');

  // Ingest State
  const [activeTab, setActiveTab] = useState<'file' | 'url'>('file');
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState<string>('');
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>(UploadStatus.IDLE);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [originalFileName, setOriginalFileName] = useState<string>(''); // 保存原始文件名
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadMessage, setUploadMessage] = useState<string>('');

  // Feature State
  const [summaryMode, setSummaryMode] = useState<SummaryMode>('points');
  const [summaryResult, setSummaryResult] = useState<string>('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  const [question, setQuestion] = useState('');
  const [qaResult, setQaResult] = useState<string>('');
  const [isAsking, setIsAsking] = useState(false);
  const [qaHistory, setQaHistory] = useState<QAHistoryItem[]>([]);

  // History State
  const [showHistory, setShowHistory] = useState(false);
  const [historyFiles, setHistoryFiles] = useState<UploadedFile[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [editingFileName, setEditingFileName] = useState<string | null>(null);
  const [editingDisplayName, setEditingDisplayName] = useState<string>('');

  useEffect(() => {
    const verifyServer = async () => {
      const online = await checkHealth();
      setIsServerOnline(online);
    };
    verifyServer();

    // Prevent default drag and drop behavior on the entire page
    const preventDefaults = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    window.addEventListener('dragover', preventDefaults);
    window.addEventListener('drop', preventDefaults);

    return () => {
      window.removeEventListener('dragover', preventDefaults);
      window.removeEventListener('drop', preventDefaults);
    };
  }, []);

  const loadHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const files = await listFiles();
      setHistoryFiles(files);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleSelectFromHistory = (fileName: string, displayName?: string) => {
    setUploadedFileName(fileName);
    setOriginalFileName(displayName || fileName); // 保存显示名称
    setUploadStatus(UploadStatus.SUCCESS);
    setShowHistory(false);
    setSummaryResult('');
    setQaResult('');
    setQaHistory([]); // 清除QA历史
  };

  const handleDeleteFile = async (fileName: string) => {
    try {
      await deleteFile(fileName);
      setHistoryFiles(prev => prev.filter(f => f.name !== fileName));
      if (uploadedFileName === fileName) {
        setUploadedFileName(null);
        setOriginalFileName('');
        setUploadStatus(UploadStatus.IDLE);
      }
    } catch (error) {
      console.error('Failed to delete file:', error);
    }
  };

  const handleStartRename = (fileName: string, currentDisplayName: string) => {
    setEditingFileName(fileName);
    setEditingDisplayName(currentDisplayName);
  };

  const handleCancelRename = () => {
    setEditingFileName(null);
    setEditingDisplayName('');
  };

  const handleSaveRename = async (fileName: string) => {
    if (!editingDisplayName.trim()) {
      handleCancelRename();
      return;
    }

    try {
      await renameFile(fileName, editingDisplayName.trim());

      // Update history files list
      setHistoryFiles(prev => prev.map(f =>
        f.name === fileName
          ? { ...f, display_name: editingDisplayName.trim() }
          : f
      ));

      // Update current file's display name if it's the renamed file
      if (uploadedFileName === fileName) {
        setOriginalFileName(editingDisplayName.trim());
      }

      handleCancelRename();
    } catch (error) {
      console.error('Failed to rename file:', error);
      alert('Failed to rename file: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Unknown';
    return new Date(dateStr).toLocaleString();
  };

  const handleIngest = async () => {
    setUploadStatus(UploadStatus.UPLOADING);
    setErrorMessage('');
    setSummaryResult('');
    setQaResult('');
    setQaHistory([]); // 清除QA历史
    setUploadProgress(0);
    setUploadMessage('');

    const onProgress = (info: UploadProgressInfo) => {
      setUploadProgress(info.progress);
      setUploadMessage(info.message);
      if (info.progress >= 40) {
        setUploadStatus(UploadStatus.PROCESSING);
      }
    };

    try {
      let response;
      if (activeTab === 'file') {
        if (!file) return;
        response = await ingestFile(file, onProgress);
      } else {
        if (!url) return;
        setUploadStatus(UploadStatus.PROCESSING);
        response = await ingestUrl(url, onProgress);
      }
      setUploadedFileName(response.file_name);
      setOriginalFileName(response.display_name || response.file_name); // 使用后端返回的display_name
      setUploadStatus(UploadStatus.SUCCESS);
      setUploadProgress(100);
      setUploadMessage('Upload complete!');
    } catch (error) {
      console.error(error);
      setUploadStatus(UploadStatus.ERROR);
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error');
      setUploadProgress(0);
    }
  };

  const handleGenerateSummary = async () => {
    if (!uploadedFileName) return;
    setIsGeneratingSummary(true);
    setSummaryResult('');
    try {
      const result = await fetchSummary(uploadedFileName, summaryMode, language);
      setSummaryResult(result);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      setSummaryResult(`**Error:** ${errorMsg}`);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleAskQuestion = async () => {
    if (!uploadedFileName || !question.trim()) return;
    setIsAsking(true);

    const currentQuestion = question.trim();

    try {
      // 发送请求时包含历史对话
      const result = await fetchQA(uploadedFileName, currentQuestion, language, qaHistory);

      // 更新历史记录
      const newHistory: QAHistoryItem[] = [
        ...qaHistory,
        { role: 'user', text: currentQuestion },
        { role: 'model', text: result }
      ];
      setQaHistory(newHistory);

      // 显示结果
      setQaResult(result);

      // 清空输入框
      setQuestion('');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      setQaResult(`**Error:** ${errorMsg}`);
    } finally {
      setIsAsking(false);
    }
  };

  const handleClearQAHistory = () => {
    setQaHistory([]);
    setQaResult('');
    setQuestion('');
  };

  return (
    <>
      {/* Main Content */}
      <div className="min-h-screen flex flex-col items-center py-10 px-4 md:px-8 bg-slate-50">

        <SettingsModal
          isOpen={showHelpModal}
          onClose={() => setShowHelpModal(false)}
          language={language}
          initialTab={helpTab}
        />

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">
                {language === 'en' ? 'Uploaded Files' : '已上传文件'}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={loadHistory}
                  disabled={isLoadingHistory}
                  className="p-2 rounded-lg text-slate-500 hover:text-primary-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
                  title={language === 'en' ? 'Refresh' : '刷新'}
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingHistory ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={() => setShowHistory(false)}
                  className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {isLoadingHistory ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin text-primary-500" />
                </div>
              ) : historyFiles.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  {language === 'en' ? 'No uploaded files found' : '没有找到已上传的文件'}
                </div>
              ) : (
                <div className="space-y-2">
                  {historyFiles.map((file) => (
                    <div
                      key={file.name}
                      className={`p-3 rounded-xl border transition-all ${
                        editingFileName === file.name
                          ? 'border-primary-500 bg-primary-50'
                          : uploadedFileName === file.name
                          ? 'border-primary-500 bg-primary-50 cursor-pointer hover:shadow-md'
                          : 'border-slate-200 hover:border-primary-300 bg-white cursor-pointer hover:shadow-md'
                      }`}
                      onClick={() => {
                        if (editingFileName !== file.name) {
                          handleSelectFromHistory(file.name, file.display_name || file.name);
                        }
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          {editingFileName === file.name ? (
                            <input
                              type="text"
                              value={editingDisplayName}
                              onChange={(e) => setEditingDisplayName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleSaveRename(file.name);
                                } else if (e.key === 'Escape') {
                                  handleCancelRename();
                                }
                              }}
                              onClick={(e) => e.stopPropagation()}
                              autoFocus
                              className="w-full px-2 py-1 text-sm font-medium text-slate-900 border border-primary-500 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                          ) : (
                            <p className="font-medium text-sm text-slate-900 truncate">
                              {file.display_name || file.name}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-slate-500">
                            <span>{formatFileSize(file.size_bytes)}</span>
                            <span>{file.mime_type || 'Unknown type'}</span>
                            <span>{formatDate(file.create_time)}</span>
                          </div>
                          {file.state && file.state !== 'ACTIVE' && (
                            <span className="inline-block mt-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded">
                              {file.state}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {editingFileName === file.name ? (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSaveRename(file.name);
                                }}
                                className="p-1.5 rounded-lg text-green-600 hover:text-green-700 hover:bg-green-50 transition-colors"
                                title={language === 'en' ? 'Save' : '保存'}
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCancelRename();
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                                title={language === 'en' ? 'Cancel' : '取消'}
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartRename(file.name, file.display_name || file.name);
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                                title={language === 'en' ? 'Rename' : '重命名'}
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteFile(file.name);
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                title={language === 'en' ? 'Delete' : '删除'}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 text-xs text-slate-500 text-center">
              {language === 'en'
                ? 'Files are retained for 48 hours after upload'
                : '文件在上传后保留48小时'}
            </div>
          </div>
        </div>
      )}

      {/* Server Offline Banner */}
      {!isServerOnline && (
        <div className="w-full max-w-7xl mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-800 shadow-sm animate-in slide-in-from-top-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <div className="flex-1">
            <h3 className="font-bold text-sm">{t.serverOffline}</h3>
            <p className="text-xs opacity-90">{t.serverOfflineSub}</p>
          </div>
          <button onClick={() => { setShowHelpModal(true); setHelpTab('config'); }} className="text-xs font-semibold bg-white border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
            {t.helpBtn}
          </button>
        </div>
      )}

      {/* Header */}
      <header className="w-full max-w-7xl flex justify-between items-center mb-10">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-primary-500 to-primary-700 p-2.5 rounded-xl shadow-lg shadow-primary-200">
            <FileVideo className="text-white w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t.appTitle}</h1>
            <p className="text-slate-500 text-sm font-medium">{t.appSubtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => { setShowHistory(true); loadHistory(); }}
            className="p-2.5 rounded-full text-slate-500 hover:text-primary-600 hover:bg-white hover:shadow-md transition-all duration-200"
            title={language === 'en' ? 'History' : '历史记录'}
          >
            <History className="w-5 h-5" />
          </button>

          <button
            onClick={() => setShowHelpModal(true)}
            className="p-2.5 rounded-full text-slate-500 hover:text-primary-600 hover:bg-white hover:shadow-md transition-all duration-200"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>

          <button
            onClick={() => setLanguage(prev => prev === 'en' ? 'zh' : 'en')}
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-slate-200 hover:bg-white hover:shadow-md transition-all bg-white text-slate-700 text-sm font-semibold"
          >
            <Languages className="w-4 h-4" />
            {language === 'en' ? '中文' : 'English'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-7xl">
        <div className="grid lg:grid-cols-[400px_1fr] gap-6 items-start">
          {/* Left Column - Upload Section */}
          <div className="lg:sticky lg:top-6">
            <IngestSection
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              file={file}
              setFile={setFile}
              url={url}
              setUrl={setUrl}
              uploadStatus={uploadStatus}
              errorMessage={errorMessage}
              uploadProgress={uploadProgress}
              uploadMessage={uploadMessage}
              onIngest={handleIngest}
              isServerOnline={isServerOnline}
              language={language}
              originalFileName={originalFileName}
            />
          </div>

          {/* Right Column - Analysis Dashboard */}
          <div>
            <AnalysisDashboard
              language={language}
              summaryMode={summaryMode}
              setSummaryMode={setSummaryMode}
              onGenerateSummary={handleGenerateSummary}
              isGeneratingSummary={isGeneratingSummary}
              summaryResult={summaryResult}
              question={question}
              setQuestion={setQuestion}
              onAskQuestion={handleAskQuestion}
              isAsking={isAsking}
              qaResult={qaResult}
              qaHistory={qaHistory}
              onClearHistory={handleClearQAHistory}
              uploadedFileName={uploadedFileName}
            />
          </div>
        </div>
      </main>

      <footer className="mt-16 text-slate-400 text-xs font-medium flex flex-col items-center gap-2">
        <span>{t.footerText}</span>
      </footer>
      </div>
    </>
  );
}

export default App;
