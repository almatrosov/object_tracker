/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useCallback } from 'react';
import { 
  Upload, 
  Link as LinkIcon, 
  Play, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Image as ImageIcon,
  Settings2,
  X,
  RefreshCcw,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Configuration for object types
const OBJECT_CONFIG: Record<string, { emoji: string; color: string; label: string }> = {
  person: { emoji: '🚶', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', label: 'Человек' },
  car: { emoji: '🚗', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', label: 'Автомобиль' },
  truck: { emoji: '🚛', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', label: 'Грузовик' },
  bus: { emoji: '🚌', color: 'bg-red-500/20 text-red-400 border-red-500/30', label: 'Автобус' },
  motorcycle: { emoji: '🏍', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', label: 'Мотоцикл' },
  bicycle: { emoji: '🚲', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', label: 'Велосипед' },
  dog: { emoji: '🐕', color: 'bg-pink-500/20 text-pink-400 border-pink-500/30', label: 'Собака' },
};

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default function App() {
  // Connection State
  const [serverUrl, setServerUrl] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // File State
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Processing State
  const [confidence, setConfidence] = useState(0.3);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);

  // Result State
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [detectedObjects, setDetectedObjects] = useState<Record<string, number>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle Server Connection
  const handleConnect = async () => {
    if (!serverUrl.trim()) return;
    
    setIsConnecting(true);
    setConnectionError(null);
    
    try {
      const baseUrl = serverUrl.replace(/\/$/, '');
      const response = await fetch(`${baseUrl}/health`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      
      if (!response.ok) throw new Error(`Ошибка HTTP: ${response.status}`);
      
      const data = await response.json();
      
      if (data.status === 'ok') {
        setIsConnected(true);
        setConnectionError(null);
      } else {
        throw new Error('Сервер вернул некорректный статус');
      }
    } catch (err) {
      console.error('Connection error:', err);
      setConnectionError('Не удалось подключиться к серверу. Проверьте URL и доступность.');
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  };

  // Handle File Selection
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const ext = selectedFile.name.toLowerCase().split('.').pop();
      if (['jpg', 'jpeg', 'png'].includes(ext || '')) {
        setFile(selectedFile);
        setResultImage(null);
        setDetectedObjects({});
        setProcessingError(null);
      } else {
        setProcessingError('Поддерживаются только форматы .jpg, .jpeg, .png');
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      const ext = droppedFile.name.toLowerCase().split('.').pop();
      if (['jpg', 'jpeg', 'png'].includes(ext || '')) {
        setFile(droppedFile);
        setResultImage(null);
        setDetectedObjects({});
        setProcessingError(null);
      } else {
        setProcessingError('Поддерживаются только форматы .jpg, .jpeg, .png');
      }
    }
  };

  // Handle Analysis
  const handleAnalyze = async () => {
    if (!file || !isConnected) return;
    
    setIsProcessing(true);
    setProcessingError(null);
    
    try {
      const baseUrl = serverUrl.replace(/\/$/, '');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('confidence', confidence.toString());
      
      const response = await fetch(`${baseUrl}/detect`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) throw new Error(`Ошибка сервера: ${response.status}`);
      
      const data = await response.json();
      console.log('Server response:', data); // Debug log
      
      if (data.image_base64) {
        setResultImage(`data:image/jpeg;base64,${data.image_base64}`);
        setDetectedObjects(data.objects || {});
      } else {
        throw new Error('Сервер не вернул изображение');
      }
    } catch (err) {
      console.error('Analysis error:', err);
      setProcessingError(err instanceof Error ? err.message : 'Произошла ошибка при анализе изображения');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetFile = () => {
    setFile(null);
    setResultImage(null);
    setDetectedObjects({});
    setProcessingError(null);
  };

  const downloadResult = () => {
    if (!resultImage) return;
    const link = document.createElement('a');
    link.href = resultImage;
    link.download = `detected_${file?.name || 'image.jpg'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 font-sans selection:bg-indigo-500/30">
      {/* Header */}
      <header className="border-b border-white/5 bg-black/40 backdrop-blur-2xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between gap-8">
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <ImageIcon className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight hidden md:block">ObjectTracker <span className="text-indigo-400">AI</span></span>
          </div>

          <div className="flex-1 max-w-3xl flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <div className="relative flex-1 group">
                <LinkIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-indigo-400 transition-colors" />
                <input 
                  type="text" 
                  placeholder="URL сервера (вставьте ссылку из Colab)"
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-zinc-600 disabled:opacity-50"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  disabled={isConnected || isConnecting}
                />
              </div>
              <button 
                onClick={handleConnect}
                disabled={isConnected || !serverUrl || isConnecting}
                className={`px-6 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 shrink-0 ${
                  isConnected 
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 active:scale-95 disabled:opacity-50 disabled:pointer-events-none'
                }`}
              >
                {isConnecting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isConnected ? (
                  <><CheckCircle2 className="w-4 h-4" /> Подключено</>
                ) : (
                  'Подключиться'
                )}
              </button>
              {isConnected && (
                <button 
                  onClick={() => setIsConnected(false)}
                  className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-zinc-400 transition-colors"
                  title="Сменить сервер"
                >
                  <RefreshCcw className="w-4 h-4" />
                </button>
              )}
            </div>
            {connectionError && (
              <motion.p 
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[11px] text-red-400 flex items-center gap-1.5 px-1"
              >
                <AlertCircle className="w-3 h-3" /> {connectionError}
              </motion.p>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          {!isConnected ? (
            <motion.div 
              key="locked"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center py-32 text-center"
            >
              <div className="w-24 h-24 bg-white/5 rounded-[2rem] flex items-center justify-center mb-8 border border-white/10 relative">
                <LinkIcon className="w-10 h-10 text-zinc-600" />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-4 border-[#050505]" />
              </div>
              <h2 className="text-3xl font-bold mb-4">Требуется подключение</h2>
              <p className="text-zinc-500 max-w-md text-lg leading-relaxed">
                Введите URL вашего сервера в шапке сайта, чтобы разблокировать функции нейросетевого анализа.
              </p>
            </motion.div>
          ) : (
            <motion.div 
              key="active"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
            >
              {/* Left Column: Controls */}
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-6">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <Upload className="w-5 h-5 text-indigo-400" />
                    Загрузка данных
                  </h3>

                  <div 
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => !isProcessing && fileInputRef.current?.click()}
                    className={`relative group cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-300 ${
                      isDragging 
                      ? 'border-indigo-500 bg-indigo-500/5 scale-[1.01]' 
                      : 'border-white/10 hover:border-white/20 bg-black/40'
                    } ${isProcessing ? 'pointer-events-none opacity-50' : ''}`}
                  >
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      className="hidden" 
                      accept=".jpg,.jpeg,.png"
                      onChange={onFileChange}
                    />
                    
                    <div className="py-12 flex flex-col items-center text-center px-6">
                      <motion.div 
                        animate={isDragging ? { y: -8, scale: 1.1 } : { y: 0, scale: 1 }}
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 transition-colors ${
                          isDragging ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' : 'bg-white/5 text-zinc-500'
                        }`}
                      >
                        <Upload className="w-7 h-7" />
                      </motion.div>
                      
                      {file ? (
                        <div className="space-y-1.5">
                          <p className="text-base font-bold text-indigo-400 truncate max-w-[200px]">{file.name}</p>
                          <p className="text-xs text-zinc-500 flex items-center justify-center gap-1.5">
                            <FileText className="w-3 h-3" /> {formatFileSize(file.size)}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <p className="text-base font-bold">Выберите изображение</p>
                          <p className="text-xs text-zinc-500">Drag & Drop или клик (.jpg, .png)</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-bold text-zinc-400">
                        <Settings2 className="w-4 h-4" />
                        Confidence Threshold
                      </div>
                      <span className="bg-indigo-500/10 text-indigo-400 px-2.5 py-1 rounded-lg text-xs font-mono font-bold border border-indigo-500/20">
                        {confidence.toFixed(2)}
                      </span>
                    </div>
                    <input 
                      type="range" 
                      min="0.1" 
                      max="1.0" 
                      step="0.05"
                      value={confidence}
                      onChange={(e) => setConfidence(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                    <div className="flex justify-between text-[10px] text-zinc-600 font-bold uppercase tracking-widest">
                      <span>Мягкий</span>
                      <span>Строгий</span>
                    </div>
                  </div>

                  <button 
                    onClick={handleAnalyze}
                    disabled={!file || isProcessing}
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-indigo-600/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                  >
                    {isProcessing ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /> Обработка...</>
                    ) : (
                      <><Play className="w-5 h-5 fill-current" /> Анализировать</>
                    )}
                  </button>

                  {processingError && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3 text-red-400"
                    >
                      <AlertCircle className="w-5 h-5 shrink-0" />
                      <p className="text-xs font-medium leading-relaxed">{processingError}</p>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Right Column: Results */}
              <div className="lg:col-span-7 space-y-6">
                <AnimatePresence mode="wait">
                  {!resultImage ? (
                    <motion.div 
                      key="placeholder"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="aspect-video bg-white/5 border border-white/10 rounded-[2rem] flex flex-col items-center justify-center text-zinc-600 border-dashed"
                    >
                      <ImageIcon className="w-16 h-16 mb-4 opacity-20" />
                      <p className="font-bold uppercase tracking-widest text-xs opacity-40">Ожидание анализа</p>
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="result"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="space-y-6"
                    >
                      <div className="relative group rounded-[2rem] overflow-hidden border border-white/10 bg-black shadow-2xl ring-1 ring-white/5">
                        <img 
                          src={resultImage} 
                          alt="Detected Objects" 
                          className="w-full h-auto"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute top-6 right-6 flex gap-2">
                          <button 
                            onClick={downloadResult}
                            className="p-3 bg-black/60 hover:bg-black/90 backdrop-blur-xl rounded-2xl text-white transition-all hover:scale-110 active:scale-90"
                            title="Скачать результат"
                          >
                            <Download className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={resetFile}
                            className="p-3 bg-black/60 hover:bg-black/90 backdrop-blur-xl rounded-2xl text-white transition-all hover:scale-110 active:scale-90"
                            title="Закрыть"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      {Object.keys(detectedObjects).length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {Object.entries(detectedObjects).map(([key, count], idx) => {
                            const config = OBJECT_CONFIG[key.toLowerCase()] || { emoji: '📦', color: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30', label: key };
                            return (
                              <motion.div 
                                key={key}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className={`p-4 rounded-2xl border ${config.color} flex items-center justify-between group hover:brightness-110 transition-all`}
                              >
                                <div className="flex items-center gap-3">
                                  <span className="text-2xl">{config.emoji}</span>
                                  <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">{config.label}</p>
                                    <p className="text-xl font-black">{count}</p>
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-8 bg-white/5 border border-white/10 rounded-3xl text-center text-zinc-500">
                          Объекты не обнаружены. Попробуйте снизить порог Confidence.
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 text-zinc-600 text-xs font-bold uppercase tracking-widest">
        <p>© 2024 ObjectTracker AI • Senior Edition</p>
        <div className="flex items-center gap-8">
          <span className="hover:text-zinc-400 cursor-pointer transition-colors">Документация</span>
          <span className="hover:text-zinc-400 cursor-pointer transition-colors">API</span>
          <span className="hover:text-zinc-400 cursor-pointer transition-colors">Поддержка</span>
        </div>
      </footer>
    </div>
  );
}
