import { useState, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { useAppStore } from '@/store/appStore';
import { measureEquivalentWidth, WAVELENGTHS } from '@/lib/spectralAnalysis';
import { computeStatistics, getTargetsWithActiveAlerts } from '@/lib/alertEngine';
import SpectrumViewer from './SpectrumViewer';
import AlertPanel from './AlertPanel';
import ObservationLogTimeline from './ObservationLogTimeline';
import { Eye, Plus, TrendingUp, Calendar, Layers, Activity, AlertTriangle, FileText, Download } from 'lucide-react';
import type { BeStarObservation, ObservationLogEntry } from '@/types';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

const genId = () => Math.random().toString(36).substring(2, 9);

const weatherLabels: Record<string, string> = {
  clear: '晴',
  partly_cloudy: '多云',
  cloudy: '阴',
  rainy: '雨',
  snowy: '雪',
  windy: '大风',
  hazy: '雾霾',
};

const equipmentLabels: Record<string, string> = {
  excellent: '极佳',
  good: '良好',
  fair: '一般',
  poor: '较差',
  malfunction: '故障',
};

const seeingLabels: Record<string, string> = {
  excellent: '极佳',
  good: '良好',
  fair: '一般',
  poor: '较差',
};

function buildMarkdown(targetName: string, logs: ObservationLogEntry[], observations: BeStarObservation[]): string {
  const sortedLogs = [...logs].sort((a, b) => {
    const da = `${a.observationDate} ${a.observationTime || ''}`;
    const db = `${b.observationDate} ${b.observationTime || ''}`;
    return da.localeCompare(db);
  });

  let md = `# ${targetName} 观测日志\n\n`;
  md += `导出时间：${new Date().toLocaleString('zh-CN')}\n\n`;
  md += `---\n\n`;

  md += `## 观测概览\n\n`;
  md += `- 观测日志条数：${logs.length}\n`;
  md += `- 光谱观测次数：${observations.length}\n`;
  if (sortedLogs.length > 0) {
    md += `- 时间跨度：${sortedLogs[0].observationDate} 至 ${sortedLogs[sortedLogs.length - 1].observationDate}\n`;
  }
  md += `\n---\n\n`;

  md += `## 日志详情\n\n`;
  sortedLogs.forEach((log, idx) => {
    md += `### ${idx + 1}. ${log.observationDate}`;
    if (log.observationTime) md += ` ${log.observationTime}`;
    md += `\n\n`;

    const meta: string[] = [];
    if (log.weatherCondition) meta.push(`天气：${weatherLabels[log.weatherCondition] || log.weatherCondition}`);
    if (log.equipmentStatus) meta.push(`设备：${equipmentLabels[log.equipmentStatus] || log.equipmentStatus}`);
    if (log.seeingQuality) meta.push(`视宁度：${seeingLabels[log.seeingQuality] || log.seeingQuality}`);
    if (log.temperature !== undefined) meta.push(`温度：${log.temperature}°C`);
    if (log.humidity !== undefined) meta.push(`湿度：${log.humidity}%`);
    if (meta.length > 0) md += `- ${meta.join(' | ')}\n`;

    if (log.exposureParams) {
      const ep = log.exposureParams;
      const eparts: string[] = [];
      if (ep.exposureTime !== undefined) eparts.push(`曝光 ${ep.exposureTime}s`);
      if (ep.numberOfExposures !== undefined) eparts.push(`${ep.numberOfExposures} 张`);
      if (ep.binning) eparts.push(`Binning ${ep.binning}`);
      if (ep.filter) eparts.push(`滤光片 ${ep.filter}`);
      if (ep.gain !== undefined) eparts.push(`Gain ${ep.gain}`);
      if (ep.temperature !== undefined) eparts.push(`CCD ${ep.temperature}°C`);
      if (eparts.length > 0) md += `- 曝光参数：${eparts.join('，')}\n`;
    }

    if (log.notes) {
      md += `\n**备注**\n\n${log.notes}\n`;
    }

    md += `\n---\n\n`;
  });

  if (observations.length > 0) {
    md += `## 光谱测量记录\n\n`;
    md += `| 日期 | Hα EW (Å) | Hβ EW (Å) | V 星等 | 备注 |\n`;
    md += `| --- | --- | --- | --- | --- |\n`;
    observations
      .slice()
      .sort((a, b) => a.observationDate.localeCompare(b.observationDate))
      .forEach((o) => {
        md += `| ${o.observationDate} | ${o.haEW.toFixed(2)} | ${o.hbEW ? o.hbEW.toFixed(2) : '—'} | ${o.vMagnitude ? o.vMagnitude.toFixed(3) : '—'} | ${o.notes || ''} |\n`;
      });
  }

  return md;
}

function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function printPDF(targetName: string, logs: ObservationLogEntry[], observations: BeStarObservation[]) {
  const sortedLogs = [...logs].sort((a, b) => {
    const da = `${a.observationDate} ${a.observationTime || ''}`;
    const db = `${b.observationDate} ${b.observationTime || ''}`;
    return da.localeCompare(db);
  });
  const sortedObs = [...observations].sort((a, b) => a.observationDate.localeCompare(b.observationDate));

  let html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>${targetName} 观测日志</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; }
  h1 { color: #0e7490; border-bottom: 2px solid #0e7490; padding-bottom: 10px; }
  h2 { color: #0891b2; margin-top: 30px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
  h3 { color: #334155; margin-top: 20px; }
  .meta { color: #64748b; font-size: 14px; }
  .log-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 12px 0; }
  .log-meta { display: flex; flex-wrap: wrap; gap: 12px; font-size: 13px; color: #475569; margin-bottom: 8px; }
  .log-meta span { background: #fff; padding: 2px 8px; border-radius: 4px; border: 1px solid #e2e8f0; }
  .notes { background: #fffbeb; border-left: 3px solid #f59e0b; padding: 8px 12px; margin-top: 8px; font-size: 14px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
  th, td { border: 1px solid #e2e8f0; padding: 8px 12px; text-align: left; }
  th { background: #f1f5f9; color: #334155; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 12px; text-align: center; }
</style>
</head>
<body>
<h1>${targetName} 观测日志</h1>
<p class="meta">导出时间：${new Date().toLocaleString('zh-CN')}</p>

<h2>观测概览</h2>
<ul>
  <li>观测日志条数：${logs.length}</li>
  <li>光谱观测次数：${observations.length}</li>
  ${sortedLogs.length > 0 ? `<li>时间跨度：${sortedLogs[0].observationDate} 至 ${sortedLogs[sortedLogs.length - 1].observationDate}</li>` : ''}
</ul>

<h2>日志详情</h2>
`;

  sortedLogs.forEach((log, idx) => {
    html += `<div class="log-card">`;
    html += `<h3>${idx + 1}. ${log.observationDate}${log.observationTime ? ' ' + log.observationTime : ''}</h3>`;
    html += `<div class="log-meta">`;
    if (log.weatherCondition) html += `<span>🌤 ${weatherLabels[log.weatherCondition] || log.weatherCondition}</span>`;
    if (log.equipmentStatus) html += `<span>📷 ${equipmentLabels[log.equipmentStatus] || log.equipmentStatus}</span>`;
    if (log.seeingQuality) html += `<span>✨ ${seeingLabels[log.seeingQuality] || log.seeingQuality}</span>`;
    if (log.temperature !== undefined) html += `<span>🌡 ${log.temperature}°C</span>`;
    if (log.humidity !== undefined) html += `<span>💧 ${log.humidity}%</span>`;
    html += `</div>`;
    if (log.exposureParams) {
      const ep = log.exposureParams;
      const eparts: string[] = [];
      if (ep.exposureTime !== undefined) eparts.push(`曝光 ${ep.exposureTime}s`);
      if (ep.numberOfExposures !== undefined) eparts.push(`${ep.numberOfExposures} 张`);
      if (ep.binning) eparts.push(`Binning ${ep.binning}`);
      if (ep.filter) eparts.push(`滤光片 ${ep.filter}`);
      if (ep.gain !== undefined) eparts.push(`Gain ${ep.gain}`);
      if (ep.temperature !== undefined) eparts.push(`CCD ${ep.temperature}°C`);
      if (eparts.length > 0) html += `<div class="meta">📸 ${eparts.join('，')}</div>`;
    }
    if (log.notes) html += `<div class="notes">${log.notes.replace(/\n/g, '<br>')}</div>`;
    html += `</div>`;
  });

  if (sortedObs.length > 0) {
    html += `<h2>光谱测量记录</h2>`;
    html += `<table><tr><th>日期</th><th>Hα EW (Å)</th><th>Hβ EW (Å)</th><th>V 星等</th><th>备注</th></tr>`;
    sortedObs.forEach((o) => {
      html += `<tr><td>${o.observationDate}</td><td>${o.haEW.toFixed(2)}</td><td>${o.hbEW ? o.hbEW.toFixed(2) : '—'}</td><td>${o.vMagnitude ? o.vMagnitude.toFixed(3) : '—'}</td><td>${o.notes || ''}</td></tr>`;
    });
    html += `</table>`;
  }

  html += `<div class="footer">恒星光谱分类与 Be 星监测系统 · 自动生成</div>`;
  html += `</body></html>`;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  }
}

export default function BeStarMonitor() {
  const {
    spectra,
    beObservations,
    observationLogs,
    selectedTargetName,
    setSelectedTarget,
    addBeObservation,
    currentSpectrumId,
    alerts,
    alertEvaluations,
    alertConfig,
  } = useAppStore();

  const [overlayIds, setOverlayIds] = useState<string[]>([]);

  const activeAlertTargets = useMemo(() => {
    const active = alerts.filter((a) => !a.acknowledged);
    return new Set(active.map((a) => a.targetName));
  }, [alerts]);

  const targetAlertMap = useMemo(() => {
    const map = new Map<string, typeof alerts>();
    alerts.forEach((a) => {
      if (!map.has(a.targetName)) {
        map.set(a.targetName, []);
      }
      map.get(a.targetName)!.push(a);
    });
    return map;
  }, [alerts]);

  const targetStatsMap = useMemo(() => {
    const map = new Map<string, Record<string, any>>();
    alertEvaluations.forEach((e) => {
      map.set(e.targetName, e.perLineStats);
    });
    return map;
  }, [alertEvaluations]);

  const uniqueTargets = useMemo(() => {
    const set = new Set<string>();
    spectra.forEach((s) => set.add(s.targetName));
    beObservations.forEach((o) => set.add(o.targetName));
    observationLogs.forEach((l) => set.add(l.targetName));
    return Array.from(set);
  }, [spectra, beObservations, observationLogs]);

  const targetObservations = useMemo(() => {
    if (!selectedTargetName) return [];
    return beObservations
      .filter((o) => o.targetName === selectedTargetName)
      .sort((a, b) => a.observationDate.localeCompare(b.observationDate));
  }, [beObservations, selectedTargetName]);

  const targetLogs = useMemo(() => {
    if (!selectedTargetName) return [];
    return observationLogs.filter((l) => l.targetName === selectedTargetName);
  }, [observationLogs, selectedTargetName]);

  const targetSpectra = useMemo(() => {
    if (!selectedTargetName) return [];
    return spectra.filter((s) => s.targetName === selectedTargetName);
  }, [spectra, selectedTargetName]);

  const logDateMap = useMemo(() => {
    const map = new Map<string, ObservationLogEntry[]>();
    targetLogs.forEach((log) => {
      if (!map.has(log.observationDate)) {
        map.set(log.observationDate, []);
      }
      map.get(log.observationDate)!.push(log);
    });
    return map;
  }, [targetLogs]);

  const timeSeriesData = useMemo(() => {
    const dates = targetObservations.map((o) => o.observationDate);
    const haValues = targetObservations.map((o) => o.haEW);
    const hbValues = targetObservations.map((o) => o.hbEW).filter((v): v is number => v !== undefined);

    const haStats = computeStatistics(haValues, alertConfig.sigmaThreshold);
    const hbStats = computeStatistics(hbValues, alertConfig.sigmaThreshold);

    const logMarkerData = targetObservations.map((o) => {
      const logs = logDateMap.get(o.observationDate);
      if (logs && logs.length > 0) {
        const log = logs[0];
        const parts: string[] = [];
        if (log.weatherCondition) parts.push(weatherLabels[log.weatherCondition] || log.weatherCondition);
        if (log.seeingQuality) parts.push(seeingLabels[log.seeingQuality]);
        if (log.exposureParams?.exposureTime !== undefined) parts.push(`${log.exposureParams.exposureTime}s`);
        return {
          y: o.haEW,
          extra: {
            hasLog: true,
            logs,
            summary: parts.join(' · ') || '有观测日志',
          },
        };
      }
      return null;
    });

    const datasets: any[] = [
      {
        label: 'Hα EW (Å)',
        data: targetObservations.map((o) => o.haEW),
        borderColor: '#00d4ff',
        backgroundColor: '#00d4ff30',
        borderWidth: 2,
        pointRadius: 5,
        pointBackgroundColor: '#00d4ff',
        tension: 0.25,
        fill: false,
      },
    ];

    if (haStats) {
      datasets.push(
        {
          label: `Hα +${alertConfig.sigmaThreshold}σ`,
          data: dates.map(() => haStats.upperBound),
          borderColor: '#00d4ff60',
          borderWidth: 1,
          borderDash: [4, 4],
          pointRadius: 0,
          tension: 0,
          fill: false,
        },
        {
          label: `Hα -${alertConfig.sigmaThreshold}σ`,
          data: dates.map(() => haStats.lowerBound),
          borderColor: '#00d4ff60',
          borderWidth: 1,
          borderDash: [4, 4],
          pointRadius: 0,
          tension: 0,
          fill: '+1',
          backgroundColor: 'rgba(0, 212, 255, 0.05)',
        }
      );
    }

    datasets.push({
      label: 'Hβ EW (Å)',
      data: targetObservations.map((o) => o.hbEW ?? null),
      borderColor: '#ff9f40',
      backgroundColor: '#ff9f4030',
      borderWidth: 2,
      pointRadius: 4,
      pointBackgroundColor: '#ff9f40',
      tension: 0.25,
      fill: false,
    });

    if (hbStats && hbValues.length === haValues.length) {
      datasets.push(
        {
          label: `Hβ +${alertConfig.sigmaThreshold}σ`,
          data: dates.map(() => hbStats.upperBound),
          borderColor: '#ff9f4060',
          borderWidth: 1,
          borderDash: [4, 4],
          pointRadius: 0,
          tension: 0,
          fill: false,
        },
        {
          label: `Hβ -${alertConfig.sigmaThreshold}σ`,
          data: dates.map(() => hbStats.lowerBound),
          borderColor: '#ff9f4060',
          borderWidth: 1,
          borderDash: [4, 4],
          pointRadius: 0,
          tension: 0,
          fill: '+1',
          backgroundColor: 'rgba(255, 159, 64, 0.05)',
        }
      );
    }

    datasets.push({
      label: '观测日志',
      data: logMarkerData,
      borderColor: 'transparent',
      backgroundColor: 'transparent',
      pointRadius: (ctx: any) => {
        const val = ctx.raw;
        return val && val.extra && val.extra.hasLog ? 8 : 0;
      },
      pointStyle: 'rectRot',
      pointBackgroundColor: '#fbbf24',
      pointBorderColor: '#92400e',
      pointBorderWidth: 2,
      showLine: false,
      tooltip: {
        enabled: true,
      },
    });

    return {
      labels: dates,
      datasets,
    };
  }, [targetObservations, alertConfig.sigmaThreshold, logDateMap]);

  const magSeriesData = useMemo(() => {
    const dates = targetObservations.map((o) => o.observationDate);
    return {
      labels: dates,
      datasets: [
        {
          label: 'V 星等',
          data: targetObservations.map((o) => o.vMagnitude ?? null),
          borderColor: '#7c5cff',
          backgroundColor: '#7c5cff30',
          borderWidth: 2,
          pointRadius: 4,
          pointBackgroundColor: '#7c5cff',
          tension: 0.25,
          fill: false,
        },
      ],
    };
  }, [targetObservations]);

  const toggleOverlay = (id: string) => {
    setOverlayIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const measureCurrent = () => {
    const current = spectra.find((s) => s.id === currentSpectrumId);
    if (!current) return;
    const haEW = measureEquivalentWidth(current.points, WAVELENGTHS.H_ALPHA);
    const hbEW = measureEquivalentWidth(current.points, WAVELENGTHS.H_BETA);
    const obs: BeStarObservation = {
      id: genId(),
      targetName: current.targetName,
      observationDate: current.observationDate,
      spectrumId: current.id,
      haEW: Number(haEW.toFixed(3)),
      hbEW: Number(hbEW.toFixed(3)),
      vMagnitude: undefined,
      notes: '自动测量',
    };
    addBeObservation(obs);
  };

  const handleExport = (format: 'md' | 'pdf') => {
    if (!selectedTargetName) return;
    if (format === 'md') {
      const md = buildMarkdown(selectedTargetName, targetLogs, targetObservations);
      const safeName = selectedTargetName.replace(/[\\/:*?"<>|]/g, '_');
      downloadFile(`${safeName}-观测日志.md`, md, 'text/markdown;charset=utf-8');
    } else {
      printPDF(selectedTargetName, targetLogs, targetObservations);
    }
  };

  const stats = useMemo(() => {
    if (targetObservations.length === 0) return null;
    const haEWs = targetObservations.map((o) => o.haEW);
    const haMean = haEWs.reduce((a, b) => a + b, 0) / haEWs.length;
    const haVariance = haEWs.reduce((s, v) => s + (v - haMean) ** 2, 0) / haEWs.length;
    const haStd = Math.sqrt(haVariance);
    const targetAlerts = alerts.filter(
      (a) => a.targetName === selectedTargetName && !a.acknowledged
    );
    return {
      count: targetObservations.length,
      logCount: targetLogs.length,
      haMin: Math.min(...haEWs),
      haMax: Math.max(...haEWs),
      haMean,
      haStd,
      dateSpan: targetObservations.length > 1
        ? Math.ceil(
            (new Date(targetObservations[targetObservations.length - 1].observationDate).getTime() -
              new Date(targetObservations[0].observationDate).getTime()) /
              86400000
          )
        : 0,
      activeAlertCount: targetAlerts.length,
    };
  }, [targetObservations, alerts, selectedTargetName, targetLogs]);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            Be 星发射线监测
            {activeAlertTargets.size > 0 && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-medium">
                <AlertTriangle className="w-3 h-3" />
                {activeAlertTargets.size} 个目标预警
              </span>
            )}
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-xs text-slate-400">目标天体:</label>
            <select
              value={selectedTargetName}
              onChange={(e) => setSelectedTarget(e.target.value)}
              className={`px-3 py-1.5 rounded-md border text-sm focus:outline-none focus:ring-2 ${
                activeAlertTargets.has(selectedTargetName)
                  ? 'bg-amber-900/30 border-amber-600/60 text-amber-100 focus:ring-amber-500/50'
                  : 'bg-slate-800 border-slate-600 text-slate-200 focus:ring-cyan-500/50'
              }`}
            >
              <option value="">-- 选择目标 --</option>
              {uniqueTargets.map((t) => (
                <option key={t} value={t}>
                  {activeAlertTargets.has(t) ? '⚠ ' : ''}{t}
                </option>
              ))}
            </select>
            <button
              onClick={measureCurrent}
              disabled={!spectra.find((s) => s.id === currentSpectrumId)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-cyan-700/60 hover:bg-cyan-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              从当前光谱测量
            </button>
          </div>
        </div>
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
            <div className="px-3 py-1.5 rounded-md bg-slate-800/60 border border-slate-700 text-center">
              <div className="text-[10px] text-slate-500">观测次数</div>
              <div className="text-sm font-mono text-slate-200">{stats.count}</div>
            </div>
            <div className="px-3 py-1.5 rounded-md bg-slate-800/60 border border-slate-700 text-center">
              <div className="text-[10px] text-slate-500">日志条数</div>
              <div className="text-sm font-mono text-amber-300">{stats.logCount}</div>
            </div>
            <div className="px-3 py-1.5 rounded-md bg-slate-800/60 border border-slate-700 text-center">
              <div className="text-[10px] text-slate-500">时间跨度</div>
              <div className="text-sm font-mono text-slate-200">{stats.dateSpan} 天</div>
            </div>
            <div className="px-3 py-1.5 rounded-md bg-slate-800/60 border border-slate-700 text-center">
              <div className="text-[10px] text-slate-500">Hα EW 范围</div>
              <div className="text-xs font-mono text-cyan-300">
                {stats.haMin.toFixed(1)} ~ {stats.haMax.toFixed(1)}
              </div>
            </div>
            <div className="px-3 py-1.5 rounded-md bg-slate-800/60 border border-slate-700 text-center">
              <div className="text-[10px] text-slate-500">Hα EW 均值 ± σ</div>
              <div className="text-xs font-mono text-cyan-300">
                {stats.haMean.toFixed(2)} ± {stats.haStd.toFixed(2)}
              </div>
            </div>
            <div
              className={`px-3 py-1.5 rounded-md border text-center ${
                stats.activeAlertCount > 0
                  ? 'bg-amber-900/30 border-amber-600/60'
                  : 'bg-slate-800/60 border-slate-700'
              }`}
            >
              <div className="text-[10px] text-slate-500">活跃预警</div>
              <div
                className={`text-sm font-mono ${
                  stats.activeAlertCount > 0 ? 'text-amber-300' : 'text-slate-400'
                }`}
              >
                {stats.activeAlertCount > 0 ? `⚠ ${stats.activeAlertCount}` : '0'}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-700/60 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs">
              <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-medium text-slate-300">Hα / Hβ 等值宽度时间序列</span>
              {targetLogs.length > 0 && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px]">
                  <FileText className="w-2.5 h-2.5" />
                  菱形标记为观测日志
                </span>
              )}
            </div>
          </div>
          <div className="h-48">
            {targetObservations.length > 0 ? (
              <Line
                data={timeSeriesData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  animation: false,
                  plugins: {
                    legend: {
                      display: true,
                      position: 'top' as const,
                      align: 'end' as const,
                      labels: { color: '#94a3b8', font: { size: 10 }, boxWidth: 12 },
                    },
                    tooltip: {
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      titleColor: '#e2e8f0',
                      bodyColor: '#cbd5e1',
                      borderColor: '#334155',
                      borderWidth: 1,
                      callbacks: {
                        afterBody: (context: any) => {
                          const date = context[0]?.label;
                          if (!date) return '';
                          const logs = logDateMap.get(date);
                          if (!logs || logs.length === 0) return '';
                          const lines: string[] = ['', '── 观测日志 ──'];
                          logs.forEach((log) => {
                            const parts: string[] = [];
                            if (log.observationTime) parts.push(log.observationTime);
                            if (log.weatherCondition) parts.push(weatherLabels[log.weatherCondition]);
                            if (log.seeingQuality) parts.push(`视宁:${seeingLabels[log.seeingQuality]}`);
                            if (parts.length > 0) lines.push(`📝 ${parts.join(' · ')}`);
                            if (log.exposureParams?.exposureTime !== undefined) {
                              lines.push(`   曝光: ${log.exposureParams.exposureTime}s × ${log.exposureParams.numberOfExposures || 1}`);
                            }
                            if (log.notes) {
                              const notePreview = log.notes.length > 40 ? log.notes.slice(0, 40) + '...' : log.notes;
                              lines.push(`   💬 ${notePreview}`);
                            }
                          });
                          return lines;
                        },
                      },
                    },
                  },
                  scales: {
                    x: {
                      ticks: { color: '#64748b', font: { size: 10 }, maxRotation: 45, minRotation: 0 },
                      grid: { color: 'rgba(71, 85, 105, 0.2)' },
                    },
                    y: {
                      ticks: { color: '#64748b', font: { size: 10 } },
                      grid: { color: 'rgba(71, 85, 105, 0.2)' },
                      title: { display: true, text: 'EW (Å)', color: '#94a3b8', font: { size: 10 } },
                    },
                  },
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-slate-500">
                暂无观测数据
              </div>
            )}
          </div>
        </div>

        <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-700/60 space-y-3">
          <div className="flex items-center gap-2 text-xs">
            <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
            <span className="font-medium text-slate-300">V 波段光变曲线</span>
          </div>
          <div className="h-48">
            {targetObservations.length > 0 && targetObservations.some((o) => o.vMagnitude !== undefined) ? (
              <Line
                data={magSeriesData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  animation: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      titleColor: '#e2e8f0',
                      bodyColor: '#cbd5e1',
                      borderColor: '#334155',
                      borderWidth: 1,
                    },
                  },
                  scales: {
                    x: {
                      ticks: { color: '#64748b', font: { size: 10 }, maxRotation: 45 },
                      grid: { color: 'rgba(71, 85, 105, 0.2)' },
                    },
                    y: {
                      reverse: true,
                      ticks: { color: '#64748b', font: { size: 10 } },
                      grid: { color: 'rgba(71, 85, 105, 0.2)' },
                      title: { display: true, text: 'V mag', color: '#94a3b8', font: { size: 10 } },
                    },
                  },
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-slate-500">
                暂无测光数据
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs">
          <Layers className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-medium text-slate-300">目标光谱叠加对比</span>
          <span className="text-slate-500">（选择叠加显示）</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {targetSpectra.length > 0 ? (
            targetSpectra.map((s) => (
              <button
                key={s.id}
                onClick={() => toggleOverlay(s.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-all ${
                  overlayIds.includes(s.id)
                    ? 'bg-cyan-800/60 border border-cyan-600/60 text-cyan-100'
                    : 'bg-slate-800/60 border border-slate-600/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Eye className="w-3 h-3" />
                {s.name}
                <span className="text-[10px] opacity-70 ml-1">
                  <Calendar className="w-2.5 h-2.5 inline mr-0.5" />
                  {s.observationDate}
                </span>
              </button>
            ))
          ) : (
            <span className="text-xs text-slate-500">该目标暂无光谱数据</span>
          )}
        </div>
        <SpectrumViewer overlayIds={overlayIds} />
      </div>

      {targetObservations.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-slate-400">观测记录表</div>
          <div className="overflow-x-auto rounded-lg border border-slate-700/60">
            <table className="w-full text-xs">
              <thead className="bg-slate-800/60">
                <tr>
                  <th className="px-3 py-2 text-left text-slate-400 font-medium">日期</th>
                  <th className="px-3 py-2 text-right text-slate-400 font-medium">Hα EW (Å)</th>
                  <th className="px-3 py-2 text-right text-slate-400 font-medium">Hβ EW (Å)</th>
                  <th className="px-3 py-2 text-right text-slate-400 font-medium">V mag</th>
                  <th className="px-3 py-2 text-left text-slate-400 font-medium">备注</th>
                </tr>
              </thead>
              <tbody>
                {targetObservations.map((o, idx) => {
                  const isAlertRow = alerts.some(
                    (a) => a.observationId === o.id && !a.acknowledged
                  );
                  const rowAlert = alerts.find((a) => a.observationId === o.id);
                  const hasHaAlert = rowAlert?.triggers.some((t) => t.lineKey === 'haEW');
                  const hasHbAlert = rowAlert?.triggers.some((t) => t.lineKey === 'hbEW');
                  const hasLog = logDateMap.has(o.observationDate);
                  return (
                    <tr
                      key={o.id}
                      className={`border-t hover:bg-slate-800/30 transition-colors ${
                        isAlertRow
                          ? 'bg-amber-900/10 border-amber-700/40'
                          : 'border-slate-700/40'
                      }`}
                    >
                      <td className="px-3 py-2 font-mono text-slate-300 flex items-center gap-1">
                        {isAlertRow && (
                          <AlertTriangle className="w-3 h-3 text-amber-400" title={rowAlert?.message} />
                        )}
                        {hasLog && (
                          <FileText className="w-3 h-3 text-amber-400" title="有观测日志" />
                        )}
                        {o.observationDate}
                      </td>
                      <td
                        className={`px-3 py-2 text-right font-mono ${
                          hasHaAlert
                            ? 'text-amber-300 font-semibold'
                            : o.haEW < -5
                            ? 'text-cyan-300'
                            : 'text-slate-300'
                        }`}
                      >
                        {hasHaAlert && '⚠ '}
                        {o.haEW.toFixed(2)}
                      </td>
                      <td
                        className={`px-3 py-2 text-right font-mono ${
                          hasHbAlert
                            ? 'text-amber-300 font-semibold'
                            : 'text-slate-300'
                        }`}
                      >
                        {hasHbAlert && '⚠ '}
                        {o.hbEW ? o.hbEW.toFixed(2) : '—'}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-slate-300">
                        {o.vMagnitude ? o.vMagnitude.toFixed(3) : '—'}
                      </td>
                      <td className="px-3 py-2 text-slate-400">{o.notes || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ObservationLogTimeline onExport={handleExport} />

      <AlertPanel />
    </div>
  );
}
