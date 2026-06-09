import { useMemo } from 'react';
import { Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { useAppStore } from '@/store/appStore';
import {
  Database,
  Star,
  Activity,
  Calendar,
  Clock,
  Target,
  BarChart3,
  PieChart,
  Sparkles,
  TrendingUp,
  Cloud,
  Sun,
  CloudSun,
  Camera,
  Thermometer,
  Droplets,
} from 'lucide-react';

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const SPECTRAL_TYPE_COLORS: Record<string, string> = {
  O: '#3b82f6',
  B: '#0ea5e9',
  A: '#e2e8f0',
  F: '#facc15',
  G: '#f59e0b',
  K: '#f97316',
  M: '#ef4444',
  Unknown: '#64748b',
};

const SPECTRAL_TYPE_LABELS: Record<string, string> = {
  O: 'O 型',
  B: 'B 型',
  A: 'A 型',
  F: 'F 型',
  G: 'G 型',
  K: 'K 型',
  M: 'M 型',
  Unknown: '未知',
};

const weatherIcons: Record<string, typeof Sun> = {
  clear: Sun,
  partly_cloudy: CloudSun,
  cloudy: Cloud,
  rainy: Cloud,
  snowy: Cloud,
  windy: Cloud,
  hazy: Cloud,
};

const weatherLabels: Record<string, string> = {
  clear: '晴',
  partly_cloudy: '多云',
  cloudy: '阴',
  rainy: '雨',
  snowy: '雪',
  windy: '大风',
  hazy: '雾霾',
};

function extractSpectralType(name: string): string {
  const match = name.match(/\b([OBAFGKM])(\d|\.\d)?(I|II|III|IV|V|VI|VII)?\b/);
  if (match) return match[1];
  const upper = name.toUpperCase();
  if (upper.includes('O9')) return 'O';
  if (upper.includes('B0') || upper.includes('B5')) return 'B';
  if (upper.includes('A0') || upper.includes('A5')) return 'A';
  if (upper.includes('F0') || upper.includes('F5')) return 'F';
  if (upper.includes('G2') || upper.includes('G5')) return 'G';
  if (upper.includes('K0') || upper.includes('K5')) return 'K';
  if (upper.includes('M0') || upper.includes('M5')) return 'M';
  return 'Unknown';
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: typeof Database;
  gradient: string;
  iconColor: string;
}

function StatCard({ title, value, subtitle, icon: Icon, gradient, iconColor }: StatCardProps) {
  return (
    <div className={`p-4 rounded-xl bg-gradient-to-br ${gradient} border border-slate-700/60 shadow-lg`}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="text-[11px] font-medium text-slate-300/80">{title}</div>
          <div className="text-2xl font-bold text-white">{value}</div>
          {subtitle && <div className="text-[10px] text-slate-400">{subtitle}</div>}
        </div>
        <div className={`p-2 rounded-lg bg-slate-900/40 ${iconColor}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

export default function StatsDashboard() {
  const { spectra, beObservations, observationLogs } = useAppStore();

  const stats = useMemo(() => {
    const spectralTypeCounts: Record<string, number> = {
      O: 0, B: 0, A: 0, F: 0, G: 0, K: 0, M: 0, Unknown: 0,
    };
    spectra.forEach((s) => {
      const type = extractSpectralType(s.name);
      spectralTypeCounts[type] = (spectralTypeCounts[type] || 0) + 1;
    });

    const dateCounts: Record<string, number> = {};
    spectra.forEach((s) => {
      if (s.observationDate) {
        dateCounts[s.observationDate] = (dateCounts[s.observationDate] || 0) + 1;
      }
    });
    const sortedDates = Object.keys(dateCounts).sort();
    const recentDates = sortedDates.slice(-14);

    const beTargets = new Set(beObservations.map((o) => o.targetName));

    const sortedLogs = [...observationLogs].sort((a, b) => {
      const da = `${a.observationDate} ${a.observationTime || ''}`;
      const db = `${b.observationDate} ${b.observationTime || ''}`;
      return db.localeCompare(da);
    });

    const totalObservations = beObservations.length;
    const uniqueTargets = new Set(spectra.map((s) => s.targetName)).size;

    return {
      spectralTypeCounts,
      dateCounts,
      recentDates,
      beTargetCount: beTargets.size,
      beTargets: Array.from(beTargets),
      sortedLogs,
      totalSpectra: spectra.length,
      totalObservations,
      uniqueTargets,
    };
  }, [spectra, beObservations, observationLogs]);

  const pieData = useMemo(() => {
    const types = Object.keys(stats.spectralTypeCounts).filter(
      (k) => stats.spectralTypeCounts[k] > 0
    );
    return {
      labels: types.map((t) => SPECTRAL_TYPE_LABELS[t] || t),
      datasets: [
        {
          data: types.map((t) => stats.spectralTypeCounts[t]),
          backgroundColor: types.map((t) => SPECTRAL_TYPE_COLORS[t] || '#64748b'),
          borderColor: 'rgba(15, 23, 42, 0.8)',
          borderWidth: 2,
          hoverOffset: 6,
        },
      ],
    };
  }, [stats.spectralTypeCounts]);

  const pieOptions = useMemo(() => ({
    responsive: true,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          color: '#94a3b8',
          font: { size: 11 },
          padding: 10,
          usePointStyle: true,
          pointStyle: 'circle',
        },
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: 'rgba(100, 116, 139, 0.5)',
        borderWidth: 1,
        titleColor: '#e2e8f0',
        bodyColor: '#cbd5e1',
        titleFont: { size: 12 },
        bodyFont: { size: 11 },
        padding: 10,
        callbacks: {
          label: (ctx: any) => {
            const total = ctx.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const pct = ((ctx.raw / total) * 100).toFixed(1);
            return `${ctx.label}: ${ctx.raw} 条 (${pct}%)`;
          },
        },
      },
    },
    cutout: '62%',
  }), []);

  const barData = useMemo(() => ({
    labels: stats.recentDates.map((d) => {
      const parts = d.split('-');
      return `${parts[1]}/${parts[2]}`;
    }),
    datasets: [
      {
        label: '光谱数量',
        data: stats.recentDates.map((d) => stats.dateCounts[d]),
        backgroundColor: 'rgba(6, 182, 212, 0.6)',
        borderColor: 'rgba(6, 182, 212, 1)',
        borderWidth: 1,
        borderRadius: 4,
        hoverBackgroundColor: 'rgba(6, 182, 212, 0.8)',
      },
    ],
  }), [stats.recentDates, stats.dateCounts]);

  const barOptions = useMemo(() => ({
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: 'rgba(100, 116, 139, 0.5)',
        borderWidth: 1,
        titleColor: '#e2e8f0',
        bodyColor: '#cbd5e1',
        titleFont: { size: 12 },
        bodyFont: { size: 11 },
        padding: 10,
      },
    },
    scales: {
      x: {
        ticks: { color: '#64748b', font: { size: 10 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 14 },
        grid: { color: 'rgba(51, 65, 85, 0.3)', drawBorder: false },
      },
      y: {
        beginAtZero: true,
        ticks: { color: '#64748b', font: { size: 10 }, stepSize: 1 },
        grid: { color: 'rgba(51, 65, 85, 0.3)', drawBorder: false },
      },
    },
  }), []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-200">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">观测数据统计概览</h1>
            <p className="text-xs text-slate-400">Spectra Library Statistics Dashboard</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            title="光谱总数"
            value={stats.totalSpectra}
            subtitle={`${stats.uniqueTargets} 个目标天体`}
            icon={Database}
            gradient="from-cyan-900/50 to-cyan-900/20"
            iconColor="text-cyan-400"
          />
          <StatCard
            title="Be 星候选"
            value={stats.beTargetCount}
            subtitle={`${stats.totalObservations} 次观测记录`}
            icon={Activity}
            gradient="from-amber-900/50 to-amber-900/20"
            iconColor="text-amber-400"
          />
          <StatCard
            title="观测目标"
            value={stats.uniqueTargets}
            subtitle="独立天体数量"
            icon={Target}
            gradient="from-violet-900/50 to-violet-900/20"
            iconColor="text-violet-400"
          />
          <StatCard
            title="观测日志"
            value={observationLogs.length}
            subtitle="记录总条数"
            icon={Calendar}
            gradient="from-emerald-900/50 to-emerald-900/20"
            iconColor="text-emerald-400"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <div className="lg:col-span-2 p-5 rounded-xl bg-slate-900/60 border border-slate-800/80 shadow-xl">
            <div className="flex items-center gap-2 mb-4">
              <PieChart className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-semibold text-slate-200">按光谱型分布</h2>
            </div>
            {stats.totalSpectra > 0 ? (
              <div className="w-full aspect-square max-w-[320px] mx-auto">
                <Doughnut data={pieData} options={pieOptions} />
              </div>
            ) : (
              <div className="py-16 text-center text-sm text-slate-500">
                <Sparkles className="w-10 h-10 mx-auto mb-2 text-slate-600" />
                暂无光谱数据
              </div>
            )}
            <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-4 gap-2">
              {Object.entries(stats.spectralTypeCounts)
                .filter(([, v]) => v > 0)
                .slice(0, 8)
                .map(([k, v]) => (
                  <div key={k} className="text-center">
                    <div
                      className="w-2 h-2 rounded-full mx-auto mb-1"
                      style={{ backgroundColor: SPECTRAL_TYPE_COLORS[k] }}
                    />
                    <div className="text-[10px] text-slate-500">{SPECTRAL_TYPE_LABELS[k] || k}</div>
                    <div className="text-xs font-semibold text-slate-300">{v}</div>
                  </div>
                ))}
            </div>
          </div>

          <div className="lg:col-span-3 p-5 rounded-xl bg-slate-900/60 border border-slate-800/80 shadow-xl">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-semibold text-slate-200">观测日期光谱数量趋势</h2>
              {stats.recentDates.length > 0 && (
                <span className="ml-auto px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-500">
                  最近 {stats.recentDates.length} 天
                </span>
              )}
            </div>
            {stats.recentDates.length > 0 ? (
              <div className="w-full h-[280px]">
                <Bar data={barData} options={barOptions} />
              </div>
            ) : (
              <div className="py-16 text-center text-sm text-slate-500">
                <TrendingUp className="w-10 h-10 mx-auto mb-2 text-slate-600" />
                暂无带日期的光谱数据
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <div className="lg:col-span-2 p-5 rounded-xl bg-slate-900/60 border border-slate-800/80 shadow-xl">
            <div className="flex items-center gap-2 mb-4">
              <Star className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-slate-200">Be 星候选目标</h2>
              <span className="ml-auto px-2 py-0.5 rounded-full bg-amber-900/40 text-[10px] text-amber-300 border border-amber-800/50">
                {stats.beTargetCount} 个
              </span>
            </div>
            {stats.beTargets.length > 0 ? (
              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                {stats.beTargets.map((target) => {
                  const targetObs = beObservations.filter((o) => o.targetName === target);
                  const latestObs = [...targetObs].sort((a, b) =>
                    b.observationDate.localeCompare(a.observationDate)
                  )[0];
                  return (
                    <div
                      key={target}
                      className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/60 hover:bg-slate-800/70 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                            <Star className="w-3.5 h-3.5 text-white" />
                          </div>
                          <span className="text-sm font-medium text-slate-200">{target}</span>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-900/40 text-amber-300">
                          {targetObs.length} 次观测
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 pl-9">
                        {latestObs && (
                          <>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {latestObs.observationDate}
                            </span>
                            <span className="flex items-center gap-1">
                              <TrendingUp className="w-3 h-3 text-rose-400" />
                              Hα: {latestObs.haEW.toFixed(2)} Å
                            </span>
                            {latestObs.vMagnitude !== undefined && (
                              <span className="flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-yellow-400" />
                                V: {latestObs.vMagnitude.toFixed(2)}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-16 text-center text-sm text-slate-500">
                <Star className="w-10 h-10 mx-auto mb-2 text-slate-600" />
                暂无 Be 星观测数据
              </div>
            )}
          </div>

          <div className="lg:col-span-3 p-5 rounded-xl bg-slate-900/60 border border-slate-800/80 shadow-xl">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-semibold text-slate-200">最近导入 / 观测记录</h2>
              <span className="ml-auto px-2 py-0.5 rounded-full bg-slate-800 text-[10px] text-slate-400">
                {stats.sortedLogs.length} 条记录
              </span>
            </div>
            {stats.sortedLogs.length > 0 ? (
              <div className="relative py-1 space-y-0 max-h-[360px] overflow-y-auto pr-1">
                {stats.sortedLogs.slice(0, 10).map((log, idx) => {
                  const WeatherIcon = weatherIcons[log.weatherCondition || ''] || Cloud;
                  return (
                    <div key={log.id} className="relative pl-7 pb-4 last:pb-0">
                      {idx < stats.sortedLogs.slice(0, 10).length - 1 && (
                        <div className="absolute left-[10px] top-3 bottom-0 w-px bg-slate-700/80" />
                      )}
                      <div className="absolute left-0 top-1.5 w-5 h-5 rounded-full bg-cyan-500/20 border-2 border-cyan-500/60 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                      </div>
                      <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/50">
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <span className="text-sm font-medium text-slate-200">{log.targetName}</span>
                          <span className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                            <Calendar className="w-3 h-3" />
                            {log.observationDate}
                          </span>
                          {log.observationTime && (
                            <span className="flex items-center gap-1 text-[11px] text-slate-500">
                              <Clock className="w-3 h-3" />
                              {log.observationTime}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                          {log.weatherCondition && (
                            <span className="flex items-center gap-1 text-[11px] text-sky-300">
                              <WeatherIcon className="w-3 h-3" />
                              {weatherLabels[log.weatherCondition] || log.weatherCondition}
                            </span>
                          )}
                          {log.seeingQuality && (
                            <span className="text-[11px] text-violet-300">
                              视宁: {log.seeingQuality === 'excellent' ? '极佳' : log.seeingQuality === 'good' ? '良好' : log.seeingQuality === 'fair' ? '一般' : '较差'}
                            </span>
                          )}
                          {log.temperature !== undefined && (
                            <span className="flex items-center gap-1 text-[11px] text-orange-300">
                              <Thermometer className="w-3 h-3" />
                              {log.temperature}°C
                            </span>
                          )}
                          {log.humidity !== undefined && (
                            <span className="flex items-center gap-1 text-[11px] text-sky-300">
                              <Droplets className="w-3 h-3" />
                              {log.humidity}%
                            </span>
                          )}
                          {log.exposureParams?.exposureTime && (
                            <span className="flex items-center gap-1 text-[11px] text-slate-400">
                              <Camera className="w-3 h-3" />
                              {log.exposureParams.exposureTime}s
                              {log.exposureParams.numberOfExposures && ` × ${log.exposureParams.numberOfExposures}`}
                            </span>
                          )}
                        </div>
                        {log.notes && (
                          <p className="mt-2 text-[11px] text-slate-400 line-clamp-2">{log.notes}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-16 text-center text-sm text-slate-500">
                <Clock className="w-10 h-10 mx-auto mb-2 text-slate-600" />
                暂无观测日志
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
