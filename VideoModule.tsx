import React, { useEffect, useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Film,
  Wrench,
  Captions,
} from 'lucide-react';
import { VIDEO_LESSONS, VideoLesson } from '../data/curriculum';

interface VideoModuleProps {
  watchedIds: string[];
  onMarkWatched: (id: string) => void;
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const VideoModule: React.FC<VideoModuleProps> = ({
  watchedIds,
  onMarkWatched,
}) => {
  const [selectedId, setSelectedId] = useState<string>(VIDEO_LESSONS[0].id);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentSec, setCurrentSec] = useState<number>(0);
  const [speed, setSpeed] = useState<1 | 1.5 | 2>(1);
  const [showCaptions, setShowCaptions] = useState<boolean>(true);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  const lesson: VideoLesson =
    VIDEO_LESSONS.find((l) => l.id === selectedId) ?? VIDEO_LESSONS[0];

  useEffect(() => {
    setIsPlaying(false);
    setCurrentSec(0);
  }, [selectedId]);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = window.setInterval(() => {
      setCurrentSec((prev) => {
        const next = prev + 0.25 * speed;
        if (next >= lesson.durationSec) {
          setIsPlaying(false);
          onMarkWatched(lesson.id);
          return lesson.durationSec;
        }
        return next;
      });
    }, 250);
    return () => window.clearInterval(interval);
  }, [isPlaying, speed, lesson.durationSec, lesson.id, onMarkWatched]);

  // Determine current chapter based on timestamp
  const activeChapter = [...lesson.chapters]
    .reverse()
    .find((ch) => currentSec >= ch.timeSec) ?? lesson.chapters[0];

  const progressPct = Math.min(100, (currentSec / lesson.durationSec) * 100);
  const isWatched = watchedIds.includes(lesson.id);

  const handleSelectChapter = (timeSec: number) => {
    setCurrentSec(timeSec);
    setIsPlaying(true);
  };

  // Animated stage visual inside the video player reflecting real plumbing procedure
  const renderAnimatedSchematic = () => {
    const step = activeChapter.stepType;
    const phaseProgress = Math.min(
      1,
      Math.max(0, (currentSec - activeChapter.timeSec) / 45)
    );

    if (lesson.id === 'vid-ppr') {
      return (
        <svg viewBox="0 0 640 240" className="w-full h-full">
          <rect width="640" height="240" fill="#0F172A" opacity="0.55" />
          {/* Left Pipe */}
          <rect
            x={step === 'join' || step === 'verify' ? 190 + phaseProgress * 30 : 120 + phaseProgress * 30}
            y="95"
            width="140"
            height="50"
            rx="4"
            fill="#16A34A"
            stroke="#4ADE80"
            strokeWidth="2"
          />
          <text x="155" y="125" fill="#FFFFFF" fontSize="13" fontFamily="IBM Plex Mono">
            PP-R DN25
          </text>
          {/* Depth mark line */}
          <line x1="245" y1="95" x2="245" y2="145" stroke="#FACC15" strokeWidth="2.5" strokeDasharray="4 3" />

          {/* Welding Iron in center during heat */}
          {step === 'heat' && (
            <g>
              <rect x="290" y="65" width="60" height="110" rx="6" fill="#F59E0B" stroke="#FDE68A" strokeWidth="2" />
              <text x="298" y="124" fill="#0F172A" fontSize="13" fontWeight="bold" fontFamily="IBM Plex Mono">
                260°C
              </text>
            </g>
          )}

          {/* Right Fitting */}
          <rect
            x={step === 'join' || step === 'verify' ? 310 - phaseProgress * 30 : 380 - phaseProgress * 25}
            y="88"
            width="110"
            height="64"
            rx="6"
            fill="#15803D"
            stroke="#86EFAC"
            strokeWidth="2"
          />
          <text x="335" y="125" fill="#FFFFFF" fontSize="13" fontFamily="IBM Plex Mono">
            ФИТИНГ
          </text>

          {/* Fusion Bead Ring on Verify */}
          {(step === 'join' || step === 'verify') && (
            <rect
              x="298"
              y="86"
              width="12"
              height="68"
              rx="4"
              fill="#4ADE80"
              opacity={step === 'verify' ? 0.95 : phaseProgress}
            />
          )}
        </svg>
      );
    }

    if (lesson.id === 'vid-drainage') {
      const slopeShift = step === 'prep' ? 0 : 18;
      return (
        <svg viewBox="0 0 640 240" className="w-full h-full">
          <rect width="640" height="240" fill="#0F172A" opacity="0.55" />
          {/* Reference horizontal line */}
          <line x1="80" y1="100" x2="540" y2="100" stroke="#94A3B8" strokeWidth="1.5" strokeDasharray="6 4" />
          {/* Drainage Pipe */}
          <g transform={`rotate(${slopeShift > 0 ? 2.2 : 0}, 300, 120)`}>
            <rect x="90" y="95" width="420" height="44" rx="6" fill="#64748B" stroke="#CBD5E1" strokeWidth="2" />
            {/* Animated flow */}
            {(step === 'join' || step === 'verify') && (
              <rect
                x={100 + ((currentSec * 60) % 340)}
                y="114"
                width="60"
                height="16"
                rx="8"
                fill="#38BDF8"
                opacity="0.85"
              />
            )}
            {/* Spirit Level */}
            <rect x="210" y="68" width="180" height="22" rx="3" fill="#FACC15" stroke="#FEF08A" />
            <circle cx="300" cy="79" r="6" fill="#FFFFFF" />
            <circle cx={step === 'prep' ? 300 : 298} cy="79" r="3" fill="#0F172A" />
          </g>
          <text x="90" y="185" fill="#E2E8F0" fontSize="13" fontFamily="IBM Plex Mono">
            {step === 'prep' ? 'Налуу: 0.00 (Хэвтээ)' : 'Налуу: i = 0.02 (2 см/м · Хэвийн)'}
          </text>
        </svg>
      );
    }

    if (lesson.id === 'vid-pressure') {
      const bar =
        step === 'prep' ? 0 : step === 'heat' ? 3.5 : step === 'join' ? 9.0 : 9.0;
      const angle = -135 + (bar / 12) * 270;
      return (
        <svg viewBox="0 0 640 240" className="w-full h-full">
          <rect width="640" height="240" fill="#0F172A" opacity="0.55" />
          {/* Pipe Under Test */}
          <rect x="80" y="135" width="240" height="30" rx="4" fill="#16A34A" stroke="#4ADE80" strokeWidth="2" />
          <rect x="100" y="143" width="200" height="14" rx="2" fill="#0284C7" opacity={bar > 0 ? 0.9 : 0.2} />
          {/* Analog Gauge */}
          <circle cx="440" cy="115" r="72" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="5" />
          <circle cx="440" cy="115" r="58" fill="none" stroke="#E2E8F0" strokeWidth="2" />
          <g transform={`translate(440, 115) rotate(${angle})`}>
            <line x1="0" y1="10" x2="0" y2="-50" stroke="#DC2626" strokeWidth="3.5" strokeLinecap="round" />
          </g>
          <circle cx="440" cy="115" r="6" fill="#0F172A" />
          <text x="415" y="158" fill="#0F172A" fontSize="14" fontWeight="bold" fontFamily="IBM Plex Mono">
            {bar.toFixed(1)} bar
          </text>
        </svg>
      );
    }

    // Default Manifold Animation
    return (
      <svg viewBox="0 0 640 240" className="w-full h-full">
        <rect width="640" height="240" fill="#0F172A" opacity="0.55" />
        {/* Brass Manifold Bar */}
        <rect x="140" y="75" width="360" height="36" rx="6" fill="#D97706" stroke="#FCD34D" strokeWidth="2" />
        {[0, 1, 2, 3].map((idx) => (
          <g key={idx}>
            <rect x={185 + idx * 80} y="111" width="18" height="80" fill={idx % 2 === 0 ? '#DC2626' : '#0284C7'} />
            <circle
              cx={194 + idx * 80}
              cy={125 + ((currentSec * 30 + idx * 15) % 55)}
              r="4"
              fill="#FFFFFF"
              opacity={step === 'join' || step === 'verify' ? 0.9 : 0.2}
            />
          </g>
        ))}
        <text x="145" y="62" fill="#FDE68A" fontSize="13" fontFamily="IBM Plex Mono">
          КОЛЛЕКТОР · 4 ХЭЛХЭЭ ТЭНЦВЭРЖҮҮЛЭЛТ
        </text>
      </svg>
    );
  };

  return (
    <section aria-label="Видео хичээлүүд" className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Main Video Stage (8 cols) */}
      <div className="lg:col-span-8 space-y-5">
        <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-800">
          {/* Visual Viewport */}
          <div className="relative aspect-video bg-slate-950 overflow-hidden">
            {!imgErrors[lesson.id] ? (
              <img
                src={lesson.thumbnail}
                alt={lesson.title}
                referrerPolicy="no-referrer"
                onError={() => setImgErrors((prev) => ({ ...prev, [lesson.id]: true }))}
                className={`w-full h-full object-cover transition-opacity duration-300 ${
                  isPlaying || currentSec > 0 ? 'opacity-30' : 'opacity-80'
                }`}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-950 flex items-center justify-center">
                <Film className="w-12 h-12 text-slate-600" />
              </div>
            )}

            {/* Animated Interactive Demonstration Layer when playing or scrubbed */}
            {(isPlaying || currentSec > 0) && (
              <div className="absolute inset-0 flex items-center justify-center">
                {renderAnimatedSchematic()}
              </div>
            )}

            {/* Contrast Scrim & Center Play CTA when paused at 0 */}
            {!isPlaying && currentSec === 0 && (
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-transparent flex flex-col justify-end p-6">
                <div className="flex items-end justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="text-xs font-mono text-sky-300">
                      {lesson.number} · {lesson.category} · {lesson.durationLabel}
                    </div>
                    <h2 className="font-display text-2xl sm:text-3xl font-semibold text-white tracking-tight">
                      {lesson.title}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPlaying(true)}
                    className="px-5 py-3 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium text-sm flex items-center gap-2 transition-colors shrink-0 whitespace-nowrap"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Тоглуулах</span>
                  </button>
                </div>
              </div>
            )}

            {/* Synchronized Mongolian Captions */}
            {showCaptions && (isPlaying || currentSec > 0) && (
              <div className="absolute bottom-4 inset-x-4 flex justify-center pointer-events-none">
                <div className="bg-slate-950/90 border border-slate-700/80 text-white text-xs sm:text-sm px-4 py-2.5 rounded-lg max-w-2xl text-center leading-relaxed">
                  <span className="font-mono text-sky-400 mr-2">[{activeChapter.label}]</span>
                  {activeChapter.caption}
                </div>
              </div>
            )}
          </div>

          {/* Video Transport Controls */}
          <div className="px-4 py-3 bg-slate-900 text-slate-200 space-y-2.5">
            {/* Scrubber Bar */}
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-slate-400 tabular-nums w-11">
                {formatTime(currentSec)}
              </span>
              <input
                type="range"
                aria-label="Видео хугацаа гүйлгэх"
                min={0}
                max={lesson.durationSec}
                step={1}
                value={currentSec}
                onChange={(e) => setCurrentSec(Number(e.target.value))}
                className="flex-1 accent-sky-500 cursor-pointer"
              />
              <span className="font-mono text-xs text-slate-400 tabular-nums w-11 text-right">
                {lesson.durationLabel}
              </span>
            </div>

            {/* Action Buttons Row */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPlaying((p) => !p)}
                  className="px-3.5 py-1.5 rounded-md bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap"
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{isPlaying ? 'Зогсоох' : 'Тоглуулах'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentSec(0);
                    setIsPlaying(false);
                  }}
                  aria-label="Эхнээс нь тоглуулах"
                  className="p-2 rounded-md text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setSpeed((s) => (s === 1 ? 1.5 : s === 1.5 ? 2 : 1))}
                  className="px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-xs font-mono tabular-nums transition-colors"
                >
                  {speed}x
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCaptions((c) => !c)}
                  className={`px-2.5 py-1.5 rounded-md text-xs flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                    showCaptions ? 'bg-slate-800 text-sky-300' : 'text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <Captions className="w-3.5 h-3.5" />
                  <span>Тайлбар</span>
                </button>
                <button
                  type="button"
                  onClick={() => onMarkWatched(lesson.id)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                    isWatched
                      ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/50'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isWatched ? 'Үзсэн ✓' : 'Үзэж дууссан'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Lesson Details & Interactive Chapter Timestamps */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-slate-900">Хичээлийн зорилго ба хэсгүүд</h3>
            <p className="text-sm text-slate-600 leading-relaxed">{lesson.objective}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {lesson.chapters.map((ch) => {
              const isCurr = ch.timeSec === activeChapter.timeSec && currentSec > 0;
              return (
                <button
                  key={ch.timeSec}
                  type="button"
                  onClick={() => handleSelectChapter(ch.timeSec)}
                  className={`text-left p-3.5 rounded-lg border transition-colors ${
                    isCurr
                      ? 'border-sky-600 bg-sky-50/70'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-mono font-semibold text-sky-700 tabular-nums">
                      {formatTime(ch.timeSec)}
                    </span>
                    <span className="text-slate-400">Үсрэх</span>
                  </div>
                  <div className="text-sm font-medium text-slate-900">{ch.label}</div>
                </button>
              );
            })}
          </div>

          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center gap-3 text-xs text-slate-600">
            <span className="flex items-center gap-1.5 font-semibold text-slate-900">
              <Wrench className="w-3.5 h-3.5 text-sky-600" />
              Шаардлагатай багаж:
            </span>
            {lesson.tools.map((tool, i) => (
              <React.Fragment key={tool}>
                <span>{tool}</span>
                {i < lesson.tools.length - 1 && <span aria-hidden="true">·</span>}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Playlist Sidebar (4 cols) */}
      <aside className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl font-semibold text-slate-900">
            Практик видео сан
          </h3>
          <span className="font-mono text-xs text-slate-500 tabular-nums">
            {watchedIds.length} / {VIDEO_LESSONS.length} үзсэн
          </span>
        </div>

        <div className="space-y-3">
          {VIDEO_LESSONS.map((item) => {
            const active = item.id === lesson.id;
            const watched = watchedIds.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedId(item.id)}
                className={`w-full text-left rounded-lg border p-3 transition-colors flex gap-3.5 items-start ${
                  active
                    ? 'border-sky-600 bg-sky-50/50'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="w-24 aspect-video rounded-md overflow-hidden bg-slate-200 shrink-0 relative">
                  {!imgErrors[item.id] ? (
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      onError={() => setImgErrors((p) => ({ ...p, [item.id]: true }))}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                      <Film className="w-4 h-4 text-slate-400" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono tabular-nums">
                    <span>{item.number}</span>
                    <span aria-hidden="true">·</span>
                    <span>{item.durationLabel}</span>
                    {watched && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-emerald-700 font-sans font-medium">Үзсэн</span>
                      </>
                    )}
                  </div>
                  <div className="text-sm font-semibold text-slate-900 leading-snug line-clamp-2">
                    {item.title}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </aside>
    </section>
  );
};
