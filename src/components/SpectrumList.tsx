import { useMemo, useState } from 'react';
import { useAppStore } from '@/store/appStore';
import { useTeamStore } from '@/store/teamStore';
import {
  FileText,
  Trash2,
  Check,
  Calendar,
  Target,
  GitCompare,
  X,
  Layers,
  Eye,
  Settings,
  ShieldAlert,
} from 'lucide-react';
import { VisibilityBadge } from './VisibilitySettings';
import VisibilitySettings from './VisibilitySettings';

export default function SpectrumList() {
  const {
    spectra,
    currentSpectrumId,
    setCurrentSpectrum,
    deleteSpectrum,
    comparisonMode,
    toggleComparisonMode,
    toggleComparisonSpectrum,
    clearComparisonSelection,
  } = useAppStore();

  const { canViewSpectrum, currentUser } = useTeamStore();

  const [settingsSpectrumId, setSettingsSpectrumId] = useState<string | null>(null);

  const visibleSpectra = useMemo(() => {
    return spectra.filter((s) => canViewSpectrum(s, currentUser.id));
  }, [spectra, canViewSpectrum, currentUser.id]);

  const hiddenCount = spectra.length - visibleSpectra.length;

  const handleItemClick = (spectrumId: string) => {
    if (comparisonMode.enabled) {
      toggleComparisonSpectrum(spectrumId);
    } else {
      setCurrentSpectrum(spectrumId);
    }
  };

  const settingsSpectrum = visibleSpectra.find((s) => s.id === settingsSpectrumId);

  if (spectra.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-slate-500 rounded-lg bg-slate-800/30 border border-dashed border-slate-700">
        暂无光谱数据
      </div>
    );
  }

  if (visibleSpectra.length === 0) {
    return (
      <div className="p-6 text-center rounded-lg bg-slate-800/30 border border-dashed border-slate-700 space-y-2">
        <ShieldAlert className="w-8 h-8 mx-auto text-slate-500" />
        <div className="text-sm text-slate-400">暂无可查看的光谱</div>
        <div className="text-[11px] text-slate-500">
          {hiddenCount} 条光谱因权限限制不可见
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {settingsSpectrum && (
        <div className="p-3 rounded-lg bg-slate-900/80 border border-cyan-700/50">
          <VisibilitySettings
            spectrum={settingsSpectrum}
            onClose={() => setSettingsSpectrumId(null)}
          />
        </div>
      )}

      <div className="flex items-center justify-between">
        <button
          onClick={toggleComparisonMode}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
            comparisonMode.enabled
              ? 'bg-cyan-900/40 text-cyan-300 border border-cyan-700/50'
              : 'bg-slate-800/60 text-slate-400 border border-slate-700/60 hover:text-slate-200 hover:bg-slate-700/60'
          }`}
        >
          <GitCompare className="w-3.5 h-3.5" />
          {comparisonMode.enabled ? '退出对比' : '对比模式'}
        </button>
        {comparisonMode.enabled && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500">
              已选 {comparisonMode.selectedSpectrumIds.length}/3
            </span>
            {comparisonMode.selectedSpectrumIds.length > 0 && (
              <button
                onClick={clearComparisonSelection}
                className="flex items-center gap-1 px-2 py-1 rounded text-[11px] text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors"
              >
                <X className="w-3 h-3" />
                清空
              </button>
            )}
          </div>
        )}
      </div>

      {comparisonMode.enabled && (
        <div className="p-2.5 rounded-md bg-cyan-900/20 border border-cyan-800/40 text-[11px] text-cyan-300">
          <div className="flex items-start gap-1.5">
            <Layers className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <div>
              点击光谱进行选择（2–3 条），选中后在图表区域叠加显示并生成残差分析。
            </div>
          </div>
        </div>
      )}

      {hiddenCount > 0 && (
        <div className="flex items-center gap-1.5 p-2 rounded-md bg-slate-800/40 border border-slate-700/50 text-[11px] text-slate-400">
          <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0 text-slate-500" />
          <span>已隐藏 {hiddenCount} 条无权限查看的光谱</span>
        </div>
      )}

      <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1 scrollbar-thin">
        {visibleSpectra.map((s) => {
          const active = s.id === currentSpectrumId;
          const compareSelected = comparisonMode.selectedSpectrumIds.includes(s.id);
          const compareIndex = comparisonMode.selectedSpectrumIds.indexOf(s.id);
          const isDisabled =
            comparisonMode.enabled &&
            !compareSelected &&
            comparisonMode.selectedSpectrumIds.length >= 3;
          const isSettingsOpen = settingsSpectrumId === s.id;

          return (
            <div
              key={s.id}
              className={`rounded-lg transition-all border ${
                isSettingsOpen
                  ? 'bg-cyan-900/20 border-cyan-600/60'
                  : isDisabled
                  ? 'bg-slate-800/20 border-slate-800/60 opacity-50'
                  : comparisonMode.enabled && compareSelected
                  ? 'bg-cyan-900/30 border-cyan-600/60 ring-1 ring-cyan-500/40'
                  : comparisonMode.enabled
                  ? 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800/70 hover:border-slate-600'
                  : active
                  ? 'bg-cyan-900/30 border-cyan-600/60'
                  : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800/70 hover:border-slate-600'
              }`}
            >
              <div
                onClick={() => !isDisabled && handleItemClick(s.id)}
                className={`group flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all`}
              >
                <div
                  className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${
                    comparisonMode.enabled && compareSelected
                      ? 'bg-cyan-700/40 text-cyan-300'
                      : active
                      ? 'bg-cyan-700/40 text-cyan-300'
                      : 'bg-slate-700/60 text-slate-400'
                  }`}
                >
                  {comparisonMode.enabled && compareSelected ? (
                    <span className="text-xs font-bold">#{compareIndex + 1}</span>
                  ) : (
                    <FileText className="w-4 h-4" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {active && !comparisonMode.enabled && (
                      <Check className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                    )}
                    {comparisonMode.enabled && compareSelected && (
                      <Check className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                    )}
                    <span
                      className={`text-sm font-medium truncate ${
                        comparisonMode.enabled && compareSelected
                          ? 'text-cyan-200'
                          : active
                          ? 'text-cyan-200'
                          : 'text-slate-200'
                      }`}
                    >
                      {s.name}
                    </span>
                    <VisibilityBadge visibility={s.visibility} />
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                    <span className="inline-flex items-center gap-0.5">
                      <Target className="w-3 h-3" />
                      {s.targetName}
                    </span>
                    <span className="inline-flex items-center gap-0.5">
                      <Calendar className="w-3 h-3" />
                      {s.observationDate}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-600 font-mono mt-0.5 flex items-center gap-2 flex-wrap">
                    <span>
                      {s.wavelengthMin.toFixed(0)}–{s.wavelengthMax.toFixed(0)} Å · {s.points.length} pts
                      {s.isNormalized && ' · 已归一化'}
                    </span>
                    {s.sharedClassifications && s.sharedClassifications.length > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-violet-400">
                        <Eye className="w-2.5 h-2.5" />
                        {s.sharedClassifications.length} 条共享分类
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSettingsSpectrumId(isSettingsOpen ? null : s.id);
                    }}
                    className="p-1 rounded hover:bg-slate-700/60 text-slate-400 hover:text-cyan-400 transition-colors"
                    title="可见权限设置"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSpectrum(s.id);
                    }}
                    className="p-1 rounded hover:bg-red-900/50 text-slate-500 hover:text-red-400 transition-all flex-shrink-0"
                    title="删除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
