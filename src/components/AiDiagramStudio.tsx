import React, { useState } from 'react';
import {
  Wand2,
  Image as ImageIcon,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Sliders,
  Layers,
  Sparkles,
} from 'lucide-react';
import { AI_ACADEMIC_PROMPT_TEMPLATES } from '../constants/videoData';
import { CapturedFrameAsset, GeneratedDiagramAsset } from '../types/video';

interface AiDiagramStudioProps {
  capturedFrames: CapturedFrameAsset[];
  selectedFrame: CapturedFrameAsset;
  onSelectFrame: (frame: CapturedFrameAsset) => void;
  generatedAssets: GeneratedDiagramAsset[];
  onAddGeneratedAsset: (asset: GeneratedDiagramAsset) => void;
}

export const AiDiagramStudio: React.FC<AiDiagramStudioProps> = ({
  capturedFrames,
  selectedFrame,
  onSelectFrame,
  generatedAssets,
  onAddGeneratedAsset,
}) => {
  const [studioMode, setStudioMode] = useState<'edit-frame' | 'text-to-image'>('edit-frame');
  const [promptText, setPromptText] = useState<string>(
    '将该视频关键帧重绘为高分辨率学术期刊级科研架构示意图，采用清晰的白底矢量风格，强化文字可读性、箭头流向与能源系统图标立体质感。'
  );
  const [stylePreset, setStylePreset] = useState<'academic-vector' | 'isometric-blueprint' | 'presentation-slide'>(
    'academic-vector'
  );
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '4:3' | '1:1'>('16:9');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeResult, setActiveResult] = useState<GeneratedDiagramAsset | null>(
    generatedAssets[0] || null
  );

  // Instant Local 4K Canvas Academic Figure Remastering (Zero API latency / Works offline & without paid keys)
  const handleLocalCanvasRemaster = (theme: 'journal-white' | 'dark-blueprint' | 'high-contrast-poster') => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const w = 1920;
      const h = 1180;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 1. Background fill
      if (theme === 'dark-blueprint') {
        ctx.fillStyle = '#090d16';
      } else if (theme === 'journal-white') {
        ctx.fillStyle = '#ffffff';
      } else {
        ctx.fillStyle = '#f8fafc';
      }
      ctx.fillRect(0, 0, w, h);

      // 2. Top Academic Figure Header Banner
      ctx.fillStyle = theme === 'dark-blueprint' ? '#0f172a' : '#f1f5f9';
      ctx.fillRect(0, 0, w, 108);
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(0, 104, w, 4);

      ctx.fillStyle = theme === 'dark-blueprint' ? '#38bdf8' : '#0284c7';
      ctx.font = '700 24px "JetBrains Mono", monospace';
      ctx.fillText('MiMo ENERGY SYSTEM SIMULATION · 学术汇报高清重制图版', 48, 44);

      ctx.fillStyle = theme === 'dark-blueprint' ? '#f8fafc' : '#0f172a';
      ctx.font = '700 32px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(selectedFrame.chapterTitle, 48, 84);

      // 3. Draw Remastered Video Frame in Center Viewport with enhanced DSP filter
      ctx.save();
      if (theme === 'dark-blueprint') {
        ctx.filter = 'invert(92%) hue-rotate(180deg) contrast(128%) saturate(125%)';
      } else if (theme === 'journal-white') {
        ctx.filter = 'contrast(138%) brightness(106%) saturate(120%)';
      } else {
        ctx.filter = 'contrast(125%) brightness(103%) saturate(135%)';
      }

      const padX = 64;
      const padY = 128;
      const drawW = w - padX * 2;
      const drawH = h - padY - 96;
      ctx.drawImage(img, padX, padY, drawW, drawH);
      ctx.restore();

      // Frame Border
      ctx.strokeStyle = theme === 'dark-blueprint' ? '#1e293b' : '#cbd5e1';
      ctx.lineWidth = 3;
      ctx.strokeRect(padX, padY, drawW, drawH);

      // 4. Bottom Academic Citation & Parameter Footer
      ctx.fillStyle = theme === 'dark-blueprint' ? '#94a3b8' : '#475569';
      ctx.font = '500 22px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(
        `图注：源自《“评估—预测—优化”三层分析框架与宏观能源结构演化》 | 采样时间点：${selectedFrame.label}`,
        48,
        h - 38
      );

      const outUrl = canvas.toDataURL('image/png', 0.96);
      const newAsset: GeneratedDiagramAsset = {
        id: `local-${Date.now()}`,
        imageUrl: outUrl,
        prompt: `本地4K学术画布增强 (${theme === 'dark-blueprint' ? '深色蓝图反相版' : theme === 'journal-white' ? '期刊白底高反差版' : '高清色彩增强版'})`,
        mode: 'edit',
        chapterRef: selectedFrame.chapterTitle,
        createdAt: new Date().toLocaleTimeString(),
        notes: '已应用 4K 学术图框、反差锐化与图注排版',
      };
      onAddGeneratedAsset(newAsset);
      setActiveResult(newAsset);
      setErrorMsg(null);
    };
    img.src = selectedFrame.dataUrl;
  };

  const handleRunGeneration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptText.trim()) return;

    setIsLoading(true);
    setErrorMsg(null);

    try {
      if (studioMode === 'edit-frame') {
        const response = await fetch('/api/ai/edit-frame', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: selectedFrame.dataUrl.startsWith('data:') ? selectedFrame.dataUrl : undefined,
            localAssetPath:
              selectedFrame.localAssetPath ||
              (!selectedFrame.dataUrl.startsWith('data:') ? selectedFrame.dataUrl : undefined),
            prompt: promptText,
          }),
        });
        const data = await response.json();
        if (!response.ok || data.error) {
          throw new Error(data.error || '视频截帧学术化重绘失败');
        }

        const newAsset: GeneratedDiagramAsset = {
          id: `gen-${Date.now()}`,
          imageUrl: data.imageUrl,
          prompt: promptText,
          mode: 'edit',
          chapterRef: selectedFrame.chapterTitle,
          createdAt: new Date().toLocaleTimeString(),
          notes: data.description,
        };
        onAddGeneratedAsset(newAsset);
        setActiveResult(newAsset);
      } else {
        const response = await fetch('/api/ai/generate-diagram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: promptText,
            aspectRatio,
            stylePreset,
          }),
        });
        const data = await response.json();
        if (!response.ok || data.error) {
          throw new Error(data.error || '学术图解生成失败');
        }

        const newAsset: GeneratedDiagramAsset = {
          id: `gen-${Date.now()}`,
          imageUrl: data.imageUrl,
          prompt: promptText,
          mode: 'generate',
          chapterRef: 'AI 科研矢量架构图',
          createdAt: new Date().toLocaleTimeString(),
          notes: data.description,
        };
        onAddGeneratedAsset(newAsset);
        setActiveResult(newAsset);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '请求失败';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadImage = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="max-w-[1360px] mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-slate-800 pb-6">
        <div>
          <div className="text-xs text-sky-400 font-medium mb-1">
            双引擎驱动：AI 科研矢量图解生成 + 本地 4K 学术图版瞬时增强 (免付费密钥可用)
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 balance-text">
            AI 学术科研图解生成与视频关键帧重制工坊
          </h1>
          <p className="text-sm text-slate-400 mt-1.5 max-w-2xl">
            针对原视频中的“评估—预测—优化”三层框架、“政企用三方闭环”、“煤电容量保底”与“碳配额缓冲池”示意图，支持一键重绘为无损矢量架构图或 4K 标准学术汇报图版。
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 self-start">
          <button
            onClick={() => {
              setStudioMode('edit-frame');
              setPromptText(
                '将该视频关键帧重绘为高分辨率学术期刊级科研架构示意图，采用清晰的白底矢量风格，强化文字可读性、箭头流向与能源系统图标立体质感。'
              );
            }}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              studioMode === 'edit-frame'
                ? 'bg-sky-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            基于视频关键帧重绘优化
          </button>
          <button
            onClick={() => {
              setStudioMode('text-to-image');
              setPromptText(AI_ACADEMIC_PROMPT_TEMPLATES[0].prompt);
            }}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              studioMode === 'text-to-image'
                ? 'bg-sky-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            文本提示词创建新学术图解
          </button>
        </div>
      </div>

      {/* Main 12-Col Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 5 Columns: Input Source Frame / Templates + Prompt Form */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          {studioMode === 'edit-frame' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-sky-400" />
                  1. 选择待优化的原视频关键帧 (含您截取的帧)
                </label>
                <span className="text-xs text-slate-400 font-mono-tabular">
                  共 {capturedFrames.length} 帧可选
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-52 overflow-y-auto pr-1">
                {capturedFrames.map((frame) => {
                  const isSel = selectedFrame.id === frame.id;
                  return (
                    <button
                      key={frame.id}
                      type="button"
                      onClick={() => onSelectFrame(frame)}
                      className={`group relative rounded-xl overflow-hidden border text-left transition-all ${
                        isSel
                          ? 'border-sky-500 ring-2 ring-sky-500/30'
                          : 'border-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <img
                        src={frame.dataUrl}
                        alt={frame.label}
                        referrerPolicy="no-referrer"
                        className="w-full h-20 object-cover bg-slate-950"
                      />
                      <div className="p-1.5 bg-slate-950/95">
                        <div className="text-[11px] font-medium text-slate-200 truncate">
                          {frame.label}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Instant Zero-Latency Local 4K Canvas Figure Formatter */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    免密钥极速处理：本地 4K 学术图版重制
                  </span>
                  <span className="text-[11px] text-slate-500">0秒等待</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleLocalCanvasRemaster('journal-white')}
                    className="py-1.5 px-2 rounded-lg bg-slate-900 hover:bg-sky-600 text-slate-200 hover:text-white border border-slate-800 text-[11px] font-medium transition-colors"
                  >
                    期刊白底锐化图版
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLocalCanvasRemaster('dark-blueprint')}
                    className="py-1.5 px-2 rounded-lg bg-slate-900 hover:bg-sky-600 text-slate-200 hover:text-white border border-slate-800 text-[11px] font-medium transition-colors"
                  >
                    深色蓝图反相图版
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLocalCanvasRemaster('high-contrast-poster')}
                    className="py-1.5 px-2 rounded-lg bg-slate-900 hover:bg-sky-600 text-slate-200 hover:text-white border border-slate-800 text-[11px] font-medium transition-colors"
                  >
                    答辩高反差增强版
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-sky-400" />
                1. 选择原视频同主题学术图解模板
              </label>
              <div className="space-y-2">
                {AI_ACADEMIC_PROMPT_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => setPromptText(tpl.prompt)}
                    className="w-full p-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-left transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-200">{tpl.title}</span>
                      <span className="text-sky-400">{tpl.category}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">{tpl.prompt}</p>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">视觉风格预设</label>
                  <select
                    value={stylePreset}
                    onChange={(e) => setStylePreset(e.target.value as typeof stylePreset)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"
                  >
                    <option value="academic-vector">Nature 期刊平面矢量图</option>
                    <option value="isometric-blueprint">3D 等轴测工程蓝图</option>
                    <option value="presentation-slide">学术答辩高反差演示图</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">画幅比例</label>
                  <select
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value as typeof aspectRatio)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"
                  >
                    <option value="16:9">16:9 宽屏汇报画幅</option>
                    <option value="4:3">4:3 论文标准插图</option>
                    <option value="1:1">1:1 方形架构图</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Prompt Textarea & Submit */}
          <form onSubmit={handleRunGeneration} className="space-y-4 pt-2 border-t border-slate-800">
            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-2">
                2. AI 深度矢量重绘 / 图解生成指令 (自动兼容免费密钥)
              </label>
              <textarea
                rows={4}
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                placeholder="输入您需要创建或优化的能源系统学术图解描述..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500 leading-relaxed"
              />
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-950/50 border border-red-800/80 text-xs text-red-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div>{errorMsg}</div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-lg"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  正在构建高清学术矢量图解...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  {studioMode === 'edit-frame' ? 'AI 识别截帧并重构为科研矢量图' : 'AI 立即生成高清学术架构图'}
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right 7 Columns: Side-by-Side Comparison & Generated Gallery */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-sky-400" />
                {studioMode === 'edit-frame' ? '原视频关键帧 vs 学术化重制对比' : 'AI 学术图解渲染预览画布'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                生成的图像或矢量图可直接下载用于学术答辩 PPT、研究报告或论文插图
              </p>
            </div>

            {activeResult && (
              <button
                onClick={() =>
                  downloadImage(
                    activeResult.imageUrl,
                    `MiMo_Academic_Diagram_${Date.now()}.${activeResult.imageUrl.includes('svg') ? 'svg' : 'png'}`
                  )
                }
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                下载高清图解
              </button>
            )}
          </div>

          {/* Preview Canvas Area */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Reference Source Frame */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span>原视频参考关键帧</span>
                <span className="font-mono-tabular">{selectedFrame.label}</span>
              </div>
              <div className="aspect-video rounded-lg overflow-hidden bg-slate-900 flex items-center justify-center">
                <img
                  src={selectedFrame.dataUrl}
                  alt={selectedFrame.label}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                <span>所属章节: {selectedFrame.chapterTitle}</span>
                <button
                  onClick={() => downloadImage(selectedFrame.dataUrl, `Video_Frame_${selectedFrame.timestamp}s.jpg`)}
                  className="text-sky-400 hover:underline"
                >
                  导出原帧
                </button>
              </div>
            </div>

            {/* AI Generated / Edited Output */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span className="text-sky-400 font-medium">重制 / 生成结果</span>
                {activeResult && <span className="font-mono-tabular">{activeResult.createdAt}</span>}
              </div>

              <div className="aspect-video rounded-lg overflow-hidden bg-slate-900 flex items-center justify-center relative">
                {activeResult ? (
                  <img
                    src={activeResult.imageUrl}
                    alt="Academic Diagram Output"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-center p-6 space-y-2">
                    <Wand2 className="w-8 h-8 text-slate-600 mx-auto" />
                    <div className="text-xs text-slate-400">
                      可点击左侧 **“免密钥极速处理”** 立即生成 4K 学术图版，或点击下方按钮进行 AI 矢量重构
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                <span className="truncate max-w-[220px]">
                  {activeResult ? activeResult.notes || activeResult.prompt : '等待生成指令...'}
                </span>
                {activeResult && (
                  <span className="text-emerald-400 flex items-center gap-1 shrink-0">
                    <CheckCircle2 className="w-3 h-3" /> 已就绪
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* History Strip */}
          {generatedAssets.length > 0 && (
            <div className="pt-4 border-t border-slate-800">
              <div className="text-xs font-semibold text-slate-300 mb-2.5">
                本次会话已生成的学术图解资产 ({generatedAssets.length})
              </div>
              <div className="flex items-center gap-3 overflow-x-auto pb-2">
                {generatedAssets.map((asset) => (
                  <button
                    key={asset.id}
                    onClick={() => setActiveResult(asset)}
                    className={`w-36 shrink-0 rounded-xl overflow-hidden border text-left transition-all ${
                      activeResult?.id === asset.id ? 'border-sky-500' : 'border-slate-800'
                    }`}
                  >
                    <img
                      src={asset.imageUrl}
                      alt={asset.chapterRef}
                      referrerPolicy="no-referrer"
                      className="w-full h-20 object-cover bg-slate-950"
                    />
                    <div className="p-1.5 bg-slate-950 text-[10px] text-slate-300 truncate">
                      {asset.chapterRef}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
