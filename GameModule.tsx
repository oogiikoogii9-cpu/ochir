import React, { useEffect, useMemo, useState } from 'react';
import {
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Droplets,
  AlertTriangle,
  CheckCircle2,
  Trophy,
  Clock,
} from 'lucide-react';
import { GAME_LEVELS, GameCellConfig, GameLevel, PipeType } from '../data/curriculum';
import {
  playLeakAlert,
  playSuccessChime,
  playWaterFlow,
  playWrenchClick,
} from '../utils/sound';

type GameState = 'TITLE_MENU' | 'PLAYING' | 'LEVEL_COMPLETE' | 'GAME_OVER';

interface GameModuleProps {
  bestGameScore: number;
  onSaveGameScore: (score: number) => void;
}

interface CellState extends GameCellConfig {
  key: string;
}

// Directions: 0 = North, 1 = East, 2 = South, 3 = West
const DIR_DELTAS: Record<number, { dr: number; dc: number; opp: number }> = {
  0: { dr: -1, dc: 0, opp: 2 },
  1: { dr: 0, dc: 1, opp: 3 },
  2: { dr: 1, dc: 0, opp: 0 },
  3: { dr: 0, dc: -1, opp: 1 },
};

function getCellConnections(cell: CellState): number[] {
  if (cell.type === 'SOURCE' || cell.type === 'TARGET') {
    return cell.fixedDirs ?? [];
  }
  const r = ((cell.rotation % 4) + 4) % 4;
  let base: number[] = [];
  switch (cell.type) {
    case 'STRAIGHT':
    case 'VALVE':
      base = [0, 2];
      break;
    case 'ELBOW':
      base = [0, 1];
      break;
    case 'TEE':
      base = [0, 1, 2];
      break;
    case 'CROSS':
      base = [0, 1, 2, 3];
      break;
    default:
      base = [];
  }
  return base.map((d) => (d + r) % 4);
}

function buildGrid(level: GameLevel): CellState[][] {
  const grid: CellState[][] = [];
  for (let r = 0; r < level.rows; r++) {
    const row: CellState[] = [];
    for (let c = 0; c < level.cols; c++) {
      const found = level.cells.find((item) => item.row === r && item.col === c);
      if (found) {
        row.push({ ...found, key: `${r}-${c}` });
      } else {
        row.push({ row: r, col: c, type: 'EMPTY', rotation: 0, fixed: true, key: `${r}-${c}` });
      }
    }
    grid.push(row);
  }
  return grid;
}

function evaluateCircuit(grid: CellState[][], rows: number, cols: number) {
  const pressurized = new Set<string>();
  const connectedTargets = new Set<string>();
  const leaks: { key: string; dir: number }[] = [];
  const queue: CellState[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c].type === 'SOURCE') {
        pressurized.add(grid[r][c].key);
        queue.push(grid[r][c]);
      }
    }
  }

  let totalTargets = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c].type === 'TARGET') {
        totalTargets++;
      }
    }
  }

  while (queue.length > 0) {
    const curr = queue.shift()!;
    const dirs = getCellConnections(curr);
    for (const d of dirs) {
      const delta = DIR_DELTAS[d];
      const nr = curr.row + delta.dr;
      const nc = curr.col + delta.dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) {
        leaks.push({ key: curr.key, dir: d });
        continue;
      }
      const neighbor = grid[nr][nc];
      const neighborDirs = getCellConnections(neighbor);
      if (!neighborDirs.includes(delta.opp)) {
        leaks.push({ key: curr.key, dir: d });
        continue;
      }
      if (!pressurized.has(neighbor.key)) {
        pressurized.add(neighbor.key);
        if (neighbor.type === 'TARGET') {
          connectedTargets.add(neighbor.key);
        } else {
          queue.push(neighbor);
        }
      }
    }
  }

  const solved = connectedTargets.size === totalTargets && totalTargets > 0 && leaks.length === 0;
  return { pressurized, connectedTargets, totalTargets, leaks, solved };
}

export const GameModule: React.FC<GameModuleProps> = ({
  bestGameScore,
  onSaveGameScore,
}) => {
  const [gameState, setGameState] = useState<GameState>('TITLE_MENU');
  const [levelIdx, setLevelIdx] = useState<number>(0);
  const [grid, setGrid] = useState<CellState[][]>(() => buildGrid(GAME_LEVELS[0]));
  const [moves, setMoves] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(GAME_LEVELS[0].timeLimitSec);
  const [totalScore, setTotalScore] = useState<number>(0);
  const [lastLevelScore, setLastLevelScore] = useState<number>(0);
  const [muted, setMuted] = useState<boolean>(false);
  const [testFeedback, setTestFeedback] = useState<string | null>(null);
  const [showLeakOverlay, setShowLeakOverlay] = useState<boolean>(false);

  const level = GAME_LEVELS[levelIdx];

  // Timer during PLAYING
  useEffect(() => {
    if (gameState !== 'PLAYING') return;
    const id = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setGameState('GAME_OVER');
          playLeakAlert(muted);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [gameState, muted]);

  const circuit = useMemo(
    () => evaluateCircuit(grid, level.rows, level.cols),
    [grid, level.rows, level.cols]
  );

  const startLevel = (idx: number, keepTotalScore = false) => {
    const lvl = GAME_LEVELS[idx];
    setLevelIdx(idx);
    setGrid(buildGrid(lvl));
    setMoves(0);
    setTimeLeft(lvl.timeLimitSec);
    if (!keepTotalScore) setTotalScore(0);
    setTestFeedback(null);
    setShowLeakOverlay(false);
    setGameState('PLAYING');
  };

  const handleRotateCell = (r: number, c: number) => {
    if (gameState !== 'PLAYING') return;
    const cell = grid[r][c];
    if (cell.fixed || cell.type === 'EMPTY' || cell.type === 'BLOCK') return;

    playWrenchClick(muted);
    setShowLeakOverlay(false);
    setTestFeedback(null);

    setGrid((prev) =>
      prev.map((row, rIdx) =>
        rIdx === r
          ? row.map((item, cIdx) =>
              cIdx === c ? { ...item, rotation: (item.rotation + 1) % 4 } : item
            )
          : row
      )
    );
    setMoves((m) => m + 1);
  };

  const handlePressureTest = () => {
    if (gameState !== 'PLAYING') return;

    if (circuit.solved) {
      playWaterFlow(muted);
      setTimeout(() => playSuccessChime(muted), 180);
      const timeBonus = timeLeft * 10;
      const moveBonus = Math.max(0, (level.parMoves - moves) * 25);
      const earned = 500 + timeBonus + moveBonus;
      const newTotal = totalScore + earned;
      setLastLevelScore(earned);
      setTotalScore(newTotal);
      onSaveGameScore(newTotal);
      setGameState('LEVEL_COMPLETE');
    } else {
      playLeakAlert(muted);
      setShowLeakOverlay(true);
      if (circuit.leaks.length > 0) {
        setTestFeedback(
          `Даралт алдагдлаа! ${circuit.leaks.length} цэг дээр задгай буюу буруу холбогдсон хоолой ус цацаж байна.`
        );
      } else {
        setTestFeedback(
          `Бүх хэрэглэгчид (${circuit.connectedTargets.size}/${circuit.totalTargets}) ус хүрээгүй байна. Хоолойн чиглэлийг шалгана уу.`
        );
      }
    }
  };

  const renderPipeSvg = (cell: CellState) => {
    const isPressurized = circuit.pressurized.has(cell.key);
    const pipeColor = isPressurized ? '#0284C7' : '#64748B';
    const innerColor = isPressurized ? '#7DD3FC' : '#94A3B8';
    const dirs = getCellConnections(cell);
    const cellLeaks = showLeakOverlay
      ? circuit.leaks.filter((l) => l.key === cell.key).map((l) => l.dir)
      : [];

    if (cell.type === 'EMPTY') {
      return <div className="w-full h-full bg-slate-900/40 rounded-lg border border-slate-800/60" />;
    }

    if (cell.type === 'BLOCK') {
      return (
        <div className="w-full h-full bg-slate-800 rounded-lg border border-slate-700 flex flex-col items-center justify-center text-slate-400 select-none">
          <div className="w-5 h-5 border-2 border-slate-600 rounded-xs mb-0.5 bg-slate-700/60" />
          <span className="text-[10px] font-mono truncate max-w-full px-1">{cell.label}</span>
        </div>
      );
    }

    const endpoints: Record<number, { x: number; y: number }> = {
      0: { x: 50, y: 0 },
      1: { x: 100, y: 50 },
      2: { x: 50, y: 100 },
      3: { x: 0, y: 50 },
    };

    return (
      <svg viewBox="0 0 100 100" className="w-full h-full block">
        {/* Background Tile */}
        <rect
          x="2"
          y="2"
          width="96"
          height="96"
          rx="10"
          fill={
            cell.type === 'SOURCE'
              ? '#0C4A6E'
              : cell.type === 'TARGET'
                ? isPressurized
                  ? '#064E3B'
                  : '#1E293B'
                : '#0F172A'
          }
          stroke={
            cellLeaks.length > 0
              ? '#EF4444'
              : isPressurized
                ? '#0284C7'
                : '#334155'
          }
          strokeWidth="2.5"
        />

        {/* Pipe Arms */}
        {dirs.map((d) => {
          const pt = endpoints[d];
          return (
            <g key={d}>
              <line
                x1="50"
                y1="50"
                x2={pt.x}
                y2={pt.y}
                stroke={pipeColor}
                strokeWidth="24"
                strokeLinecap="butt"
              />
              <line
                x1="50"
                y1="50"
                x2={pt.x}
                y2={pt.y}
                stroke={innerColor}
                strokeWidth="7"
                strokeLinecap="round"
                opacity={isPressurized ? 0.9 : 0.35}
              />
            </g>
          );
        })}

        {/* Center Joint Hub */}
        <circle cx="50" cy="50" r="14" fill={pipeColor} />

        {/* Valve Handle */}
        {cell.type === 'VALVE' && (
          <g>
            <circle cx="50" cy="50" r="18" fill="#D97706" stroke="#FDE68A" strokeWidth="2.5" />
            <line x1="34" y1="50" x2="66" y2="50" stroke="#DC2626" strokeWidth="6" strokeLinecap="round" />
          </g>
        )}

        {/* Source & Target Labels */}
        {cell.type === 'SOURCE' && (
          <g>
            <circle cx="50" cy="50" r="22" fill="#0284C7" stroke="#BAE6FD" strokeWidth="2.5" />
            <text x="50" y="54" textAnchor="middle" fill="#FFFFFF" fontSize="13" fontWeight="bold" fontFamily="Manrope">
              {cell.label}
            </text>
          </g>
        )}

        {cell.type === 'TARGET' && (
          <g>
            <circle
              cx="50"
              cy="46"
              r="20"
              fill={isPressurized ? '#059669' : '#334155'}
              stroke={isPressurized ? '#6EE7B7' : '#94A3B8'}
              strokeWidth="2.5"
            />
            <text x="50" y="84" textAnchor="middle" fill="#E2E8F0" fontSize="12" fontWeight="600" fontFamily="Manrope">
              {cell.label}
            </text>
          </g>
        )}

        {/* Leak Spray Visual */}
        {cellLeaks.map((d) => {
          const pt = endpoints[d];
          return (
            <circle
              key={`leak-${d}`}
              cx={50 + (pt.x - 50) * 0.85}
              cy={50 + (pt.y - 50) * 0.85}
              r="10"
              fill="#EF4444"
              stroke="#FEE2E2"
              strokeWidth="2"
            />
          );
        })}
      </svg>
    );
  };

  if (gameState === 'TITLE_MENU') {
    return (
      <section aria-label="Тоглоомын эхлэл" className="max-w-4xl mx-auto">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 sm:p-10 text-white space-y-8">
          <div className="space-y-3 max-w-2xl">
            <div className="text-xs font-mono text-sky-400">
              Инженерийн логик тоглоом · 3 түвшин
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">
              Шугам Холбогч Мастер
            </h2>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Босоо шугамаас бүх хэрэглэгч рүү (угаалтуур, шүршүүр, бойлер) ус хангамжийн
              хоолойг нэг ч алдагдал, задгай амсаргүй зөв эргүүлж холбоно уу. Холболтоо
              дуусгаад даралтын туршилт хийж баталгаажуулна уу.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-800/70 border border-slate-700 rounded-lg p-4">
              <div className="text-xs text-slate-400">1. Хоолой эргүүлэх</div>
              <div className="text-sm font-medium text-white mt-1">
                Товшин дээр дарж фитингийг 90° эргүүлнэ.
              </div>
            </div>
            <div className="bg-slate-800/70 border border-slate-700 rounded-lg p-4">
              <div className="text-xs text-slate-400">2. Шүүрэлгүй битүүлэх</div>
              <div className="text-sm font-medium text-white mt-1">
                Нэг ч хоолойн амсар хоосон орон зайд үлдэх ёсгүй.
              </div>
            </div>
            <div className="bg-slate-800/70 border border-slate-700 rounded-lg p-4">
              <div className="text-xs text-slate-400">3. Даралт шалгах</div>
              <div className="text-sm font-medium text-white mt-1">
                Хугацаанаас өмнө ус нээж бүх цэгт хүргэнэ.
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-800">
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>
                Таны дээд оноо:{' '}
                <strong className="font-mono text-white tabular-nums">{bestGameScore}</strong>
              </span>
            </div>

            <button
              type="button"
              onClick={() => startLevel(0, false)}
              className="px-6 py-3 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm flex items-center gap-2 transition-colors"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Тоглоом эхлүүлэх</span>
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Шугам холбогч тоглоом" className="max-w-5xl mx-auto space-y-5">
      {/* Unobtrusive Top Game HUD */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl px-5 py-4 text-white flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs font-mono text-sky-400">
            {level.title} · Нийт оноо: {totalScore}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">{level.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs font-mono tabular-nums">
          <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-lg">
            <Droplets className="w-3.5 h-3.5 text-sky-400" />
            <span>
              Цэг: {circuit.connectedTargets.size}/{circuit.totalTargets}
            </span>
          </div>
          <div className="bg-slate-800 px-3 py-1.5 rounded-lg">
            Үйлдэл: {moves} (Норм: {level.parMoves})
          </div>
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${
              timeLeft <= 15 ? 'bg-red-950 text-red-300 border border-red-700' : 'bg-slate-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{timeLeft} сек</span>
          </div>
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            aria-label={muted ? 'Дуу нээх' : 'Дуу хаах'}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Arena + Side Action Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 bg-slate-950 border border-slate-800 rounded-xl p-4 sm:p-6 flex justify-center">
          <div
            className="grid gap-1.5 w-full"
            style={{
              maxWidth: level.cols === 5 ? '420px' : level.cols === 6 ? '480px' : '540px',
              gridTemplateColumns: `repeat(${level.cols}, minmax(0, 1fr))`,
            }}
          >
            {grid.map((row) =>
              row.map((cell) => {
                const interactive =
                  !cell.fixed && cell.type !== 'EMPTY' && cell.type !== 'BLOCK';
                return (
                  <button
                    key={cell.key}
                    type="button"
                    disabled={!interactive || gameState !== 'PLAYING'}
                    onClick={() => handleRotateCell(cell.row, cell.col)}
                    aria-label={`${cell.type} мөр ${cell.row + 1} багана ${cell.col + 1}`}
                    className={`aspect-square rounded-lg transition-transform duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                      interactive
                        ? 'cursor-pointer hover:scale-[1.03] active:scale-95'
                        : 'cursor-default'
                    }`}
                  >
                    {renderPipeSvg(cell)}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Control Deck */}
        <aside className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 space-y-5">
          <div className="space-y-1">
            <h3 className="font-display text-xl font-semibold text-slate-900">
              Туршилтын самбар
            </h3>
            <p className="text-xs text-slate-500">
              Хөх өнгөөр ус дамжиж байгааг харуулна. Улаан цэг нь задгай шүүрэл илэрсэн газар.
            </p>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Холбогдсон хэрэглэгч</span>
              <span className="font-mono font-semibold text-slate-900 tabular-nums">
                {circuit.connectedTargets.size} / {circuit.totalTargets}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Задгай амсар (Шүүрэл)</span>
              <span
                className={`font-mono font-semibold tabular-nums ${
                  circuit.leaks.length === 0 ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                {circuit.leaks.length} цэг
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-500">Түвшин сонгох</span>
              <div className="flex gap-1">
                {GAME_LEVELS.map((lvl, idx) => (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() => startLevel(idx, false)}
                    className={`px-2 py-1 rounded text-xs font-mono ${
                      idx === levelIdx
                        ? 'bg-slate-900 text-white font-semibold'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {lvl.id}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {testFeedback && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3.5 text-xs text-red-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{testFeedback}</span>
            </div>
          )}

          {gameState === 'PLAYING' && (
            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={handlePressureTest}
                className="w-full py-3 px-4 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <Droplets className="w-4 h-4" />
                <span>Даралт шалгах (Ус нээх)</span>
              </button>
              <button
                type="button"
                onClick={() => startLevel(levelIdx, true)}
                className="w-full py-2.5 px-4 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Түвшинг дахин эхлүүлэх</span>
              </button>
            </div>
          )}

          {gameState === 'LEVEL_COMPLETE' && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-emerald-900 font-semibold text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Шугам амжилттай шалгагдлаа!</span>
              </div>
              <div className="text-xs text-emerald-800 font-mono tabular-nums">
                Авсан оноо: +{lastLevelScore} · Нийт: {totalScore}
              </div>
              <div className="flex gap-2">
                {levelIdx < GAME_LEVELS.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => startLevel(levelIdx + 1, true)}
                    className="flex-1 py-2.5 px-3 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold transition-colors"
                  >
                    Дараагийн түвшин →
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => startLevel(0, false)}
                    className="flex-1 py-2.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors"
                  >
                    Дахин тоглох
                  </button>
                )}
              </div>
            </div>
          )}

          {gameState === 'GAME_OVER' && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-red-900 font-semibold text-sm">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span>Хугацаа дууслаа</span>
              </div>
              <p className="text-xs text-red-800">
                Туршилтын хугацаанд шугамыг бүрэн холбож амжсангүй. Дахин оролдоно уу.
              </p>
              <button
                type="button"
                onClick={() => startLevel(levelIdx, false)}
                className="w-full py-2.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors"
              >
                Дахин тоглох
              </button>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
};
