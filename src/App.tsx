import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Camera,
  Columns,
  Volume2,
  VolumeX,
  Maximize,
  Repeat,
  RotateCcw,
  BookOpen,
  MessageSquare,
  Download,
  Wand2,
  Box,
  BarChart2,
  Check,
} from 'lucide-react';
import {
  DEFAULT_VIDEO_PATH,
  FALLBACK_VIDEO_PATHS,
  ACADEMIC_CHAPTERS,
  ACADEMIC_VIDEO_FILTERS,
  MIMO_SCENARIOS,
  ENERGY_SOURCES,
  PRESET_CAPTURED_FRAMES,
  getAssetUrl,
} from './constants/videoData';
import {
  WorkspaceTab,
  ScenarioId,
  SimulationYear,
  AcademicVideoFilter,
  CapturedFrameAsset,
  GeneratedDiagramAsset,
} from './types/video';
import { ThreeEnergySandbox } from './components/ThreeEnergySandbox';
import { ScenarioComparisonView } from './components/ScenarioComparisonView';
import { AiDiagramStudio } from './components/AiDiagramStudio';

export default function App() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('player2d');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);

  // Playback states & Loading error recovery
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(167.88);
  const [volume, setVolume] = useState<number>(0.9);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [videoLoaded, setVideoLoaded] = useState<boolean>(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [currentVideoSrc, setCurrentVideoSrc] = useState<string>(DEFAULT_VIDEO_PATH);

  // Academic Filter & Split-Screen states
  const [activeFilter, setActiveFilter] = useState<AcademicVideoFilter>(ACADEMIC_VIDEO_FILTERS[0]);
  const [splitScreen, setSplitScreen] = useState<boolean>(false);
  const [splitPos, setSplitPos] = useState<number>(50);
  const isDraggingSplitRef = useRef<boolean>(false);

  // A-B Repeat Loop
  const [loopA, setLoopA] = useState<number | null>(null);
  const [loopB, setLoopB] = useState<number | null>(null);

  // Synchronized MiMo Scenario & Year
  const [activeScenarioId, setActiveScenarioId] = useState<ScenarioId>('bau');
  const [activeYear, setActiveYear] = useState<SimulationYear>(2030);

  // Captured Frames & AI Generated Assets
  const [capturedFrames, setCapturedFrames] = useState<CapturedFrameAsset[]>(PRESET_CAPTURED_FRAMES);
  const [selectedFrame, setSelectedFrame] = useState<CapturedFrameAsset>(PRESET_CAPTURED_FRAMES[3]);
  const [generatedAssets, setGeneratedAssets] = useState<GeneratedDiagramAsset[]>([]);
  const [captureToast, setCaptureToast] = useState<string | null>(null);

  // AI Chapter Defense Q&A
  const [aiQuestion, setAiQuestion] = useState<string>('');
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [isAiExplaining, setIsAiExplaining] = useState<boolean>(false);

  // Export Report Modal
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [copiedReport, setCopiedReport] = useState<boolean>(false);

  // Determine current chapter from currentTime
  const activeChapter =
    ACADEMIC_CHAPTERS.find((ch) => currentTime >= ch.timestamp && currentTime < ch.endTime) ||
    ACADEMIC_CHAPTERS[0];

  // Automatically sync scenario & year when video crosses into a simulation chapter
  useEffect(() => {
    if (activeChapter.scenarioId) {
      setActiveScenarioId(activeChapter.scenarioId);
    }
    if (activeChapter.defaultYear) {
      setActiveYear(activeChapter.defaultYear);
    }
  }, [activeChapter.id]);

  // Video event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      if (loopA !== null && loopB !== null && loopB > loopA) {
        if (video.currentTime >= loopB || video.currentTime < loopA) {
          video.currentTime = loopA;
          video.play().catch(() => {});
        }
      }
    };

    const handleLoadedMetadata = () => {
      if (video.duration && !isNaN(video.duration)) {
        setDuration(video.duration);
      }
      setVideoLoaded(true);
      setVideoError(null);
    };

    const handleCanPlay = () => {
      setVideoLoaded(true);
      setVideoError(null);
    };

    const handleError = () => {
      const err = video.error;
      console.warn('Video failed to load from:', currentVideoSrc, err);
      // Try next fallback path if available
      const currentIndex = FALLBACK_VIDEO_PATHS.indexOf(currentVideoSrc);
      if (currentIndex !== -1 && currentIndex + 1 < FALLBACK_VIDEO_PATHS.length) {
        const nextSrc = FALLBACK_VIDEO_PATHS[currentIndex + 1];
        console.log('Switching to fallback video path:', nextSrc);
        setCurrentVideoSrc(nextSrc);
        video.src = nextSrc;
        video.load();
      } else {
        setVideoError('视频源加载中或解码等待中，请点击下方刷新重载');
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('error', handleError);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('error', handleError);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [loopA, loopB, currentVideoSrc]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch((err) => {
        console.warn('Direct play rejected, attempting muted play:', err);
        video.muted = true;
        setIsMuted(true);
        video.play().catch((finalErr) => {
          console.error('All play attempts failed:', finalErr);
          setVideoError('播放遇到浏览器限制，请再次点击屏幕');
        });
      });
    } else {
      video.pause();
    }
  };

  const seekTo = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    const clamped = Math.max(0, Math.min(seconds, duration));
    video.currentTime = clamped;
    setCurrentTime(clamped);
  };

  const stepFrame = (frames: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    seekTo(video.currentTime + frames * (1 / 30));
  };

  const changePlaybackRate = (rate: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = rate;
    setPlaybackRate(rate);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const handleCaptureFrame = (openAiStudioAfter = false) => {
    const video = videoRef.current;
    if (!video) return;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 3456;
      canvas.height = video.videoHeight || 2160;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (activeFilter.cssFilter && activeFilter.cssFilter !== 'none') {
        ctx.filter = activeFilter.cssFilter;
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      const newFrame: CapturedFrameAsset = {
        id: `cap-${Date.now()}`,
        dataUrl,
        timestamp: Math.round(currentTime * 10) / 10,
        chapterTitle: `${activeChapter.indexNumber}. ${activeChapter.title}`,
        label: `定格帧 (${formatTimecode(currentTime)})`,
        createdAt: new Date().toLocaleTimeString(),
      };

      setCapturedFrames((prev) => [newFrame, ...prev]);
      setSelectedFrame(newFrame);
      setCaptureToast(`已捕获 3.4K 学术关键帧 (${formatTimecode(currentTime)})`);
      setTimeout(() => setCaptureToast(null), 3200);

      if (openAiStudioAfter) {
        setActiveTab('aistudio');
      }
    } catch (e) {
      console.error('Frame capture error:', e);
    }
  };

  const handleAskAiExplanation = async (customPrompt?: string) => {
    setIsAiExplaining(true);
    try {
      const currentSc = MIMO_SCENARIOS[activeScenarioId];
      const snap = currentSc.snapshots[activeYear];
      const response = await fetch('/api/ai/explain-chapter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chapterTitle: `${activeChapter.indexNumber}. ${activeChapter.title}`,
          scenarioName: `${currentSc.code} (${activeYear}年)`,
          question: customPrompt || aiQuestion,
          contextData: {
            policyAdj: snap.policyAdj,
            techMultiplier: snap.techMultiplier,
            grossCo2: snap.grossCo2,
            netCo2: snap.netCo2,
            mix: snap.mix,
          },
        }),
      });
      const data = await response.json();
      if (data.explanation) {
        setAiExplanation(data.explanation);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAiExplaining(false);
    }
  };

  const formatTimecode = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const f = Math.floor((sec % 1) * 30);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}:${f.toString().padStart(2, '0')}`;
  };

  const currentScenario = MIMO_SCENARIOS[activeScenarioId];
  const currentSnapshot = currentScenario.snapshots[activeYear];

  const generateMarkdownBrief = () => {
    return `# “评估—预测—优化”三层分析框架与宏观能源结构演化 (MiMo 闭环仿真汇报简报)

## 一、 顶层方法论与多元主体闭环
1. **三层递进框架**：构建“评估（历史NBS与OWID靶值校准）— 预测（多主体动态仿真）— 优化（政策与技术协同寻优）”三层分析体系。
2. **政—企—用三方博弈**：政府调控碳配额与政策因子 (policy_adj) → 企业调整风光火储投资改变电源结构与发电成本 → 电价信号传导至用户侧 → 涌现宏观能源结构演化。

## 二、 2045年 四大仿真情景核心参数对比
| 情景 | policy_adj | 技术转型倍率 | 煤炭占比 | 光伏占比 | 风电占比 | 净CO2 (亿吨) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| 0: 基准情景 (BAU) | 1.11 | 1.28 | 26% | 43% | 17% | 51.5 |
| 1: 政策强化情景 | 1.15 | 1.39 | 22% | 46% | 18% | 21.4 |
| 2: 极端风险情景 | 0.92 | 1.22 | 29% | 42% | 16% | 33.5 |
| 3: 技术突破情景 | 1.12 | 1.35 | 23% | 47% | 18% | 16.2 |

## 三、 四大核心政策建议
1. **加快新型电力系统建设**：提升高比例新能源并网消纳与跨区输送能力。
2. **推动煤电向支撑调节电源转型**：通过容量电价保底机制保障煤电机组调峰与安全备用收益。
3. **强化绿证与碳市场协同**：打通绿证（GEC）与碳排放权交易（ETS）核算机制。
4. **建立碳配额缓冲池**：构建跨周期配额吞吐调节机制，平抑碳价异常波动。`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Strict 3-Zone Single-Row Top Bar Contract */}
      <header className="flex items-center justify-between gap-8 px-6 py-4 border-b border-slate-800/90 bg-slate-950 sticky top-0 z-30">
        {/* Zone 1: Single text element brand wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('player2d');
          }}
          className="text-lg font-bold tracking-tight text-slate-100 whitespace-nowrap shrink-0"
        >
          MiMo 能源演化展映系统
        </a>

        {/* Zone 2: 4 concise single-line navigation links */}
        <nav className="flex items-center gap-6 text-sm font-medium text-slate-400 overflow-x-auto">
          <button
            onClick={() => setActiveTab('player2d')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'player2d'
                ? 'text-white border-sky-500 font-semibold'
                : 'border-transparent hover:text-slate-200'
            }`}
          >
            2D 精讲放映
          </button>
          <button
            onClick={() => setActiveTab('sandbox3d')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'sandbox3d'
                ? 'text-white border-sky-500 font-semibold'
                : 'border-transparent hover:text-slate-200'
            }`}
          >
            3D 能源沙盘
          </button>
          <button
            onClick={() => setActiveTab('scenarios')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'scenarios'
                ? 'text-white border-sky-500 font-semibold'
                : 'border-transparent hover:text-slate-200'
            }`}
          >
            四情景仿真对比
          </button>
          <button
            onClick={() => setActiveTab('aistudio')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'aistudio'
                ? 'text-white border-sky-500 font-semibold'
                : 'border-transparent hover:text-slate-200'
            }`}
          >
            AI 学术图解工坊
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center shrink-0">
          <button
            onClick={() => setShowExportModal(true)}
            className="px-4 py-2 text-xs font-semibold text-white bg-sky-600 rounded-lg hover:bg-sky-500 transition-colors whitespace-nowrap shrink-0"
          >
            导出答辩简报
          </button>
        </div>
      </header>

      {/* Toast Notification for Snapshot Capture */}
      {captureToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-sky-500 text-slate-100 px-4 py-2.5 rounded-xl shadow-2xl text-xs font-medium flex items-center gap-2">
          <Camera className="w-4 h-4 text-sky-400" />
          <span>{captureToast}</span>
          <button
            onClick={() => setActiveTab('aistudio')}
            className="ml-2 text-sky-400 hover:underline font-semibold"
          >
            前往AI工坊重绘 →
          </button>
        </div>
      )}

      {/* Persistent Video Element kept mounted for seamless 2D/3D VideoTexture sync */}
      <main className="flex-1">
        {/* VIEW 1: 2D Pro Academic Presentation Player + Synchronized Data Deck */}
        <div className={activeTab === 'player2d' ? 'block' : 'hidden'}>
          <div className="max-w-[1400px] mx-auto px-6 py-6 space-y-6">
            {/* Top Workspace Toolbar: Academic Filter Selector + Mode Shortcuts */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-slate-300 mr-1">
                  画质与图表增强预设:
                </span>
                <div className="flex flex-wrap items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                  {ACADEMIC_VIDEO_FILTERS.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setActiveFilter(f)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                        activeFilter.id === f.id
                          ? 'bg-sky-600 text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title={f.description}
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSplitScreen(!splitScreen)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-colors whitespace-nowrap shrink-0 ${
                    splitScreen
                      ? 'bg-sky-600 text-white border-sky-500'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <Columns className="w-3.5 h-3.5" />
                  原画/锐化分屏对比
                </button>

                <button
                  onClick={() => handleCaptureFrame(true)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  截帧并送入AI重绘
                </button>

                <button
                  onClick={() => setActiveTab('sandbox3d')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                >
                  <Box className="w-3.5 h-3.5 text-sky-400" />
                  切换 3D 沙盘同屏推演
                </button>
              </div>
            </div>

            {/* Primary 12-Column Split: Left 7 Cols = Video Stage & Controls, Right 5 Cols = Synchronized Academic Deck */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* Left 7 Columns: 3.4K Academic Video Viewport */}
              <div className="lg:col-span-7 flex flex-col justify-between bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                {/* Video Canvas Container */}
                <div
                  ref={playerContainerRef}
                  className="relative w-full aspect-[8/5] bg-black flex items-center justify-center overflow-hidden group"
                >
                  <video
                    ref={videoRef}
                    src={currentVideoSrc}
                    poster={getAssetUrl('thumbnails/thumb_0s.jpg')}
                    preload="auto"
                    playsInline
                    crossOrigin="anonymous"
                    onClick={togglePlay}
                    className="w-full h-full object-contain cursor-pointer"
                    style={!splitScreen ? { filter: activeFilter.cssFilter } : {}}
                  >
                    <source src={currentVideoSrc} type="video/mp4" />
                    <source src="/video.mp4" type="video/mp4" />
                    <source src="/api/video" type="video/mp4" />
                    <source src="/assets/video.mp4" type="video/mp4" />
                    <source src="/assets/aistudio/_______________________87599efc.mp4" type="video/mp4" />
                    您的浏览器暂不支持 HTML5 MP4 视频播放
                  </video>

                  {/* Video Loading Error / Fallback Recovery Overlay */}
                  {videoError && (
                    <div className="absolute inset-0 z-30 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center space-y-3">
                      <div className="text-amber-400 text-sm font-semibold flex items-center gap-2">
                        <span>{videoError}</span>
                      </div>
                      <p className="text-xs text-slate-400 max-w-md">
                        已为您准备多条备用学术视频流路由（HTTP 206 流式分块传输与本地解码），可直接点击下方按钮切换或重载：
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                        {FALLBACK_VIDEO_PATHS.map((p, idx) => (
                          <button
                            key={p}
                            onClick={() => {
                              setCurrentVideoSrc(p);
                              setVideoError(null);
                              if (videoRef.current) {
                                videoRef.current.src = p;
                                videoRef.current.load();
                                videoRef.current.play().catch(() => {});
                              }
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-mono-tabular transition-colors ${
                              currentVideoSrc === p
                                ? 'bg-sky-600 text-white font-semibold'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            源 0{idx + 1} ({p.split('/').pop() || '流式'})
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Split-Screen Comparison Overlay */}
                  {splitScreen && (
                    <>
                      <div
                        className="absolute inset-0 pointer-events-none overflow-hidden"
                        style={{ clipPath: `inset(0 ${100 - splitPos}% 0 0)` }}
                      >
                        <div className="w-full h-full bg-transparent" style={{ backdropFilter: activeFilter.cssFilter }}>
                          <div className="absolute top-3 left-3 bg-sky-600 text-white text-xs px-2.5 py-1 rounded font-medium">
                            增强模式: {activeFilter.name}
                          </div>
                        </div>
                      </div>
                      <div
                        className="absolute inset-y-0 z-20 flex items-center cursor-ew-resize"
                        style={{ left: `${splitPos}%` }}
                        onMouseDown={() => {
                          isDraggingSplitRef.current = true;
                          const onMove = (e: MouseEvent) => {
                            if (!isDraggingSplitRef.current || !playerContainerRef.current) return;
                            const rect = playerContainerRef.current.getBoundingClientRect();
                            const pct = Math.max(5, Math.min(95, ((e.clientX - rect.left) / rect.width) * 100));
                            setSplitPos(pct);
                          };
                          const onUp = () => {
                            isDraggingSplitRef.current = false;
                            window.removeEventListener('mousemove', onMove);
                            window.removeEventListener('mouseup', onUp);
                          };
                          window.addEventListener('mousemove', onMove);
                          window.addEventListener('mouseup', onUp);
                        }}
                      >
                        <div className="w-0.5 h-full bg-sky-400" />
                        <div className=" -ml-3.5 w-7 h-7 rounded-full bg-white text-slate-900 flex items-center justify-center shadow-lg border-2 border-sky-500">
                          <Columns className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Center Play Button Overlay when paused */}
                  {!isPlaying && (
                    <button
                      onClick={togglePlay}
                      className="absolute z-10 w-16 h-16 rounded-full bg-sky-600/95 hover:bg-sky-500 text-white flex items-center justify-center shadow-2xl transition-transform hover:scale-105"
                      aria-label="播放视频"
                    >
                      <Play className="w-7 h-7 fill-white translate-x-0.5" />
                    </button>
                  )}

                  {/* Top-left Chapter Overlay Scrim */}
                  <div className="absolute top-3 left-3 pointer-events-none bg-slate-950/85 border border-slate-800 px-3 py-1.5 rounded-lg text-xs text-slate-200">
                    <span className="text-sky-400 font-mono-tabular font-semibold mr-1.5">
                      章节 {activeChapter.indexNumber}
                    </span>
                    <span>{activeChapter.title}</span>
                  </div>
                </div>

                {/* Scrubber & Precision Transport Bar */}
                <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-3">
                  {/* Timeline Progress Bar with Chapter Ticks */}
                  <div
                    className="relative w-full h-3 flex items-center cursor-pointer group"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                      seekTo(pct * duration);
                    }}
                  >
                    <div className="w-full h-1.5 group-hover:h-2.5 bg-slate-800 rounded-full overflow-hidden transition-all">
                      <div
                        className="h-full bg-sky-500"
                        style={{ width: `${(currentTime / duration) * 100}%` }}
                      />
                    </div>

                    {/* A-B Repeat Range Highlight */}
                    {loopA !== null && (
                      <div
                        className="absolute h-2.5 bg-emerald-500/40 border-y border-emerald-400 pointer-events-none"
                        style={{
                          left: `${(loopA / duration) * 100}%`,
                          width: `${(((loopB !== null ? loopB : currentTime) - loopA) / duration) * 100}%`,
                        }}
                      />
                    )}

                    {/* Chapter Markers */}
                    {ACADEMIC_CHAPTERS.map((ch) => (
                      <div
                        key={ch.id}
                        className="absolute top-1/2 -translate-y-1/2 w-1 h-3 bg-amber-400 rounded-xs"
                        style={{ left: `${(ch.timestamp / duration) * 100}%` }}
                        title={`${ch.indexNumber}. ${ch.title}`}
                      />
                    ))}
                  </div>

                  {/* Transport Controls Row */}
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={togglePlay}
                        className="p-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white transition-colors"
                        title="播放 / 暂停"
                      >
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </button>

                      {/* Frame Stepping */}
                      <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                        <button
                          onClick={() => stepFrame(-1)}
                          className="p-1 hover:text-white text-slate-400"
                          title="后退1帧 (1/30s)"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-1.5 text-[11px] text-slate-400 font-mono-tabular">逐帧</span>
                        <button
                          onClick={() => stepFrame(1)}
                          className="p-1 hover:text-white text-slate-400"
                          title="前进1帧 (1/30s)"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="font-mono-tabular text-slate-200">
                        <span className="font-semibold text-white">{formatTimecode(currentTime)}</span>
                        <span className="text-slate-500 mx-1">/</span>
                        <span className="text-slate-400">{formatTimecode(duration)}</span>
                      </div>

                      {/* A-B Loop */}
                      <div className="hidden sm:flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1">
                        <Repeat className="w-3 h-3 text-emerald-400 mr-0.5" />
                        <button
                          onClick={() => setLoopA(currentTime)}
                          className="text-[11px] font-mono-tabular text-slate-300 hover:text-white"
                        >
                          {loopA !== null ? `A:${Math.round(loopA)}s` : '设A点'}
                        </button>
                        <span className="text-slate-600">·</span>
                        <button
                          onClick={() => setLoopB(currentTime)}
                          className="text-[11px] font-mono-tabular text-slate-300 hover:text-white"
                        >
                          {loopB !== null ? `B:${Math.round(loopB)}s` : '设B点'}
                        </button>
                        {(loopA !== null || loopB !== null) && (
                          <button
                            onClick={() => {
                              setLoopA(null);
                              setLoopB(null);
                            }}
                            className="text-slate-500 hover:text-red-400 ml-1"
                          >
                            <RotateCcw className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Speed */}
                      <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                        {[0.5, 1.0, 1.25, 1.5, 2.0].map((r) => (
                          <button
                            key={r}
                            onClick={() => changePlaybackRate(r)}
                            className={`px-1.5 py-0.5 rounded text-[11px] font-mono-tabular ${
                              playbackRate === r
                                ? 'bg-sky-600 text-white font-semibold'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {r}x
                          </button>
                        ))}
                      </div>

                      {/* Snapshot */}
                      <button
                        onClick={() => handleCaptureFrame(false)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 flex items-center gap-1 whitespace-nowrap"
                        title="保存4K无损快照"
                      >
                        <Camera className="w-3.5 h-3.5 text-sky-400" />
                        快照
                      </button>

                      {/* Mute & Volume */}
                      <button
                        onClick={toggleMute}
                        className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
                      >
                        {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      </button>

                      {/* Fullscreen */}
                      <button
                        onClick={() => {
                          if (playerContainerRef.current) {
                            if (!document.fullscreenElement) {
                              playerContainerRef.current.requestFullscreen().catch(() => {});
                            } else {
                              document.exitFullscreen().catch(() => {});
                            }
                          }
                        }}
                        className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
                        title="全屏放映"
                      >
                        <Maximize className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right 5 Columns: Synchronized Academic Lecture & Data Deck */}
              <div className="lg:col-span-5 flex flex-col justify-between bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
                <div className="space-y-4">
                  {/* Chapter Kicker & Metadata (Unboxed text with · separators) */}
                  <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sky-400 font-semibold">{activeChapter.sectionCategory}</span>
                      <span>·</span>
                      <span className="font-mono-tabular">
                        {formatTimecode(activeChapter.timestamp)} — {formatTimecode(activeChapter.endTime)}
                      </span>
                    </div>
                    <span className="font-mono-tabular text-slate-300">
                      {currentScenario.code}
                    </span>
                  </div>

                  <div>
                    <h2 className="text-xl font-bold text-slate-100 balance-text">
                      {activeChapter.indexNumber}. {activeChapter.title}
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">{activeChapter.subtitle}</p>
                  </div>

                  {/* Formula / Core Parameter Callout */}
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 font-mono-tabular text-xs text-sky-300">
                    {activeChapter.keyFormulaOrMetric}
                  </div>

                  {/* Academic Standard Script */}
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-sky-400" />
                      同步学术精讲口播稿
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80">
                      {activeChapter.academicScript}
                    </p>
                  </div>

                  {/* Key Analytical Takeaways */}
                  <div className="space-y-1.5">
                    <div className="text-xs font-semibold text-slate-200">核心论证要点：</div>
                    <ul className="space-y-1.5 text-xs text-slate-300">
                      {activeChapter.bulletPoints.map((pt, i) => (
                        <li key={i} className="flex items-start gap-2 leading-relaxed">
                          <span className="font-mono-tabular text-sky-400 font-semibold">0{i + 1}.</span>
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Live Synchronized Mini Energy Structure Bar */}
                  <div className="pt-2 border-t border-slate-800">
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                        <BarChart2 className="w-3.5 h-3.5 text-emerald-400" />
                        同步仿真截面：{currentScenario.name} ({activeYear}年)
                      </span>
                      <button
                        onClick={() => setActiveTab('scenarios')}
                        className="text-sky-400 hover:underline text-[11px]"
                      >
                        展开完整数据 →
                      </button>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-center font-mono-tabular">
                      {(['solar', 'coal', 'wind', 'hydro'] as const).map((k) => {
                        const meta = ENERGY_SOURCES.find((e) => e.key === k)!;
                        const val = currentSnapshot.mix[k];
                        return (
                          <div key={k} className="bg-slate-950 border border-slate-800 rounded-lg p-2">
                            <div className="text-[11px] text-slate-400 font-sans">{meta.name}</div>
                            <div className="text-sm font-bold mt-0.5" style={{ color: meta.color }}>
                              {val}%
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* AI Academic Defense Q&A Box */}
                <div className="pt-3 border-t border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
                      AI 答辩专家问答与深度解析 (gemini-3.8-flash)
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        handleAskAiExplanation(
                          `针对“${activeChapter.title}”，请给出一段用于学术委员会答辩的深度理论阐释，并预测1个专家尖锐提问及回答。`
                        )
                      }
                      disabled={isAiExplaining}
                      className="text-[11px] text-sky-400 hover:text-sky-300 font-medium"
                    >
                      {isAiExplaining ? '正在生成解析...' : '一键生成本章答辩问答'}
                    </button>
                  </div>

                  {aiExplanation && (
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-300 max-h-36 overflow-y-auto whitespace-pre-line leading-relaxed">
                      {aiExplanation}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom 7-Chapter Interactive Storyboard Timeline */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-100">
                    全片 7 大学术章节导览 (点击卡片即刻定位视频时间轴与仿真参数)
                  </h3>
                  <p className="text-xs text-slate-400">
                    涵盖“评估—预测—优化”三层框架、政企用三方闭环、四大 MiMo 仿真情景与四项政策建议
                  </p>
                </div>
                <span className="text-xs font-mono-tabular text-slate-400">
                  总时长 02:47.88 · 3456×2160
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
                {ACADEMIC_CHAPTERS.map((ch) => {
                  const isCurrent = activeChapter.id === ch.id;
                  return (
                    <button
                      key={ch.id}
                      onClick={() => {
                        seekTo(ch.timestamp + 0.5);
                        if (ch.scenarioId) setActiveScenarioId(ch.scenarioId);
                        if (ch.defaultYear) setActiveYear(ch.defaultYear);
                      }}
                      className={`group rounded-xl overflow-hidden border text-left transition-all flex flex-col justify-between ${
                        isCurrent
                          ? 'bg-sky-950/40 border-sky-500 shadow-lg'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="relative aspect-video bg-slate-900 overflow-hidden">
                          <img
                            src={ch.thumbnailUrl}
                            alt={ch.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute bottom-1.5 right-1.5 bg-slate-950/90 text-slate-200 text-[10px] font-mono-tabular px-1.5 py-0.5 rounded">
                            {Math.floor(ch.timestamp / 60)}:{(ch.timestamp % 60).toString().padStart(2, '0')}
                          </div>
                        </div>
                        <div className="p-2.5">
                          <div className="text-[11px] font-mono-tabular text-sky-400 font-semibold">
                            {ch.indexNumber} · {ch.sectionCategory}
                          </div>
                          <div className="text-xs font-bold text-slate-100 line-clamp-2 mt-0.5">
                            {ch.title}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* VIEW 2: Three.js 3D Interactive Energy System Digital Sandbox */}
        {activeTab === 'sandbox3d' && (
          <ThreeEnergySandbox
            videoRef={videoRef}
            activeScenarioId={activeScenarioId}
            activeYear={activeYear}
            onSelectScenario={setActiveScenarioId}
            onSelectYear={setActiveYear}
            onSeekVideo={seekTo}
            isPlaying={isPlaying}
            onTogglePlay={togglePlay}
          />
        )}

        {/* VIEW 3: 4-Scenario Simulation Interactive Comparison Lab */}
        {activeTab === 'scenarios' && (
          <ScenarioComparisonView
            activeScenarioId={activeScenarioId}
            activeYear={activeYear}
            onSelectScenario={setActiveScenarioId}
            onSelectYear={setActiveYear}
            onJumpToVideoTimestamp={(seconds, sid, yr) => {
              setActiveScenarioId(sid);
              setActiveYear(yr);
              seekTo(seconds);
              setActiveTab('player2d');
            }}
          />
        )}

        {/* VIEW 4: AI Academic Diagram Generation & Frame Remastering Studio */}
        {activeTab === 'aistudio' && (
          <AiDiagramStudio
            capturedFrames={capturedFrames}
            selectedFrame={selectedFrame}
            onSelectFrame={setSelectedFrame}
            generatedAssets={generatedAssets}
            onAddGeneratedAsset={(asset) => setGeneratedAssets((prev) => [asset, ...prev])}
          />
        )}
      </main>

      {/* Export Academic Defense Brief Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">
                导出《宏观能源结构演化与MiMo闭环仿真》学术答辩简报
              </h3>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800"
              >
                关闭
              </button>
            </div>

            <pre className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs text-slate-300 font-mono overflow-x-auto max-h-80 whitespace-pre-wrap leading-relaxed">
              {generateMarkdownBrief()}
            </pre>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(generateMarkdownBrief());
                  setCopiedReport(true);
                  setTimeout(() => setCopiedReport(false), 2000);
                }}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5"
              >
                {copiedReport ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : null}
                {copiedReport ? '已复制到剪贴板' : '复制 Markdown 文本'}
              </button>
              <button
                onClick={() => {
                  const blob = new Blob([generateMarkdownBrief()], { type: 'text/markdown;charset=utf-8' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'MiMo_Energy_Simulation_Academic_Brief.md';
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                下载 .md 简报文件
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
