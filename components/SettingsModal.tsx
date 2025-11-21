import React, { useState, useEffect } from 'react';
import { X, Settings, Save, Trash2, Eye, EyeOff, BrainCircuit, Zap, MessageSquare } from 'lucide-react';
import { useTranslation } from '../i18n';
import { Language } from '../types';
import { getStoredConfig, saveConfig, clearConfig } from '../services/api';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  initialTab?: 'config' | 'model' | 'prompts';
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, language, initialTab = 'config' }) => {
  const t = useTranslation(language);
  const [activeTab, setActiveTab] = useState<'config' | 'model' | 'prompts'>(initialTab);
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [thinkingBudget, setThinkingBudget] = useState(0);
  const [thinkingLevel, setThinkingLevel] = useState<'low' | 'high' | ''>('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  // Prompt states
  const [prompts, setPrompts] = useState({
    zh: {
      points: '请用中文分析这个视频，并以要点列表的形式提供简明摘要。\n\n请按以下结构组织：\n1. 核心主题（一句话概括）\n2. 主要要点（5-7个清晰的bullet points）\n3. 关键数据或引用（如适用）\n4. 核心结论\n\n请用中文回答。',
      outline: '请用中文为这个视频提供详细的章节分解。\n\n请包含以下内容：\n1. 每个章节的时间戳\n2. 章节标题\n3. 每个章节的详细描述\n4. 层级化的结构展示内容流程\n\n请用中文回答。',
      long: '请用中文对这个视频进行全面深入的分析。\n\n请按以下四部分结构组织：\n\n**一、概述**\n- 视频主题和背景\n- 目标受众和内容定位\n\n**二、详细内容**\n- 逐段/逐章节的深入分析\n- 关键论点和论据\n- 重要数据、案例或引用\n\n**三、深度分析**\n- 核心观点和创新点\n- 内容的价值和意义\n- 优势与局限性\n\n**四、总结**\n- 主要收获和启示\n- 实际应用建议\n\n请用中文回答。'
    },
    en: {
      points: 'Please analyze this video in English and provide a concise summary in bullet-point format.\n\nStructure your response as follows:\n1. Core theme (one-sentence overview)\n2. Key points (5-7 clear bullet points)\n3. Important data or quotes (if applicable)\n4. Main conclusions\n\nPlease respond in English.',
      outline: 'Please provide a detailed chapter-by-chapter breakdown of this video in English.\n\nInclude the following:\n1. Timestamp for each chapter\n2. Chapter titles\n3. Detailed description of each chapter\n4. Hierarchical structure showing content flow\n\nPlease respond in English.',
      long: 'Please provide a comprehensive in-depth analysis of this video in English.\n\nOrganize your response in four sections:\n\n**I. Overview**\n- Video topic and background\n- Target audience and content positioning\n\n**II. Detailed Content**\n- Section-by-section in-depth analysis\n- Key arguments and evidence\n- Important data, examples, or quotes\n\n**III. Deep Analysis**\n- Core insights and innovations\n- Value and significance of the content\n- Strengths and limitations\n\n**IV. Summary**\n- Key takeaways and insights\n- Practical application recommendations\n\nPlease respond in English.'
    }
  });

  // Check if current model is Gemini 3.0
  const isGemini3 = model.includes('gemini-3');

  useEffect(() => {
    if (isOpen) {
      const config = getStoredConfig();
      setApiKey(config.apiKey);
      setModel(config.model);
      setThinkingBudget(config.thinkingBudget || 0);
      setThinkingLevel(config.thinkingLevel || '');

      // Load custom prompts from localStorage
      const savedPrompts = localStorage.getItem('customPrompts');
      if (savedPrompts) {
        try {
          setPrompts(JSON.parse(savedPrompts));
        } catch (e) {
          console.error('Failed to load custom prompts:', e);
        }
      }

      setSavedMsg('');
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Auto-set thinking_level when switching to Gemini 3.0
  useEffect(() => {
    if (isGemini3 && !thinkingLevel) {
      setThinkingLevel('high');
    }
  }, [isGemini3, thinkingLevel]);

  const handleSave = () => {
    saveConfig({ apiKey, model, thinkingBudget, thinkingLevel });
    setSavedMsg(t.saveSuccess);
    setTimeout(() => setSavedMsg(''), 3000);
  };

  const handleClear = () => {
    clearConfig();
    setApiKey('');
    setModel('gemini-2.5-flash');
    setThinkingBudget(0);
    setThinkingLevel('');
    setSavedMsg('');
  };

  const handleSavePrompts = () => {
    localStorage.setItem('customPrompts', JSON.stringify(prompts));
    setSavedMsg(language === 'en' ? 'Prompts saved!' : '提示词已保存!');
    setTimeout(() => setSavedMsg(''), 3000);
  };

  const handleResetPrompts = () => {
    const defaultPrompts = {
      zh: {
        points: '请用中文分析这个视频，并以要点列表的形式提供简明摘要。\n\n请按以下结构组织：\n1. 核心主题（一句话概括）\n2. 主要要点（5-7个清晰的bullet points）\n3. 关键数据或引用（如适用）\n4. 核心结论\n\n请用中文回答。',
        outline: '请用中文为这个视频提供详细的章节分解。\n\n请包含以下内容：\n1. 每个章节的时间戳\n2. 章节标题\n3. 每个章节的详细描述\n4. 层级化的结构展示内容流程\n\n请用中文回答。',
        long: '请用中文对这个视频进行全面深入的分析。\n\n请按以下四部分结构组织：\n\n**一、概述**\n- 视频主题和背景\n- 目标受众和内容定位\n\n**二、详细内容**\n- 逐段/逐章节的深入分析\n- 关键论点和论据\n- 重要数据、案例或引用\n\n**三、深度分析**\n- 核心观点和创新点\n- 内容的价值和意义\n- 优势与局限性\n\n**四、总结**\n- 主要收获和启示\n- 实际应用建议\n\n请用中文回答。'
      },
      en: {
        points: 'Please analyze this video in English and provide a concise summary in bullet-point format.\n\nStructure your response as follows:\n1. Core theme (one-sentence overview)\n2. Key points (5-7 clear bullet points)\n3. Important data or quotes (if applicable)\n4. Main conclusions\n\nPlease respond in English.',
        outline: 'Please provide a detailed chapter-by-chapter breakdown of this video in English.\n\nInclude the following:\n1. Timestamp for each chapter\n2. Chapter titles\n3. Detailed description of each chapter\n4. Hierarchical structure showing content flow\n\nPlease respond in English.',
        long: 'Please provide a comprehensive in-depth analysis of this video in English.\n\nOrganize your response in four sections:\n\n**I. Overview**\n- Video topic and background\n- Target audience and content positioning\n\n**II. Detailed Content**\n- Section-by-section in-depth analysis\n- Key arguments and evidence\n- Important data, examples, or quotes\n\n**III. Deep Analysis**\n- Core insights and innovations\n- Value and significance of the content\n- Strengths and limitations\n\n**IV. Summary**\n- Key takeaways and insights\n- Practical application recommendations\n\nPlease respond in English.'
      }
    };
    setPrompts(defaultPrompts);
    localStorage.removeItem('customPrompts');
    setSavedMsg(language === 'en' ? 'Prompts reset to default!' : '提示词已重置为默认!');
    setTimeout(() => setSavedMsg(''), 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 shrink-0">
          <h3 className="text-lg font-bold text-slate-900">{t.helpModalTitle}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="flex border-b border-slate-100 shrink-0">
          <button
            onClick={() => setActiveTab('config')}
            className={`flex-1 py-3 text-sm font-medium ${activeTab === 'config' ? 'text-primary-600 border-b-2 border-primary-600 bg-slate-50' : 'text-slate-500'}`}
          >
            {t.helpConfigTab}
          </button>
          <button
            onClick={() => setActiveTab('model')}
            className={`flex-1 py-3 text-sm font-medium ${activeTab === 'model' ? 'text-primary-600 border-b-2 border-primary-600 bg-slate-50' : 'text-slate-500'}`}
          >
            {t.helpModelTab}
          </button>
          <button
            onClick={() => setActiveTab('prompts')}
            className={`flex-1 py-3 text-sm font-medium ${activeTab === 'prompts' ? 'text-primary-600 border-b-2 border-primary-600 bg-slate-50' : 'text-slate-500'}`}
          >
            {language === 'en' ? 'Prompts' : '提示词'}
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {activeTab === 'config' ? (
            <div className="space-y-6">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                  <Settings className="w-4 h-4" /> {t.configTitle}
                </h4>
                <p className="text-sm text-slate-600 mb-4">{t.configDesc}</p>
                
                <div className="space-y-5">
                  {/* API Key */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t.labelApiKey}</label>
                    <div className="relative">
                      <input 
                        type={showApiKey ? "text" : "password"}
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder={t.placeholderApiKey}
                        className="w-full p-2.5 pr-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                      />
                      <button 
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Model ID */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t.labelModel}</label>
                    <input 
                      type="text"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      placeholder={t.placeholderModel}
                      className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                    />
                     <div className="flex gap-2 mt-2">
                        <button onClick={() => setModel('gemini-3-pro-preview')} className="text-xs bg-slate-200 px-2 py-1 rounded hover:bg-slate-300 font-mono">gemini-3-pro-preview</button>
                        <button onClick={() => setModel('gemini-2.5-flash')} className="text-xs bg-slate-200 px-2 py-1 rounded hover:bg-slate-300 font-mono">gemini-2.5-flash</button>
                     </div>
                  </div>

                  {/* Thinking Config */}
                  <div>
                    {isGemini3 ? (
                      // Gemini 3.0: thinking_level
                      <>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          {language === 'en' ? 'Thinking Level (Gemini 3.0)' : '思考等级 (Gemini 3.0)'}
                        </label>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setThinkingLevel('low')}
                            className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                              thinkingLevel === 'low'
                                ? 'bg-primary-600 text-white border-primary-600'
                                : 'bg-white text-slate-700 border-slate-300 hover:border-primary-400'
                            }`}
                          >
                            Low
                          </button>
                          <button
                            onClick={() => setThinkingLevel('high')}
                            className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                              thinkingLevel === 'high'
                                ? 'bg-primary-600 text-white border-primary-600'
                                : 'bg-white text-slate-700 border-slate-300 hover:border-primary-400'
                            }`}
                          >
                            High
                          </button>
                        </div>
                        <p className="text-xs text-slate-500 mt-2">
                          {language === 'en'
                            ? 'Gemini 3.0 Pro always uses thinking. Choose low for faster responses or high for complex tasks.'
                            : 'Gemini 3.0 Pro 始终启用思考。选择 low 获得更快响应，或选择 high 处理复杂任务。'}
                        </p>
                      </>
                    ) : (
                      // Gemini 2.5: thinking_budget
                      <>
                        <label className="block text-sm font-medium text-slate-700 mb-1 flex justify-between">
                          <span>{t.labelThinking}</span>
                          <span className="text-primary-600 font-mono">{thinkingBudget > 0 ? thinkingBudget : 'Disabled'}</span>
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="32768"
                          step="1024"
                          value={thinkingBudget}
                          onChange={(e) => setThinkingBudget(Number(e.target.value))}
                          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                        />
                        <p className="text-xs text-slate-500 mt-1">{t.descThinking}</p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button 
                  onClick={handleClear}
                  className="text-red-500 text-sm font-medium hover:text-red-700 flex items-center gap-1"
                >
                  <Trash2 className="w-4 h-4" /> {t.btnClear}
                </button>
                
                <div className="flex items-center gap-3">
                  {savedMsg && <span className="text-green-600 text-sm font-medium animate-in fade-in">{savedMsg}</span>}
                  <button 
                    onClick={handleSave}
                    className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 flex items-center gap-2 shadow-sm"
                  >
                    <Save className="w-4 h-4" /> {t.btnSave}
                  </button>
                </div>
              </div>
            </div>
          ) : activeTab === 'model' ? (
            <div className="space-y-4 text-sm text-slate-600">
              <h4 className="font-semibold text-slate-900 mb-2">{t.modelTitle}</h4>

              <div className="border border-slate-200 rounded-xl p-4 hover:border-primary-200 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <BrainCircuit className="w-5 h-5 text-indigo-600" />
                  <span className="font-bold text-slate-900">{t.modelPro}</span>
                </div>
                <p>{t.modelProDesc}</p>
                <div className="mt-2 text-xs font-mono bg-slate-100 inline-block px-2 py-0.5 rounded text-slate-500">gemini-3-pro-preview</div>
              </div>

              <div className="border border-slate-200 rounded-xl p-4 hover:border-amber-200 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-5 h-5 text-amber-500" />
                  <span className="font-bold text-slate-900">{t.modelFlash}</span>
                </div>
                <p>{t.modelFlashDesc}</p>
                <div className="mt-2 text-xs font-mono bg-slate-100 inline-block px-2 py-0.5 rounded text-slate-500">gemini-2.5-flash</div>
              </div>
            </div>
          ) : activeTab === 'prompts' ? (
            <div className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                  <h4 className="font-semibold text-slate-900">
                    {language === 'en' ? 'Custom Summary Prompts' : '自定义摘要提示词'}
                  </h4>
                </div>
                <p className="text-sm text-slate-600">
                  {language === 'en'
                    ? 'Customize the prompts used for video summarization. Changes apply immediately.'
                    : '自定义用于视频摘要的提示词。修改后立即生效。'}
                </p>
              </div>

              {/* Chinese Prompts */}
              <div className="space-y-4">
                <h5 className="font-semibold text-slate-900 flex items-center gap-2">
                  <span className="text-lg">🇨🇳</span>
                  {language === 'en' ? 'Chinese Prompts' : '中文提示词'}
                </h5>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {language === 'en' ? 'Points Mode' : '要点模式'}
                  </label>
                  <textarea
                    value={prompts.zh.points}
                    onChange={(e) => setPrompts({...prompts, zh: {...prompts.zh, points: e.target.value}})}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm resize-none"
                    rows={2}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {language === 'en' ? 'Outline Mode' : '大纲模式'}
                  </label>
                  <textarea
                    value={prompts.zh.outline}
                    onChange={(e) => setPrompts({...prompts, zh: {...prompts.zh, outline: e.target.value}})}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm resize-none"
                    rows={2}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {language === 'en' ? 'Long Mode' : '详细模式'}
                  </label>
                  <textarea
                    value={prompts.zh.long}
                    onChange={(e) => setPrompts({...prompts, zh: {...prompts.zh, long: e.target.value}})}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm resize-none"
                    rows={2}
                  />
                </div>
              </div>

              {/* English Prompts */}
              <div className="space-y-4 pt-4 border-t border-slate-200">
                <h5 className="font-semibold text-slate-900 flex items-center gap-2">
                  <span className="text-lg">🇺🇸</span>
                  {language === 'en' ? 'English Prompts' : '英文提示词'}
                </h5>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {language === 'en' ? 'Points Mode' : '要点模式'}
                  </label>
                  <textarea
                    value={prompts.en.points}
                    onChange={(e) => setPrompts({...prompts, en: {...prompts.en, points: e.target.value}})}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm resize-none"
                    rows={2}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {language === 'en' ? 'Outline Mode' : '大纲模式'}
                  </label>
                  <textarea
                    value={prompts.en.outline}
                    onChange={(e) => setPrompts({...prompts, en: {...prompts.en, outline: e.target.value}})}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm resize-none"
                    rows={2}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {language === 'en' ? 'Long Mode' : '详细模式'}
                  </label>
                  <textarea
                    value={prompts.en.long}
                    onChange={(e) => setPrompts({...prompts, en: {...prompts.en, long: e.target.value}})}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm resize-none"
                    rows={2}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <button
                  onClick={handleResetPrompts}
                  className="text-red-500 text-sm font-medium hover:text-red-700 flex items-center gap-1"
                >
                  <Trash2 className="w-4 h-4" />
                  {language === 'en' ? 'Reset to Default' : '重置为默认'}
                </button>

                <div className="flex items-center gap-3">
                  {savedMsg && <span className="text-green-600 text-sm font-medium animate-in fade-in">{savedMsg}</span>}
                  <button
                    onClick={handleSavePrompts}
                    className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 flex items-center gap-2 shadow-sm"
                  >
                    <Save className="w-4 h-4" />
                    {language === 'en' ? 'Save Prompts' : '保存提示词'}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
