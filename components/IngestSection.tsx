import React, { useRef } from 'react';
import { Upload, Link as LinkIcon, FileVideo, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { UploadStatus, Language } from '../types';
import { useTranslation } from '../i18n';

interface IngestSectionProps {
  activeTab: 'file' | 'url';
  setActiveTab: (tab: 'file' | 'url') => void;
  file: File | null;
  setFile: (f: File | null) => void;
  url: string;
  setUrl: (u: string) => void;
  uploadStatus: UploadStatus;
  errorMessage: string;
  uploadProgress: number;
  uploadMessage: string;
  onIngest: () => void;
  isServerOnline: boolean;
  language: Language;
  originalFileName?: string; // 添加原始文件名
}

const IngestSection: React.FC<IngestSectionProps> = ({
  activeTab, setActiveTab,
  file, setFile,
  url, setUrl,
  uploadStatus, errorMessage, uploadProgress, uploadMessage, onIngest,
  isServerOnline, language, originalFileName
}) => {
  const t = useTranslation(language);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      setFile(files[0]);
    }
  };

  return (
    <section className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('file')}
          className={`flex-1 py-4 text-sm font-medium flex justify-center items-center gap-2 transition-colors ${activeTab === 'file' ? 'bg-slate-50 text-primary-600 border-b-2 border-primary-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Upload className="w-4 h-4" /> {t.uploadTab}
        </button>
        <button
          onClick={() => setActiveTab('url')}
          className={`flex-1 py-4 text-sm font-medium flex justify-center items-center gap-2 transition-colors ${activeTab === 'url' ? 'bg-slate-50 text-primary-600 border-b-2 border-primary-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <LinkIcon className="w-4 h-4" /> {t.urlTab}
        </button>
      </div>

      <div className="p-5">
        {activeTab === 'file' ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-primary-600 bg-primary-100 scale-105'
                : file
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
            }`}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
              accept="video/*"
            />
            {file ? (
              <div className="flex flex-col items-center text-primary-700">
                <FileVideo className="w-10 h-10 mb-3" />
                <span className="font-semibold text-lg">{file.name}</span>
                <span className="text-sm opacity-75">{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
              </div>
            ) : (
              <div className="flex flex-col items-center text-slate-500">
                <Upload className="w-10 h-10 mb-3 text-slate-400" />
                <span className="font-medium text-lg text-slate-700">{t.dropzoneText}</span>
                <span className="text-sm mt-1 text-slate-400">{t.dropzoneSubtext}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <LinkIcon className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && url.trim() && uploadStatus !== UploadStatus.UPLOADING && uploadStatus !== UploadStatus.PROCESSING) {
                  onIngest();
                }
              }}
              placeholder={t.urlPlaceholder}
              className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-xl leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-shadow shadow-sm"
            />
          </div>
        )}

        <div className="mt-6">
          {/* Progress Bar */}
          {(uploadStatus === UploadStatus.UPLOADING || uploadStatus === UploadStatus.PROCESSING) && (
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-slate-700">
                  {uploadMessage || (uploadStatus === UploadStatus.UPLOADING ? t.uploading : t.ingesting)}
                </span>
                <span className="text-sm font-semibold text-primary-600">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden shadow-inner">
                <div
                  className="bg-gradient-to-r from-primary-500 to-primary-600 h-full rounded-full transition-all duration-300 ease-out shadow-sm"
                  style={{ width: `${uploadProgress}%` }}
                >
                  <div className="h-full w-full bg-white/20 animate-pulse"></div>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="text-sm">
              {uploadStatus === UploadStatus.SUCCESS && (
                <div className="flex flex-col gap-1">
                  <span className="text-green-600 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4"/> {t.successIngest}
                  </span>
                  {originalFileName && (
                    <span className="text-slate-600 text-xs">
                      {originalFileName}
                    </span>
                  )}
                </div>
              )}
              {uploadStatus === UploadStatus.ERROR && (
                <span className="text-red-600 flex items-start gap-2 break-words">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5"/>
                  <span className="break-all">{errorMessage || t.errorIngest}</span>
                </span>
              )}
            </div>

            <button
              onClick={onIngest}
              disabled={uploadStatus === UploadStatus.UPLOADING || uploadStatus === UploadStatus.PROCESSING || (activeTab === 'file' && !file) || (activeTab === 'url' && !url) || !isServerOnline}
              className="bg-primary-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-primary-700 focus:ring-4 focus:ring-primary-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
            >
              {t.ingestBtn}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default IngestSection;
