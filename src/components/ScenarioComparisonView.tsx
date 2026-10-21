import React, { useState } from 'react';
import { Play, Sliders, TrendingDown, BarChart3, ShieldAlert, Cpu } from 'lucide-react';
import { ENERGY_SOURCES, MIMO_SCENARIOS } from '../constants/videoData';
import { ScenarioId, SimulationYear } from '../types/video';

interface ScenarioComparisonViewProps {
  activeScenarioId: ScenarioId;
  activeYear: SimulationYear;
  onSelectScenario: (id: ScenarioId) => void;
  onSelectYear: (year: SimulationYear) => void;
  onJumpToVideoTimestamp: (seconds: number, scenarioId: ScenarioId, year: SimulationYear) => void;
}

export const ScenarioComparisonView: React.FC<ScenarioComparisonViewProps> = ({
  activeScenarioId,
  activeYear,
  onSelectScenario,
  onSelectYear,
  onJumpToVideoTimestamp,
}) => {
  const currentScenario = MIMO_SCENARIOS[activeScenarioId];
  const currentSnapshot = currentScenario.snapshots[activeYear];

  // Interactive What-If Sensitivity Sliders
  const [customPolicyAdj, setCustomPolicyAdj] = useState<number>(currentSnapshot.policyAdj);
  const [customTechMult, setCustomTechMult] = useState<number>(currentSnapshot.techMultiplier);

  // Sync custom sliders when scenario/year changes
  React.useEffect(() => {
    setCustomPolicyAdj(currentSnapshot.policyAdj);
    setCustomTechMult(currentSnapshot.techMultiplier);
  }, [currentSnapshot]);

  // Compute simulated sensitivity delta
  const policyDelta = customPolicyAdj - currentSnapshot.policyAdj;
  const techDelta = customTechMult - currentSnapshot.techMultiplier;
  const simulatedNetCo2 = Math.max(
    8,
    +(currentSnapshot.netCo2 * (1 - policyDelta * 0.45 - techDelta * 0.55)).toFixed(1)
  );
  const simulatedNonFossil = Math.min(
    96,
    Math.max(40, +(currentSnapshot.nonFossilCapacityShare + policyDelta * 18 + techDelta * 24).toFixed(1))
  );

  return (
    <div className="max-w-[1360px] mx-auto px-6 py-8 space-y-8">
      {/* Top Section Header & Scenario Selector Bar */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-slate-800 pb-6">
        <div>
          <div className="text-xs text-sky-400 font-medium mb-1">
            MiMo 闭环多智能体仿真数据重构 · 2010—2050 演化对比
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 balance-text">
            四大宏观能源演化情景与参数敏感性实验室
          </h1>
          <p className="text-sm text-slate-400 mt-1.5 max-w-2xl">
            完全复刻并矢量化重构原视频中的四组情景看板（基准 BAU、政策强化、极端风险、技术突破），支持高清晰度数值读取、跨期横向对比与一键跳转对应视频帧。
          </p>
        </div>

        {/* Interactive Scenario & Year Switcher */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            {(['bau', 'policy', 'risk', 'tech'] as ScenarioId[]).map((sid) => {
              const sc = MIMO_SCENARIOS[sid];
              return (
                <button
                  key={sid}
                  onClick={() => onSelectScenario(sid)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    activeScenarioId === sid
                      ? 'bg-sky-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {sc.code}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            {([2025, 2030, 2045] as SimulationYear[]).map((yr) => (
              <button
                key={yr}
                onClick={() => onSelectYear(yr)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono-tabular font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  activeYear === yr
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {yr}年
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4-Column KPI Summary Strip for Current Scenario & Year */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="text-xs text-slate-400">当前闭环政策调节因子 (policy_adj)</div>
          <div className="text-2xl font-bold font-mono-tabular text-sky-400 mt-1">
            {currentSnapshot.policyAdj.toFixed(2)}
          </div>
          <div className="text-xs text-slate-500 mt-2">
            反映碳配额松紧度与碳价乘数强度
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="text-xs text-slate-400">内生技术转型倍率 (Tech Multiplier)</div>
          <div className="text-2xl font-bold font-mono-tabular text-emerald-400 mt-1">
            → {currentSnapshot.techMultiplier.toFixed(2)}x
          </div>
          <div className="text-xs text-slate-500 mt-2">
            反映风光储学习曲线与度电成本降幅
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="text-xs text-slate-400">{activeYear}年 毛CO2 / 净CO2排放量</div>
          <div className="text-2xl font-bold font-mono-tabular text-amber-400 mt-1">
            {currentSnapshot.grossCo2} / {currentSnapshot.netCo2} <span className="text-sm font-normal text-slate-400">亿吨</span>
          </div>
          <div className="text-xs text-slate-500 mt-2">
            校准自历史真实 CO2 (OWID靶值)
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="text-xs text-slate-400">{activeYear}年 非化石装机 / 消费占比</div>
            <div className="text-2xl font-bold font-mono-tabular text-indigo-400 mt-1">
              {currentSnapshot.nonFossilCapacityShare}% / {currentSnapshot.nonFossilConsumptionShare}%
            </div>
          </div>
          <button
            onClick={() => onJumpToVideoTimestamp(currentSnapshot.videoTimestamp, activeScenarioId, activeYear)}
            className="mt-3 w-full py-1.5 px-3 bg-sky-600/20 hover:bg-sky-600 text-sky-300 hover:text-white border border-sky-500/30 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <Play className="w-3.5 h-3.5" />
            跳转视频对应帧 ({Math.floor(currentSnapshot.videoTimestamp / 60)}:
            {(currentSnapshot.videoTimestamp % 60).toString().padStart(2, '0')})
          </button>
        </div>
      </div>

      {/* Main 2-Column Split: Left = High-Clarity Vector Charts (Rebuilt from Video), Right = 8-Energy Breakdown & Sensitivity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left 7 Columns: Vectorized Dual Trajectory Charts */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-sky-400" />
                  矢量化高清重制图表：{currentScenario.name} (2015—2045)
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  解决原视频小字号坐标轴不易辨认的问题，支持精确读取每5年节点数值
                </p>
              </div>
              <span className="text-xs font-mono-tabular text-slate-400">
                单位: 亿吨 CO2 / 占比 %
              </span>
            </div>

            {/* Chart 1: CO2 Emissions Trajectory SVG */}
            <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 mb-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3 text-xs">
                <span className="font-semibold text-slate-200">
                  图 A：毛CO2排放量 vs 净CO2排放量演化曲线 (亿吨)
                </span>
                <div className="flex items-center gap-4 text-slate-400">
                  <span className="text-cyan-400">● 毛CO2排放量</span>
                  <span className="text-purple-400">● 净CO2排放量</span>
                  <span className="text-blue-400">◆ 历史真实CO2 (OWID靶值)</span>
                </div>
              </div>

              <svg viewBox="0 0 600 190" className="w-full h-44 overflow-visible">
                {/* Horizontal grid lines */}
                {[20, 60, 100, 140].map((val) => {
                  const y = 160 - (val / 140) * 135;
                  return (
                    <g key={val}>
                      <line x1="45" y1={y} x2="570" y2={y} stroke="#1e293b" strokeDasharray="3 3" />
                      <text x="36" y={y + 4} textAnchor="end" className="fill-slate-500 text-[10px] font-mono">
                        {val}
                      </text>
                    </g>
                  );
                })}

                {/* X-axis years */}
                {currentScenario.trajectory.map((pt, i) => {
                  const x = 60 + i * 82;
                  return (
                    <text
                      key={pt.year}
                      x={x}
                      y={180}
                      textAnchor="middle"
                      className={`text-[11px] font-mono ${
                        pt.year === activeYear ? 'fill-sky-400 font-bold' : 'fill-slate-400'
                      }`}
                    >
                      {pt.year}
                    </text>
                  );
                })}

                {/* Gross CO2 Polyline */}
                <polyline
                  fill="none"
                  stroke="#22d3ee"
                  strokeWidth="2.5"
                  points={currentScenario.trajectory
                    .map((pt, i) => `${60 + i * 82},${160 - (pt.grossCo2 / 140) * 135}`)
                    .join(' ')}
                />

                {/* Net CO2 Polyline */}
                <polyline
                  fill="none"
                  stroke="#c084fc"
                  strokeWidth="2.5"
                  points={currentScenario.trajectory
                    .map((pt, i) => `${60 + i * 82},${160 - (pt.netCo2 / 140) * 135}`)
                    .join(' ')}
                />

                {/* Data Points & Labels */}
                {currentScenario.trajectory.map((pt, i) => {
                  const x = 60 + i * 82;
                  const yGross = 160 - (pt.grossCo2 / 140) * 135;
                  const yNet = 160 - (pt.netCo2 / 140) * 135;
                  return (
                    <g key={pt.year}>
                      <circle cx={x} cy={yGross} r="4" fill="#22d3ee" />
                      <text x={x} y={yGross - 8} textAnchor="middle" className="fill-cyan-300 text-[10px] font-mono">
                        {pt.grossCo2}
                      </text>
                      <circle cx={x} cy={yNet} r="4" fill="#c084fc" />
                      <text x={x} y={yNet + 14} textAnchor="middle" className="fill-purple-300 text-[10px] font-mono">
                        {pt.netCo2}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Chart 2: Non-Fossil Share Trajectory SVG */}
            <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3 text-xs">
                <span className="font-semibold text-slate-200">
                  图 B：仿真非化石能源装机占比 (%) vs 消费占比 (%)
                </span>
                <div className="flex items-center gap-4 text-slate-400">
                  <span className="text-emerald-400">● 仿真非化石装机占比(%)</span>
                  <span className="text-fuchsia-400">● 非化石能源消费占比(%)</span>
                </div>
              </div>

              <svg viewBox="0 0 600 180" className="w-full h-40 overflow-visible">
                {[0, 25, 50, 75, 100].map((val) => {
                  const y = 150 - (val / 100) * 125;
                  return (
                    <g key={val}>
                      <line x1="45" y1={y} x2="570" y2={y} stroke="#1e293b" strokeDasharray="3 3" />
                      <text x="36" y={y + 4} textAnchor="end" className="fill-slate-500 text-[10px] font-mono">
                        {val}%
                      </text>
                    </g>
                  );
                })}

                <polyline
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.5"
                  points={currentScenario.trajectory
                    .map((pt, i) => `${60 + i * 82},${150 - (pt.nonFossilInstalled / 100) * 125}`)
                    .join(' ')}
                />

                <polyline
                  fill="none"
                  stroke="#e879f9"
                  strokeWidth="2.5"
                  strokeDasharray="5 3"
                  points={currentScenario.trajectory
                    .map((pt, i) => `${60 + i * 82},${150 - (pt.nonFossilConsumed / 100) * 125}`)
                    .join(' ')}
                />

                {currentScenario.trajectory.map((pt, i) => {
                  const x = 60 + i * 82;
                  const yInst = 150 - (pt.nonFossilInstalled / 100) * 125;
                  const yCons = 150 - (pt.nonFossilConsumed / 100) * 125;
                  return (
                    <g key={pt.year}>
                      <circle cx={x} cy={yInst} r="4" fill="#10b981" />
                      <text x={x} y={yInst - 7} textAnchor="middle" className="fill-emerald-300 text-[10px] font-mono">
                        {pt.nonFossilInstalled}%
                      </text>
                      <circle cx={x} cy={yCons} r="3.5" fill="#e879f9" />
                      <text x={x} y={yCons + 13} textAnchor="middle" className="fill-fuchsia-300 text-[10px] font-mono">
                        {pt.nonFossilConsumed}%
                      </text>
                      <text x={x} y={170} textAnchor="middle" className="fill-slate-400 text-[11px] font-mono">
                        {pt.year}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Academic Mechanism Summary Box */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs text-slate-300 leading-relaxed">
            <span className="font-bold text-white">当前情景演化机理：</span>
            {currentScenario.mechanismDetail}
          </div>
        </div>

        {/* Right 5 Columns: 8-Energy Structure Bars + Interactive Parameter Sandbox */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
          {/* 8 Energy Sources Horizontal Bar Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-400" />
                {activeYear}年 八大能源结构精细拆解
              </h3>
              <span className="text-xs font-mono-tabular text-slate-400">
                {currentScenario.code}
              </span>
            </div>

            <div className="space-y-3">
              {ENERGY_SOURCES.map((src) => {
                const pct = currentSnapshot.mix[src.key] ?? 0;
                return (
                  <div key={src.key} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-200">
                        {src.name} <span className="text-slate-500">({src.enName})</span>
                      </span>
                      <span className="font-mono-tabular font-semibold text-slate-100">
                        {(pct / 100).toFixed(2)} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className="h-full transition-all duration-300 rounded-full"
                        style={{
                          width: `${Math.max(2, pct)}%`,
                          backgroundColor: src.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Interactive Parameter Sensitivity Sandbox */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-sky-400" />
                MiMo 闭环参数敏感性交互推演
              </h3>
              <button
                onClick={() => {
                  setCustomPolicyAdj(currentSnapshot.policyAdj);
                  setCustomTechMult(currentSnapshot.techMultiplier);
                }}
                className="text-xs text-slate-400 hover:text-white"
              >
                还原基准值
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-300">政策调节因子 (policy_adj: 碳价与配额强度)</span>
                  <span className="font-mono-tabular font-bold text-sky-400">{customPolicyAdj.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.85"
                  max="1.30"
                  step="0.01"
                  value={customPolicyAdj}
                  onChange={(e) => setCustomPolicyAdj(parseFloat(e.target.value))}
                  className="w-full accent-sky-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-300">技术转型倍率 (Tech Multiplier: 清洁降本速率)</span>
                  <span className="font-mono-tabular font-bold text-emerald-400">{customTechMult.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="1.00"
                  max="1.50"
                  step="0.01"
                  value={customTechMult}
                  onChange={(e) => setCustomTechMult(parseFloat(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                <div className="text-[11px] text-slate-400">推演净CO2排放量</div>
                <div className="text-lg font-bold font-mono-tabular text-amber-400 mt-0.5">
                  {simulatedNetCo2} 亿吨
                </div>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                <div className="text-[11px] text-slate-400">推演非化石装机占比</div>
                <div className="text-lg font-bold font-mono-tabular text-emerald-400 mt-0.5">
                  {simulatedNonFossil}%
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cross-Scenario 2045 Comparison Matrix Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-100">
              2045年 四大仿真情景核心指标全维横评表
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              直观对比不同政策干预与技术跃迁组合下的远期能源结构收敛形态
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" /> 煤电兜底区间: 22%—29%
            </span>
            <span className="flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5 text-sky-400" /> 光伏主力区间: 42%—47%
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-3 px-4 font-semibold">仿真情景名称</th>
                <th className="py-3 px-4 font-semibold font-mono-tabular">policy_adj</th>
                <th className="py-3 px-4 font-semibold font-mono-tabular">技术转型倍率</th>
                <th className="py-3 px-4 font-semibold font-mono-tabular">煤炭占比</th>
                <th className="py-3 px-4 font-semibold font-mono-tabular">光伏占比</th>
                <th className="py-3 px-4 font-semibold font-mono-tabular">风电占比</th>
                <th className="py-3 px-4 font-semibold font-mono-tabular">净CO2 (亿吨)</th>
                <th className="py-3 px-4 font-semibold text-right">视频定位</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 font-mono-tabular">
              {(['bau', 'policy', 'risk', 'tech'] as ScenarioId[]).map((sid) => {
                const sc = MIMO_SCENARIOS[sid];
                const s2045 = sc.snapshots[2045];
                const isSelected = activeScenarioId === sid;
                return (
                  <tr
                    key={sid}
                    className={`transition-colors ${
                      isSelected ? 'bg-sky-950/30 text-white' : 'text-slate-300 hover:bg-slate-800/40'
                    }`}
                  >
                    <td className="py-3 px-4 font-sans font-semibold">
                      {sc.code} · {sc.badgeText}
                    </td>
                    <td className="py-3 px-4 text-sky-400">{s2045.policyAdj.toFixed(2)}</td>
                    <td className="py-3 px-4 text-emerald-400">{s2045.techMultiplier.toFixed(2)}</td>
                    <td className="py-3 px-4 text-amber-400">{s2045.mix.coal}%</td>
                    <td className="py-3 px-4 text-sky-300">{s2045.mix.solar}%</td>
                    <td className="py-3 px-4 text-emerald-300">{s2045.mix.wind}%</td>
                    <td className="py-3 px-4 font-bold">{s2045.netCo2}</td>
                    <td className="py-3 px-4 text-right font-sans">
                      <button
                        onClick={() => onJumpToVideoTimestamp(s2045.videoTimestamp, sid, 2045)}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-sky-600 text-slate-200 hover:text-white transition-colors"
                      >
                        定位帧
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
