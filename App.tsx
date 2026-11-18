import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  Film,
  Sliders,
  ClipboardCheck,
  Gamepad2,
  Layers,
  Menu,
  X,
} from 'lucide-react';
import {
  HERO_WORKSHOP_IMAGE,
  QUIZ_QUESTIONS,
  REINFORCEMENT_FAULTS,
  REINFORCEMENT_SEQUENCES,
  THEORY_CHAPTERS,
  VIDEO_LESSONS,
} from './data/curriculum';
import { TheoryModule } from './components/TheoryModule';
import { VideoModule } from './components/VideoModule';
import { SimulationModule } from './components/SimulationModule';
import { ReinforcementModule } from './components/ReinforcementModule';
import { QuizModule } from './components/QuizModule';
import { GameModule } from './components/GameModule';

type TabKey = 'theory' | 'video' | 'simulation' | 'reinforcement' | 'quiz' | 'game';

interface ProgressState {
  completedTheory: string[];
  watchedVideos: string[];
  simCompleted: boolean;
  masteredFlashcards: string[];
  completedDrills: string[];
  bestQuizScore: number | null;
  bestGameScore: number;
}

const STORAGE_KEY = 'master_plumber_progress_v1';

const DEFAULT_PROGRESS: ProgressState = {
  completedTheory: [],
  watchedVideos: [],
  simCompleted: false,
  masteredFlashcards: [],
  completedDrills: [],
  bestQuizScore: null,
  bestGameScore: 0,
};

const NAV_ITEMS: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'theory', label: 'Онол', icon: BookOpen },
  { key: 'video', label: 'Видео хичээл', icon: Film },
  { key: 'simulation', label: 'Симуляц', icon: Sliders },
  { key: 'reinforcement', label: 'Бататгал', icon: Layers },
  { key: 'quiz', label: 'Сорил', icon: ClipboardCheck },
  { key: 'game', label: 'Тоглоом', icon: Gamepad2 },
];

const HEADER_NAV_ITEMS = NAV_ITEMS.filter((item) => item.key !== 'quiz');

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('theory');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [heroImgError, setHeroImgError] = useState<boolean>(false);
  const [progress, setProgress] = useState<ProgressState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? { ...DEFAULT_PROGRESS, ...JSON.parse(saved) } : DEFAULT_PROGRESS;
    } catch {
      return DEFAULT_PROGRESS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch {
      // Ignore storage quota errors
    }
  }, [progress]);

  const handleToggleTheory = (id: string) => {
    setProgress((prev) => {
      const exists = prev.completedTheory.includes(id);
      return {
        ...prev,
        completedTheory: exists
          ? prev.completedTheory.filter((item) => item !== id)
          : [...prev.completedTheory, id],
      };
    });
  };

  const handleMarkVideo = (id: string) => {
    setProgress((prev) =>
      prev.watchedVideos.includes(id)
        ? prev
        : { ...prev, watchedVideos: [...prev.watchedVideos, id] }
    );
  };

  const handleCompleteSim = () => {
    setProgress((prev) => (prev.simCompleted ? prev : { ...prev, simCompleted: true }));
  };

  const handleToggleFlashcard = (id: string) => {
    setProgress((prev) => {
      const exists = prev.masteredFlashcards.includes(id);
      return {
        ...prev,
        masteredFlashcards: exists
          ? prev.masteredFlashcards.filter((item) => item !== id)
          : [...prev.masteredFlashcards, id],
      };
    });
  };

  const handleCompleteDrill = (id: string) => {
    setProgress((prev) =>
      prev.completedDrills.includes(id)
        ? prev
        : { ...prev, completedDrills: [...prev.completedDrills, id] }
    );
  };

  const handleSaveQuiz = (score: number) => {
    setProgress((prev) => ({
      ...prev,
      bestQuizScore: prev.bestQuizScore === null ? score : Math.max(prev.bestQuizScore, score),
    }));
  };

  const handleSaveGame = (score: number) => {
    setProgress((prev) => ({
      ...prev,
      bestGameScore: Math.max(prev.bestGameScore, score),
    }));
  };

  const selectTab = (tab: TabKey) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Bar Contract: Single row, 3 distinct zones separated by gap-8 */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <button
            type="button"
            onClick={() => selectTab('theory')}
            className="font-display text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 rounded"
          >
            Мастер Сантехникч
          </button>

          {/* Zone 2: 5 concise single-line text navigation links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium" aria-label="Үндсэн цэс">
            {HEADER_NAV_ITEMS.map((item) => {
              const active = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => selectTab(item.key)}
                  className={`py-5 border-b-2 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 ${
                    active
                      ? 'border-sky-600 text-slate-900 font-semibold'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 primary action + mobile menu trigger */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => selectTab('quiz')}
              className="hidden sm:inline-flex px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              Шалгалт өгөх
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((o) => !o)}
              aria-label="Цэс нээх"
              className="md:hidden p-2 rounded-lg text-slate-700 hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <nav className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => selectTab(item.key)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                    active ? 'bg-sky-50 text-sky-900 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        )}
      </header>

      <main className="flex-1 max-w-[1360px] w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Workshop Hero + 4-Column Module Overview (shown prominently on initial landing / Theory view) */}
        {activeTab === 'theory' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch">
              <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col justify-between gap-6">
                <div className="space-y-3">
                  <div className="text-xs font-mono text-slate-500">
                    БНбД 40-05-16 · Мэргэжлийн гүйцэтгэлийн хөтөлбөр · 2026
                  </div>
                  <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight leading-[1.12] text-balance max-w-2xl">
                    Сантехникийн мастерын ажил гүйцэтгэх цогц сургалт
                  </h1>
                  <p className="text-slate-600 text-[15px] sm:text-base leading-relaxed max-w-xl">
                    PP-R хоолой гагнуур, ариутгах татуургын уналтын налуу, коллекторын
                    тэнцвэржүүлэлт болон даралтын туршилтыг онол, видео, интерактив
                    симуляц, сорил ба логик тоглоомоор эзэмшинэ үү.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => selectTab('simulation')}
                    className="px-5 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold transition-colors whitespace-nowrap"
                  >
                    Симуляц эхлүүлэх
                  </button>
                  <button
                    type="button"
                    onClick={() => selectTab('video')}
                    className="px-5 py-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-sm font-medium transition-colors whitespace-nowrap"
                  >
                    Видео хичээл үзэх
                  </button>
                </div>
              </div>

              <div className="lg:col-span-5 relative min-h-[240px] bg-slate-900">
                {!heroImgError ? (
                  <img
                    src={HERO_WORKSHOP_IMAGE}
                    alt="Сантехникийн мастерын ажлын ширээ ба коллектор"
                    referrerPolicy="no-referrer"
                    onError={() => setHeroImgError(true)}
                    className="w-full h-full lg:h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-950 flex items-center justify-center text-slate-400 text-sm">
                    Мастер урлангийн ажлын ширээ
                  </div>
                )}
              </div>
            </div>

            {/* 4-Column Progress & Quick-Jump Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <button
                type="button"
                onClick={() => selectTab('theory')}
                className="text-left bg-white border border-slate-200 hover:border-sky-600 rounded-xl p-4 transition-colors"
              >
                <div className="text-xs text-slate-500">01. Онолын мэдлэг</div>
                <div className="font-mono text-xl font-bold text-slate-900 tabular-nums mt-1">
                  {progress.completedTheory.length} / {THEORY_CHAPTERS.length} бүлэг
                </div>
              </button>
              <button
                type="button"
                onClick={() => selectTab('video')}
                className="text-left bg-white border border-slate-200 hover:border-sky-600 rounded-xl p-4 transition-colors"
              >
                <div className="text-xs text-slate-500">02. Практик видео</div>
                <div className="font-mono text-xl font-bold text-slate-900 tabular-nums mt-1">
                  {progress.watchedVideos.length} / {VIDEO_LESSONS.length} хичээл
                </div>
              </button>
              <button
                type="button"
                onClick={() => selectTab('simulation')}
                className="text-left bg-white border border-slate-200 hover:border-sky-600 rounded-xl p-4 transition-colors"
              >
                <div className="text-xs text-slate-500">03. Гидравлик лаборатори</div>
                <div className="font-mono text-xl font-bold text-slate-900 tabular-nums mt-1">
                  {progress.simCompleted ? 'Туршилт хийсэн' : '2 интерактив горим'}
                </div>
              </button>
              <button
                type="button"
                onClick={() => selectTab('reinforcement')}
                className="text-left bg-white border border-slate-200 hover:border-sky-600 rounded-xl p-4 transition-colors"
              >
                <div className="text-xs text-slate-500">04. Бататгал дадлага</div>
                <div className="font-mono text-xl font-bold text-slate-900 tabular-nums mt-1">
                  {progress.completedDrills.length} /{' '}
                  {REINFORCEMENT_SEQUENCES.length + REINFORCEMENT_FAULTS.length} дасгал
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Compact Section Header for Non-Landing Tabs */}
        {activeTab !== 'theory' && (
          <div className="flex flex-wrap items-end justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <div className="text-xs font-mono text-sky-700">
                {activeTab === 'video' && 'Хэсэг 02 · Практик үзүүлбэр'}
                {activeTab === 'simulation' && 'Хэсэг 03 · Интерактив туршилт'}
                {activeTab === 'reinforcement' && 'Хэсэг 04 · Дадлага ба Бататгал'}
                {activeTab === 'quiz' && 'Хэсэг 05 · Аттестатчилал'}
                {activeTab === 'game' && 'Хэсэг 06 · Инженерийн тоглоом'}
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 mt-0.5">
                {activeTab === 'video' && 'Мастерын видео хичээлүүд'}
                {activeTab === 'simulation' && 'Ус хангамж ба ариутгах татуургын симуляц'}
                {activeTab === 'reinforcement' && 'Мэдлэг бататгах практик дасгалууд'}
                {activeTab === 'quiz' && 'Мэргэжлийн зэрэглэлийн сорил'}
                {activeTab === 'game' && 'Шугам Холбогч Мастер'}
              </h1>
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => selectTab(item.key)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    activeTab === item.key
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Active Module Workspace */}
        {activeTab === 'theory' && (
          <TheoryModule
            completedIds={progress.completedTheory}
            onToggleComplete={handleToggleTheory}
            onGoToSimulation={() => selectTab('simulation')}
          />
        )}
        {activeTab === 'video' && (
          <VideoModule
            watchedIds={progress.watchedVideos}
            onMarkWatched={handleMarkVideo}
          />
        )}
        {activeTab === 'simulation' && (
          <SimulationModule onCompleteSimulation={handleCompleteSim} />
        )}
        {activeTab === 'reinforcement' && (
          <ReinforcementModule
            masteredFlashcardIds={progress.masteredFlashcards}
            completedDrillIds={progress.completedDrills}
            onToggleFlashcard={handleToggleFlashcard}
            onCompleteDrill={handleCompleteDrill}
          />
        )}
        {activeTab === 'quiz' && (
          <QuizModule
            bestScore={progress.bestQuizScore}
            onSaveScore={(score) => handleSaveQuiz(score)}
          />
        )}
        {activeTab === 'game' && (
          <GameModule
            bestGameScore={progress.bestGameScore}
            onSaveGameScore={handleSaveGame}
          />
        )}
      </main>

      {/* Clean Editorial Footer */}
      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-6 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <span>© 2026 Мастер Сантехникч · Мэргэжлийн гүйцэтгэлийн сургалтын платформ</span>
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => selectTab('theory')} className="hover:text-slate-900">
              Онол
            </button>
            <button type="button" onClick={() => selectTab('video')} className="hover:text-slate-900">
              Видео
            </button>
            <button type="button" onClick={() => selectTab('simulation')} className="hover:text-slate-900">
              Симуляц
            </button>
            <button type="button" onClick={() => selectTab('reinforcement')} className="hover:text-slate-900">
              Бататгал
            </button>
            <button type="button" onClick={() => selectTab('quiz')} className="hover:text-slate-900">
              Сорил
            </button>
            <button type="button" onClick={() => selectTab('game')} className="hover:text-slate-900">
              Тоглоом
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
