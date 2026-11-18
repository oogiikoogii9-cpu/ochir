import React, { useEffect, useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Droplets,
  Wind,
  Gauge,
} from 'lucide-react';
import { playWaterFlow, playWrenchClick } from '../utils/sound';

type SimMode = 'supply' | 'drainage';

interface SimulationModuleProps {
  onCompleteSimulation: () => void;
}

export const SimulationModule: React.FC<SimulationModuleProps> = ({
  onCompleteSimulation,
}) => {
  const [mode, setMode] = useState<SimMode>('supply');
  const [tick, setTick] = useState<number>(0);
  const [running, setRunning] = useState<boolean>(true);

  // Supply Simulation State
  const [mainValveOpen, setMainValveOpen] = useState<boolean>(true);
  const [reducerBar, setReducerBar] = useState<number>(3.5);
  const [pipeDn, setPipeDn] = useState<16 | 20 | 25>(20);
  const [filterClogged, setFilterClogged] = useState<boolean>(false);
  const [openSink, setOpenSink] = useState<boolean>(true);
  const [openShower, setOpenShower] = useState<boolean>(true);
  const [openWasher, setOpenWasher] = useState<boolean>(false);

  // Drainage Simulation State
  const [slopePct, setSlopePct] = useState<number>(2.0);
  const [drainDn, setDrainDn] = useState<50 | 110>(110);
  const [ventOpen, setVentOpen] = useState<boolean>(true);
  const [flushPulse, setFlushPulse] = useState<number>(0);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setTick((t) => (t + 1) % 1000);
      setFlushPulse((p) => (p > 0 ? Math.max(0, p - 1) : 0));
    }, 60);
    return () => window.clearInterval(id);
  }, [running]);

  // Physics Calculations: Water Supply
  const activeFixtures =
    (openSink ? 6 : 0) + (openShower ? 10 : 0) + (openWasher ? 8 : 0); // Base l/min demand
  const dnFactor = pipeDn === 16 ? 2.4 : pipeDn === 20 ? 1.0 : 0.45;
  const clogLoss = filterClogged ? 1.9 : 0.15;
  const frictionLoss = mainValveOpen
    ? (activeFixtures / 12) ** 2 * 0.55 * dnFactor + (activeFixtures > 0 ? clogLoss : 0)
    : 0;
  const effectiveSourceBar = mainValveOpen ? reducerBar : 0;
  const manifoldBar = Math.max(0, effectiveSourceBar - (activeFixtures > 0 && mainValveOpen ? clogLoss * 0.6 : 0));
  const fixtureBar = Math.max(0, effectiveSourceBar - frictionLoss);
  const actualFlowLpm = mainValveOpen
    ? Number((activeFixtures * Math.min(1.2, Math.sqrt(Math.max(0.1, fixtureBar) / 3.0))).toFixed(1))
    : 0;

  // Inner diameter approx in meters for velocity v = Q / A
  const innerDiaM = (pipeDn === 16 ? 12 : pipeDn === 20 ? 14.4 : 18) / 1000;
  const areaM2 = Math.PI * (innerDiaM / 2) ** 2;
  const flowM3s = actualFlowLpm / 60000;
  const velocityMs = mainValveOpen && activeFixtures > 0 ? Number((flowM3s / areaM2).toFixed(2)) : 0;

  let supplyStatus: { kind: 'ok' | 'warn' | 'err'; label: string; detail: string } = {
    kind: 'ok',
    label: '● ХЭВИЙН АЖИЛЛАГАА',
    detail: 'Даралт ба урсгалын хурд БНбД нормын (0.8–1.5 м/с, 2.5–4.5 bar) хүрээнд байна.',
  };

  if (!mainValveOpen) {
    supplyStatus = {
      kind: 'warn',
      label: '▲ ҮНДСЭН ХААЛТ ХААЛТТАЙ',
      detail: 'Ус хангамж зогссон байна. Системийг ажиллуулахын тулд оролтын хаалтыг нээнэ үү.',
    };
  } else if (reducerBar > 5.0) {
    supplyStatus = {
      kind: 'err',
      label: '■ ХЭТ ӨНДӨР ДАРАЛТ (> 5.0 bar)',
      detail: 'Бойлер, уян шланг болон холигчийн картридж гэмтэх эрсдэлтэй! Даралт бууруулагчийг 3.0–4.0 bar болго.',
    };
  } else if (activeFixtures > 0 && fixtureBar < 1.5) {
    supplyStatus = {
      kind: 'err',
      label: '■ ДАРАЛТ УНАСАН (< 1.5 bar)',
      detail: filterClogged
        ? 'Ташуу шүүлтүүр бөглөрсөн тул зарцуулалт уналаа. Шүүлтүүрийн торыг цэвэрлэнэ үү.'
        : 'Нэг зэрэг олон цэг нээгдсэн ба хоолойн голч нарийн байна. DN20 эсвэл DN25 руу өсгөнө үү.',
    };
  } else if (velocityMs > 1.8) {
    supplyStatus = {
      kind: 'warn',
      label: '▲ ХУРД ХЭТЭРСЭН (> 1.8 м/с)',
      detail: 'Хоолойд шуугиан ба ус цохилт (гидроудар) үүсэх эрсдэлтэй. Хоолойн голчийг томруулна уу.',
    };
  }

  // Physics Calculations: Drainage Slope & Siphon
  const optimalMin = drainDn === 50 ? 2.5 : 1.5;
  const optimalMax = drainDn === 50 ? 4.0 : 3.0;
  const siphonWaterLevel = ventOpen ? 55 : Math.max(8, 55 - (flushPulse > 0 ? 45 : 28));

  let drainStatus: { kind: 'ok' | 'warn' | 'err'; label: string; detail: string } = {
    kind: 'ok',
    label: '● ОНОВЧТОЙ УРСГАЛ БА СИФОН',
    detail: `Налуу ${slopePct.toFixed(1)}% нь хатуу бохирдлыг устай хамт бүрэн зайлуулж, 55 мм усан түгжээг хэвийн хадгалж байна.`,
  };

  if (!ventOpen) {
    drainStatus = {
      kind: 'err',
      label: '■ СИФОН СОРОГДОЖ ҮНЭР АЛДЛАА',
      detail: 'Босоо шугамын агааржуулалт хаагдсан тул вакуум үүсэж сифоны усан түгжээг сорлоо. Агааржуулагчийг нээнэ үү.',
    };
  } else if (slopePct < optimalMin) {
    drainStatus = {
      kind: 'warn',
      label: '▲ НАЛУУ БАГА: ТУНАДАС БӨГЛӨРНӨ',
      detail: `Налуу ${slopePct.toFixed(1)}% хэт хавтгай тул урсгалын хурд саарч өөх тос, хатуу хаягдал хоолойн ёроолд тунана.`,
    };
  } else if (slopePct > optimalMax + 1.0) {
    drainStatus = {
      kind: 'err',
      label: '■ НАЛУУ ХЭТ ИХ: ХАТУУ ХОГ ҮЛДЭНЭ',
      detail: `Налуу ${slopePct.toFixed(1)}% хэт огцом тул ус түрүүлж урсан, цаас ба хатуу хогийг тээж чадахгүй хоцорно.`,
    };
  }

  const handleFlush = () => {
    playWaterFlow(false);
    setFlushPulse(35);
    onCompleteSimulation();
  };

  const resetCurrentSim = () => {
    playWrenchClick(false);
    if (mode === 'supply') {
      setMainValveOpen(true);
      setReducerBar(3.5);
      setPipeDn(20);
      setFilterClogged(false);
      setOpenSink(true);
      setOpenShower(true);
      setOpenWasher(false);
    } else {
      setSlopePct(2.0);
      setDrainDn(110);
      setVentOpen(true);
      setFlushPulse(0);
    }
  };

  const particleSpeed = Math.max(0.5, velocityMs * 2.2);

  return (
    <section aria-label="Гидравлик симуляц" className="space-y-6">
      {/* Mode Switcher Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => setMode('supply')}
            className={`px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
              mode === 'supply'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            1. Ус хангамж ба даралт
          </button>
          <button
            type="button"
            onClick={() => setMode('drainage')}
            className={`px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
              mode === 'drainage'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            2. Бохир усны налуу ба сифон
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setRunning((r) => !r)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 whitespace-nowrap"
          >
            {running ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{running ? 'Түр зогсоох' : 'Үргэлжлүүлэх'}</span>
          </button>
          <button
            type="button"
            onClick={resetCurrentSim}
            className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Анхны утга</span>
          </button>
        </div>
      </div>

      {/* Two-Zone Sandbox Layout: Left 65% Visual Stage, Right 35% Control & Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Interactive Stage */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-5 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-xl font-semibold text-slate-900">
                {mode === 'supply'
                  ? 'Орон сууцны ус хангамжийн гидравлик схем'
                  : 'Таталцлын ариутгах татуурга ба сифоны огтлол'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {mode === 'supply'
                  ? 'Хоолойн голч, даралт бууруулагч ба хэрэглээний цэгүүдийн харилцан хамаарал'
                  : 'Уналтын налуу ба босоо агааржуулалт урсгал болон үнэрийн түгжээнд хэрхэн нөлөөлөхийг харна уу'}
              </p>
            </div>

            {/* Dual-Coded Status Banner */}
            <div
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border ${
                (mode === 'supply' ? supplyStatus.kind : drainStatus.kind) === 'ok'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : (mode === 'supply' ? supplyStatus.kind : drainStatus.kind) === 'warn'
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : 'bg-red-50 text-red-800 border-red-200'
              }`}
            >
              {(mode === 'supply' ? supplyStatus.kind : drainStatus.kind) === 'ok' ? (
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>{mode === 'supply' ? supplyStatus.label : drainStatus.label}</span>
            </div>
          </div>

          {/* Interactive SVG Canvas */}
          <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 overflow-hidden">
            {mode === 'supply' ? (
              <svg viewBox="0 0 760 360" className="w-full h-auto" role="img" aria-label="Ус хангамжийн схем">
                {/* Grid backdrop */}
                <defs>
                  <pattern id="gridSupply" width="30" height="30" patternUnits="userSpaceOnUse">
                    <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#1E293B" strokeWidth="1" />
                  </pattern>
                </defs>
                <rect width="760" height="360" fill="url(#gridSupply)" />

                {/* Main Riser (Vertical) */}
                <rect x="44" y="20" width="24" height="320" rx="4" fill="#0369A1" stroke="#38BDF8" strokeWidth="2" />
                <text x="20" y="348" fill="#94A3B8" fontSize="11" fontFamily="IBM Plex Mono">
                  БОСОО (6.5 bar)
                </text>

                {/* Horizontal Supply Header */}
                <line
                  x1="68"
                  y1="175"
                  x2="440"
                  y2="175"
                  stroke={mainValveOpen ? '#0284C7' : '#475569'}
                  strokeWidth={pipeDn === 16 ? 8 : pipeDn === 20 ? 12 : 16}
                  strokeLinecap="round"
                />

                {/* Ball Valve */}
                <g
                  className="cursor-pointer"
                  onClick={() => {
                    playWrenchClick(false);
                    setMainValveOpen((v) => !v);
                    onCompleteSimulation();
                  }}
                >
                  <rect x="112" y="159" width="36" height="32" rx="4" fill="#D97706" stroke="#FCD34D" strokeWidth="1.5" />
                  <rect
                    x={mainValveOpen ? 116 : 126}
                    y={mainValveOpen ? 148 : 156}
                    width={mainValveOpen ? 28 : 8}
                    height={mainValveOpen ? 8 : 38}
                    rx="2"
                    fill="#EF4444"
                  />
                  <text x="104" y="210" fill="#E2E8F0" fontSize="10" fontFamily="IBM Plex Mono">
                    {mainValveOpen ? 'ХААЛТ: НЭЭЛТТЭЙ' : 'ХААЛТ: ХААЛТТАЙ'}
                  </text>
                </g>

                {/* Mud Filter */}
                <g
                  className="cursor-pointer"
                  onClick={() => {
                    playWrenchClick(false);
                    setFilterClogged((f) => !f);
                  }}
                >
                  <rect x="205" y="160" width="44" height="30" rx="4" fill="#B45309" stroke="#FCD34D" strokeWidth="1.5" />
                  <polygon points="220,190 245,190 236,216 212,216" fill={filterClogged ? '#DC2626' : '#92400E'} stroke="#FCD34D" />
                  <text x="195" y="232" fill={filterClogged ? '#FCA5A5' : '#94A3B8'} fontSize="10" fontFamily="IBM Plex Mono">
                    {filterClogged ? 'ШҮҮЛТҮҮР БӨГЛӨРСӨН' : 'ШҮҮЛТҮҮР ЦЭВЭР'}
                  </text>
                </g>

                {/* Pressure Reducer */}
                <g>
                  <rect x="295" y="155" width="46" height="40" rx="6" fill="#0F172A" stroke="#38BDF8" strokeWidth="2" />
                  <circle cx="318" cy="136" r="18" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="2" />
                  <text x="307" y="140" fill="#0F172A" fontSize="10" fontWeight="bold" fontFamily="IBM Plex Mono">
                    {reducerBar.toFixed(1)}
                  </text>
                  <text x="283" y="212" fill="#94A3B8" fontSize="10" fontFamily="IBM Plex Mono">
                    БУУРУУЛАГЧ
                  </text>
                </g>

                {/* Brass Manifold */}
                <rect x="430" y="75" width="38" height="205" rx="6" fill="#D97706" stroke="#FDE68A" strokeWidth="2" />
                <text x="415" y="63" fill="#FDE68A" fontSize="11" fontFamily="IBM Plex Mono">
                  КОЛЛЕКТОР ({manifoldBar.toFixed(1)} bar)
                </text>

                {/* 3 Fixture Branches */}
                {[
                  { y: 100, open: openSink, name: 'Угаалтуур', lpm: 6, toggle: () => setOpenSink((v) => !v) },
                  { y: 175, open: openShower, name: 'Шүршүүр', lpm: 10, toggle: () => setOpenShower((v) => !v) },
                  { y: 250, open: openWasher, name: 'Бойлер / Машин', lpm: 8, toggle: () => setOpenWasher((v) => !v) },
                ].map((branch, idx) => {
                  const flowOn = mainValveOpen && branch.open;
                  return (
                    <g key={branch.name}>
                      <line
                        x1="468"
                        y1={branch.y}
                        x2="620"
                        y2={branch.y}
                        stroke={flowOn ? '#38BDF8' : '#334155'}
                        strokeWidth={pipeDn === 16 ? 6 : pipeDn === 20 ? 9 : 11}
                      />
                      {/* Animated water pulses */}
                      {flowOn &&
                        [0, 1, 2].map((p) => {
                          const xPos = 475 + ((tick * particleSpeed * 4 + p * 48 + idx * 14) % 140);
                          return (
                            <circle
                              key={p}
                              cx={xPos}
                              cy={branch.y}
                              r="3.2"
                              fill="#E0F2FE"
                            />
                          );
                        })}
                      {/* Clickable Fixture Valve Box */}
                      <g
                        className="cursor-pointer"
                        onClick={() => {
                          playWrenchClick(false);
                          branch.toggle();
                          onCompleteSimulation();
                        }}
                      >
                        <rect
                          x="620"
                          y={branch.y - 22}
                          width="122"
                          height="44"
                          rx="8"
                          fill={branch.open ? '#0C4A6E' : '#1E293B'}
                          stroke={branch.open ? '#38BDF8' : '#475569'}
                          strokeWidth="1.5"
                        />
                        <text x="632" y={branch.y - 3} fill="#FFFFFF" fontSize="12" fontWeight="600">
                          {branch.name}
                        </text>
                        <text x="632" y={branch.y + 14} fill={branch.open ? '#7DD3FC' : '#94A3B8'} fontSize="10" fontFamily="IBM Plex Mono">
                          {branch.open ? `НЭЭЛТТЭЙ · ${branch.lpm} л/м` : 'ХААЛТТАЙ'}
                        </text>
                      </g>
                    </g>
                  );
                })}

                {/* Main Pipe Flow Particles */}
                {mainValveOpen &&
                  activeFixtures > 0 &&
                  [0, 1, 2, 3, 4].map((p) => (
                    <circle
                      key={p}
                      cx={75 + ((tick * particleSpeed * 5 + p * 70) % 350)}
                      cy={175}
                      r="3.8"
                      fill="#BAE6FD"
                    />
                  ))}
              </svg>
            ) : (
              <svg viewBox="0 0 760 360" className="w-full h-auto" role="img" aria-label="Ариутгах татуургын схем">
                <defs>
                  <pattern id="gridDrain" width="30" height="30" patternUnits="userSpaceOnUse">
                    <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#1E293B" strokeWidth="1" />
                  </pattern>
                </defs>
                <rect width="760" height="360" fill="url(#gridDrain)" />

                {/* Vent Stack (Right Vertical) */}
                <rect x="615" y="30" width="44" height="300" rx="4" fill="#475569" stroke="#94A3B8" strokeWidth="2" />
                {/* Vent Cap */}
                <rect
                  x="608"
                  y="20"
                  width="58"
                  height="16"
                  rx="3"
                  fill={ventOpen ? '#059669' : '#DC2626'}
                />
                <text x="530" y="55" fill={ventOpen ? '#6EE7B7' : '#FCA5A5'} fontSize="11" fontFamily="IBM Plex Mono">
                  {ventOpen ? 'АГААРЖУУЛАЛТ: НЭЭЛТТЭЙ' : 'АГААРЖУУЛАЛТ: БИТҮҮ!'}
                </text>

                {/* Sink Basin (Left) */}
                <path d="M 55 85 L 155 85 L 140 135 L 70 135 Z" fill="#1E293B" stroke="#CBD5E1" strokeWidth="2" />
                <text x="72" y="74" fill="#E2E8F0" fontSize="11" fontFamily="IBM Plex Mono">
                  УГААЛТУУР
                </text>

                {/* P-Trap Siphon */}
                <path
                  d="M 105 135 L 105 215 Q 105 250 140 250 Q 175 250 175 215 L 175 190 L 210 190"
                  fill="none"
                  stroke="#64748B"
                  strokeWidth="26"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Siphon Water Seal */}
                <path
                  d="M 105 215 Q 105 250 140 250 Q 175 250 175 215"
                  fill="none"
                  stroke={siphonWaterLevel > 30 ? '#0EA5E9' : '#EF4444'}
                  strokeWidth="18"
                  strokeOpacity={siphonWaterLevel / 60}
                />
                <text x="75" y="285" fill={ventOpen ? '#7DD3FC' : '#FCA5A5'} fontSize="11" fontFamily="IBM Plex Mono">
                  Сифон ус: {siphonWaterLevel} мм {ventOpen ? '(Хэвийн)' : '(Сорогдсон!)'}
                </text>

                {/* Horizontal Reference Line */}
                <line x1="210" y1="190" x2="615" y2="190" stroke="#475569" strokeWidth="1.5" strokeDasharray="5 5" />

                {/* Sloped Drainage Pipe */}
                <g transform={`rotate(${slopePct * 1.4}, 210, 190)`}>
                  <rect
                    x="208"
                    y={drainDn === 50 ? 176 : 170}
                    width="412"
                    height={drainDn === 50 ? 28 : 40}
                    rx="4"
                    fill="#334155"
                    stroke="#94A3B8"
                    strokeWidth="2"
                  />
                  {/* Water Stream */}
                  <rect
                    x="212"
                    y={drainDn === 50 ? 190 : 192}
                    width="404"
                    height={flushPulse > 0 ? 14 : 8}
                    fill="#0284C7"
                    opacity="0.85"
                  />
                  {/* Solid Waste Particles behavior based on slope */}
                  {[0, 1, 2, 3].map((p) => {
                    const isStuckLow = slopePct < optimalMin;
                    const isStrandedHigh = slopePct > optimalMax + 1.0;
                    const baseSpeed = isStuckLow ? 0.8 : isStrandedHigh ? 1.4 : 4.5;
                    const xVal = isStuckLow || isStrandedHigh
                      ? 260 + p * 75 + ((tick * baseSpeed) % 45)
                      : 220 + ((tick * baseSpeed + p * 95) % 385);
                    return (
                      <rect
                        key={p}
                        x={xVal}
                        y={drainDn === 50 ? 189 : 194}
                        width="12"
                        height="8"
                        rx="2"
                        fill={isStuckLow || isStrandedHigh ? '#F59E0B' : '#BAE6FD'}
                      />
                    );
                  })}
                </g>

                {/* Sewer gas arrows if siphon broken */}
                {!ventOpen && (
                  <g>
                    <text x="195" y="160" fill="#FCA5A5" fontSize="12" fontWeight="bold" fontFamily="IBM Plex Mono">
                      ← БОХИР ҮНЭР НЭВТРЭХ ЭРСДЭЛ
                    </text>
                  </g>
                )}
              </svg>
            )}
          </div>

          {/* Live Readout Explanation Bar */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-700 leading-relaxed">
            {mode === 'supply' ? supplyStatus.detail : drainStatus.detail}
          </div>
        </div>

        {/* Right Control & Telemetry Deck */}
        <aside className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 space-y-6">
          <div className="flex items-center gap-2 text-slate-900 pb-3 border-b border-slate-100">
            <Gauge className="w-4 h-4 text-sky-600" />
            <h3 className="text-base font-semibold">Удирдлага ба Хэмжилт</h3>
          </div>

          {mode === 'supply' ? (
            <div className="space-y-5">
              {/* Telemetry Readout Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-xs text-slate-500">Хэрэглэгчийн даралт</div>
                  <div className="font-mono text-lg font-semibold text-slate-900 tabular-nums mt-0.5">
                    {fixtureBar.toFixed(2)} bar
                  </div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-xs text-slate-500">Нийт зарцуулалт</div>
                  <div className="font-mono text-lg font-semibold text-sky-700 tabular-nums mt-0.5">
                    {actualFlowLpm} л/мин
                  </div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-xs text-slate-500">Урсгалын хурд</div>
                  <div className="font-mono text-lg font-semibold text-slate-900 tabular-nums mt-0.5">
                    {velocityMs.toFixed(2)} м/с
                  </div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-xs text-slate-500">Даралтын алдагдал</div>
                  <div className="font-mono text-lg font-semibold text-amber-700 tabular-nums mt-0.5">
                    -{frictionLoss.toFixed(2)} bar
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="space-y-4 pt-2 border-t border-slate-100">
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <label htmlFor="reducer-slider" className="font-medium text-slate-700">
                      Даралт бууруулагч (Редуктор)
                    </label>
                    <span className="font-mono font-semibold text-slate-900 tabular-nums">
                      {reducerBar.toFixed(1)} bar
                    </span>
                  </div>
                  <input
                    id="reducer-slider"
                    type="range"
                    min={1.5}
                    max={6.5}
                    step={0.5}
                    value={reducerBar}
                    onChange={(e) => {
                      setReducerBar(parseFloat(e.target.value));
                      onCompleteSimulation();
                    }}
                    className="w-full accent-sky-600 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="text-xs font-medium text-slate-700 mb-2">
                    Шугамын хоолойн голч (PP-R)
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {([16, 20, 25] as const).map((dn) => (
                      <button
                        key={dn}
                        type="button"
                        onClick={() => {
                          playWrenchClick(false);
                          setPipeDn(dn);
                          onCompleteSimulation();
                        }}
                        className={`py-2 text-xs font-mono rounded-lg border transition-colors ${
                          pipeDn === dn
                            ? 'bg-slate-900 text-white border-slate-900 font-semibold'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        DN{dn} мм
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <div className="text-xs font-medium text-slate-700">
                    Зэрэг ажиллах хэрэглэгчид
                  </div>
                  {[
                    { label: 'Угаалтуур (6 л/мин)', val: openSink, set: setOpenSink },
                    { label: 'Шүршүүр (10 л/мин)', val: openShower, set: setOpenShower },
                    { label: 'Бойлер / Угаалгын машин (8 л/мин)', val: openWasher, set: setOpenWasher },
                  ].map((item) => (
                    <label
                      key={item.label}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer text-xs text-slate-700"
                    >
                      <span>{item.label}</span>
                      <input
                        type="checkbox"
                        checked={item.val}
                        onChange={(e) => {
                          playWrenchClick(false);
                          item.set(e.target.checked);
                          onCompleteSimulation();
                        }}
                        className="w-4 h-4 accent-sky-600"
                      />
                    </label>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    playWrenchClick(false);
                    setFilterClogged((c) => !c);
                  }}
                  className={`w-full py-2.5 px-4 rounded-lg text-xs font-medium border transition-colors ${
                    filterClogged
                      ? 'bg-red-50 text-red-800 border-red-200 hover:bg-red-100'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {filterClogged ? 'Шүүлтүүрийг цэвэрлэх' : 'Гэмтэл турших: Шүүлтүүр бөглөх'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Drainage Telemetry */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-xs text-slate-500">Одоогийн налуу</div>
                  <div className="font-mono text-lg font-semibold text-slate-900 tabular-nums mt-0.5">
                    {slopePct.toFixed(1)}% ({slopePct.toFixed(1)} см/м)
                  </div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-xs text-slate-500">Сифоны усан түгжээ</div>
                  <div className="font-mono text-lg font-semibold text-sky-700 tabular-nums mt-0.5">
                    {siphonWaterLevel} мм
                  </div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <label htmlFor="drain-slope-slider" className="font-medium text-slate-700">
                    Хэвтээ хоолойн уналтын налуу
                  </label>
                  <span className="font-mono font-semibold text-slate-900 tabular-nums">
                    i = {(slopePct / 100).toFixed(3)}
                  </span>
                </div>
                <input
                  id="drain-slope-slider"
                  type="range"
                  min={0.0}
                  max={6.0}
                  step={0.5}
                  value={slopePct}
                  onChange={(e) => {
                    setSlopePct(parseFloat(e.target.value));
                    onCompleteSimulation();
                  }}
                  className="w-full accent-sky-600 cursor-pointer"
                />
                <div className="flex justify-between text-[11px] font-mono text-slate-400 mt-1">
                  <span>0% (Тэгш)</span>
                  <span className="text-emerald-700 font-semibold">2–3% (Норм)</span>
                  <span>6% (Огцом)</span>
                </div>
              </div>

              <div>
                <div className="text-xs font-medium text-slate-700 mb-2">
                  Бохирын хоолойн голч
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {([50, 110] as const).map((dn) => (
                    <button
                      key={dn}
                      type="button"
                      onClick={() => {
                        playWrenchClick(false);
                        setDrainDn(dn);
                      }}
                      className={`py-2 text-xs font-mono rounded-lg border transition-colors ${
                        drainDn === dn
                          ? 'bg-slate-900 text-white border-slate-900 font-semibold'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      DN{dn} мм (Оновч: {dn === 50 ? '3%' : '2%'})
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    playWrenchClick(false);
                    setVentOpen((v) => !v);
                    onCompleteSimulation();
                  }}
                  className={`w-full py-2.5 px-4 rounded-lg text-xs font-medium border flex items-center justify-center gap-2 transition-colors ${
                    ventOpen
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                      : 'bg-red-50 text-red-800 border-red-200 hover:bg-red-100'
                  }`}
                >
                  <Wind className="w-4 h-4" />
                  <span>
                    {ventOpen
                      ? 'Босоо агааржуулагч нээлттэй (Хааж турших)'
                      : 'Агааржуулагч битүү байна (Нээх)'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleFlush}
                  className="w-full py-2.5 px-4 rounded-lg text-xs font-medium bg-sky-600 hover:bg-sky-500 text-white flex items-center justify-center gap-2 transition-colors"
                >
                  <Droplets className="w-4 h-4" />
                  <span>Их хэмжээний ус татах туршилт</span>
                </button>
              </div>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
};
