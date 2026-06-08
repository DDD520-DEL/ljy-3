import { useAppStore } from '@/store/appStore';
import { FileText, Trash2, Check, Calendar, Target } from 'lucide-react';

export default function SpectrumList() {
  const { spectra, currentSpectrumId, setCurrentSpectrum, deleteSpectrum } = useAppStore();

  if (spectra.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-slate-500 rounded-lg bg-slate-800/30 border border-dashed border-slate-700">
        暂无光谱数据
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin">
      {spectra.map((s) => {
        const active = s.id === currentSpectrumId;
        return (
          <div
            key={s.id}
            onClick={() => setCurrentSpectrum(s.id)}
            className={`group flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all border ${
              active
                ? 'bg-cyan-900/30 border-cyan-600/60'
                : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800/70 hover:border-slate-600'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${
                active ? 'bg-cyan-700/40 text-cyan-300'
                  : 'bg-slate-700/60 text-slate-400'
              }`}
            >
              <FileText className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                {active && <Check className="w-3 h-3 text-cyan-400" />}
                <span className={`text-sm font-medium truncate ${active ? 'text-cyan-200' : 'text-slate-200'}`}>
                  {s.name}
                </span>
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
              <div className="text-[10px] text-slate-600 font-mono mt-0.5">
                {s.wavelengthMin.toFixed(0)}–{s.wavelengthMax.toFixed(0)} Å · {s.points.length} pts
                {s.isNormalized && ' · 已归一化'}
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteSpectrum(s.id);
              }}
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-900/50 text-slate-500 hover:text-red-400 transition-all flex-shrink-0"
              title="删除"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
