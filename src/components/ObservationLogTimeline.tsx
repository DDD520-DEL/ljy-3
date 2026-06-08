import { useState, useMemo } from 'react';
import { useAppStore } from '@/store/appStore';
import type {
  ObservationLogEntry,
  WeatherCondition,
  EquipmentStatus,
  SeeingQuality,
} from '@/types';
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Download,
  Cloud,
  Sun,
  CloudSun,
  CloudRain,
  Snowflake,
  Wind,
  CloudFog,
  Camera,
  Thermometer,
  Droplets,
  Clock,
  StickyNote,
  ChevronDown,
  ChevronUp,
  FileText,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  XCircle,
  Eye,
} from 'lucide-react';

const genId = () => Math.random().toString(36).substring(2, 9);

const weatherOptions: { value: WeatherCondition; label: string; icon: typeof Sun }[] = [
  { value: 'clear', label: '晴', icon: Sun },
  { value: 'partly_cloudy', label: '多云', icon: CloudSun },
  { value: 'cloudy', label: '阴', icon: Cloud },
  { value: 'rainy', label: '雨', icon: CloudRain },
  { value: 'snowy', label: '雪', icon: Snowflake },
  { value: 'windy', label: '大风', icon: Wind },
  { value: 'hazy', label: '雾霾', icon: CloudFog },
];

const equipmentOptions: { value: EquipmentStatus; label: string; icon: typeof CheckCircle2 }[] = [
  { value: 'excellent', label: '极佳', icon: CheckCircle2 },
  { value: 'good', label: '良好', icon: Eye },
  { value: 'fair', label: '一般', icon: AlertCircle },
  { value: 'poor', label: '较差', icon: AlertTriangle },
  { value: 'malfunction', label: '故障', icon: XCircle },
];

const seeingOptions: { value: SeeingQuality; label: string }[] = [
  { value: 'excellent', label: '极佳' },
  { value: 'good', label: '良好' },
  { value: 'fair', label: '一般' },
  { value: 'poor', label: '较差' },
];

interface LogFormProps {
  targetName: string;
  onSubmit: (data: Omit<ObservationLogEntry, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
  initialData?: ObservationLogEntry;
}

function LogForm({ targetName, onSubmit, onCancel, initialData }: LogFormProps) {
  const today = new Date().toISOString().split('T')[0];
  const nowTime = new Date().toTimeString().slice(0, 5);

  const [formData, setFormData] = useState({
    observationDate: initialData?.observationDate || today,
    observationTime: initialData?.observationTime || nowTime,
    weatherCondition: initialData?.weatherCondition || 'clear' as WeatherCondition,
    equipmentStatus: initialData?.equipmentStatus || 'good' as EquipmentStatus,
    seeingQuality: initialData?.seeingQuality || 'good' as SeeingQuality,
    temperature: initialData?.temperature ?? 15,
    humidity: initialData?.humidity ?? 50,
    exposureTime: initialData?.exposureParams?.exposureTime ?? 300,
    numberOfExposures: initialData?.exposureParams?.numberOfExposures ?? 5,
    binning: initialData?.exposureParams?.binning || '2x2',
    filter: initialData?.exposureParams?.filter || 'Clear',
    gain: initialData?.exposureParams?.gain ?? 100,
    ccdTemperature: initialData?.exposureParams?.temperature ?? -10,
    notes: initialData?.notes || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      targetName,
      observationDate: formData.observationDate,
      observationTime: formData.observationTime,
      weatherCondition: formData.weatherCondition,
      equipmentStatus: formData.equipmentStatus,
      seeingQuality: formData.seeingQuality,
      temperature: formData.temperature,
      humidity: formData.humidity,
      exposureParams: {
        exposureTime: formData.exposureTime,
        numberOfExposures: formData.numberOfExposures,
        binning: formData.binning,
        filter: formData.filter,
        gain: formData.gain,
        temperature: formData.ccdTemperature,
      },
      notes: formData.notes,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-slate-400 mb-1">观测日期</label>
          <input
            type="date"
            value={formData.observationDate}
            onChange={(e) => setFormData({ ...formData, observationDate: e.target.value })}
            className="w-full px-2.5 py-1.5 rounded-md bg-slate-800 border border-slate-600 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">观测时间</label>
          <input
            type="time"
            value={formData.observationTime}
            onChange={(e) => setFormData({ ...formData, observationTime: e.target.value })}
            className="w-full px-2.5 py-1.5 rounded-md bg-slate-800 border border-slate-600 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-slate-400 mb-1.5">天气条件</label>
        <div className="flex flex-wrap gap-1.5">
          {weatherOptions.map((w) => {
            const Icon = w.icon;
            return (
              <button
                key={w.value}
                type="button"
                onClick={() => setFormData({ ...formData, weatherCondition: w.value })}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs border transition-all ${
                  formData.weatherCondition === w.value
                    ? 'bg-cyan-800/50 border-cyan-600/60 text-cyan-200'
                    : 'bg-slate-800 border-slate-600 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3 h-3" />
                {w.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-xs text-slate-400 mb-1.5">设备状态</label>
        <div className="flex flex-wrap gap-1.5">
          {equipmentOptions.map((eq) => {
            const Icon = eq.icon;
            return (
              <button
                key={eq.value}
                type="button"
                onClick={() => setFormData({ ...formData, equipmentStatus: eq.value })}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs border transition-all ${
                  formData.equipmentStatus === eq.value
                    ? 'bg-emerald-800/50 border-emerald-600/60 text-emerald-200'
                    : 'bg-slate-800 border-slate-600 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3 h-3" />
                {eq.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-xs text-slate-400 mb-1.5">视宁度</label>
        <div className="flex flex-wrap gap-1.5">
          {seeingOptions.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setFormData({ ...formData, seeingQuality: s.value })}
              className={`px-2.5 py-1 rounded-md text-xs border transition-all ${
                formData.seeingQuality === s.value
                  ? 'bg-indigo-800/50 border-indigo-600/60 text-indigo-200'
                  : 'bg-slate-800 border-slate-600 text-slate-400 hover:text-slate-200'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-slate-400 mb-1 flex items-center gap-1">
            <Thermometer className="w-3 h-3" /> 环境温度 (°C)
          </label>
          <input
            type="number"
            value={formData.temperature}
            onChange={(e) => setFormData({ ...formData, temperature: Number(e.target.value) })}
            className="w-full px-2.5 py-1.5 rounded-md bg-slate-800 border border-slate-600 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1 flex items-center gap-1">
            <Droplets className="w-3 h-3" /> 湿度 (%)
          </label>
          <input
            type="number"
            min={0}
            max={100}
            value={formData.humidity}
            onChange={(e) => setFormData({ ...formData, humidity: Number(e.target.value) })}
            className="w-full px-2.5 py-1.5 rounded-md bg-slate-800 border border-slate-600 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          />
        </div>
      </div>

      <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/60 space-y-3">
        <div className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
          <Camera className="w-3.5 h-3.5 text-cyan-400" />
          曝光参数
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] text-slate-500 mb-0.5">单张曝光 (秒)</label>
            <input
              type="number"
              value={formData.exposureTime}
              onChange={(e) => setFormData({ ...formData, exposureTime: Number(e.target.value) })}
              className="w-full px-2 py-1 rounded bg-slate-900/60 border border-slate-600 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
            />
          </div>
          <div>
            <label className="block text-[11px] text-slate-500 mb-0.5">叠加张数</label>
            <input
              type="number"
              value={formData.numberOfExposures}
              onChange={(e) => setFormData({ ...formData, numberOfExposures: Number(e.target.value) })}
              className="w-full px-2 py-1 rounded bg-slate-900/60 border border-slate-600 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
            />
          </div>
          <div>
            <label className="block text-[11px] text-slate-500 mb-0.5">Binning</label>
            <input
              type="text"
              value={formData.binning}
              onChange={(e) => setFormData({ ...formData, binning: e.target.value })}
              className="w-full px-2 py-1 rounded bg-slate-900/60 border border-slate-600 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
            />
          </div>
          <div>
            <label className="block text-[11px] text-slate-500 mb-0.5">滤光片</label>
            <input
              type="text"
              value={formData.filter}
              onChange={(e) => setFormData({ ...formData, filter: e.target.value })}
              className="w-full px-2 py-1 rounded bg-slate-900/60 border border-slate-600 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
            />
          </div>
          <div>
            <label className="block text-[11px] text-slate-500 mb-0.5">Gain</label>
            <input
              type="number"
              value={formData.gain}
              onChange={(e) => setFormData({ ...formData, gain: Number(e.target.value) })}
              className="w-full px-2 py-1 rounded bg-slate-900/60 border border-slate-600 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
            />
          </div>
          <div>
            <label className="block text-[11px] text-slate-500 mb-0.5">CCD温度 (°C)</label>
            <input
              type="number"
              value={formData.ccdTemperature}
              onChange={(e) => setFormData({ ...formData, ccdTemperature: Number(e.target.value) })}
              className="w-full px-2 py-1 rounded bg-slate-900/60 border border-slate-600 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs text-slate-400 mb-1 flex items-center gap-1">
          <StickyNote className="w-3 h-3" /> 备注
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
          placeholder="记录观测中的特殊情况、目标天体状态、数据质量等..."
          className="w-full px-2.5 py-1.5 rounded-md bg-slate-800 border border-slate-600 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 resize-none placeholder:text-slate-600"
        />
      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 rounded-md text-xs bg-slate-800 border border-slate-600 text-slate-400 hover:text-slate-200 transition-colors"
        >
          取消
        </button>
        <button
          type="submit"
          className="px-3 py-1.5 rounded-md text-xs bg-cyan-700/60 hover:bg-cyan-600 text-white font-medium transition-colors"
        >
          {initialData ? '保存修改' : '添加日志'}
        </button>
      </div>
    </form>
  );
}

interface LogCardProps {
  log: ObservationLogEntry;
  onEdit: () => void;
  onDelete: () => void;
}

function LogCard({ log, onEdit, onDelete }: LogCardProps) {
  const [expanded, setExpanded] = useState(true);

  const weatherInfo = weatherOptions.find((w) => w.value === log.weatherCondition);
  const WeatherIcon = weatherInfo?.icon || Cloud;
  const equipmentInfo = equipmentOptions.find((e) => e.value === log.equipmentStatus);
  const EquipmentIcon = equipmentInfo?.icon || Eye;
  const seeingInfo = seeingOptions.find((s) => s.value === log.seeingQuality);

  const equipmentColorMap = {
    excellent: 'text-emerald-400',
    good: 'text-cyan-400',
    fair: 'text-amber-400',
    poor: 'text-orange-400',
    malfunction: 'text-red-400',
  };

  return (
    <div className="relative pl-8 pb-4 last:pb-0">
      <div className="absolute left-0 top-1 bottom-0 w-px bg-slate-700" />
      <div className="absolute left-[-6px] top-1 w-3 h-3 rounded-full bg-cyan-500 border-2 border-slate-900 shadow-lg shadow-cyan-500/30" />

      <div className="rounded-lg bg-slate-800/50 border border-slate-700/60 overflow-hidden">
        <div
          className="px-3 py-2 flex items-center justify-between gap-2 cursor-pointer hover:bg-slate-800/80 transition-colors"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-mono text-slate-200">{log.observationDate}</span>
            {log.observationTime && (
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <Clock className="w-3 h-3" />
                {log.observationTime}
              </span>
            )}
            {weatherInfo && (
              <span className="flex items-center gap-1 text-xs text-sky-300">
                <WeatherIcon className="w-3 h-3" />
                {weatherInfo.label}
              </span>
            )}
            {equipmentInfo && (
              <span className={`flex items-center gap-1 text-xs ${equipmentColorMap[log.equipmentStatus || 'good']}`}>
                <EquipmentIcon className="w-3 h-3" />
                {equipmentInfo.label}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="p-1 rounded hover:bg-slate-700 text-slate-500 hover:text-cyan-400 transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('确定要删除这条观测日志吗？')) onDelete();
              }}
              className="p-1 rounded hover:bg-slate-700 text-slate-500 hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-slate-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-500" />
            )}
          </div>
        </div>

        {expanded && (
          <div className="px-3 pb-3 space-y-3 border-t border-slate-700/40">
            <div className="pt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {seeingInfo && (
                <div className="p-2 rounded bg-slate-900/40">
                  <div className="text-slate-500 text-[10px] mb-0.5">视宁度</div>
                  <div className="text-indigo-300 font-medium">{seeingInfo.label}</div>
                </div>
              )}
              {log.temperature !== undefined && (
                <div className="p-2 rounded bg-slate-900/40">
                  <div className="text-slate-500 text-[10px] mb-0.5">环境温度</div>
                  <div className="text-orange-300 font-medium">{log.temperature}°C</div>
                </div>
              )}
              {log.humidity !== undefined && (
                <div className="p-2 rounded bg-slate-900/40">
                  <div className="text-slate-500 text-[10px] mb-0.5">湿度</div>
                  <div className="text-sky-300 font-medium">{log.humidity}%</div>
                </div>
              )}
            </div>

            {log.exposureParams && (
              <div className="p-2.5 rounded bg-slate-900/40 border border-slate-700/40">
                <div className="text-[10px] text-slate-500 mb-1.5 flex items-center gap-1">
                  <Camera className="w-3 h-3 text-cyan-500" /> 曝光参数
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  {log.exposureParams.exposureTime !== undefined && (
                    <div>
                      <span className="text-slate-500">曝光: </span>
                      <span className="text-slate-300 font-mono">{log.exposureParams.exposureTime}s</span>
                    </div>
                  )}
                  {log.exposureParams.numberOfExposures !== undefined && (
                    <div>
                      <span className="text-slate-500">张数: </span>
                      <span className="text-slate-300 font-mono">{log.exposureParams.numberOfExposures}</span>
                    </div>
                  )}
                  {log.exposureParams.binning && (
                    <div>
                      <span className="text-slate-500">Binning: </span>
                      <span className="text-slate-300 font-mono">{log.exposureParams.binning}</span>
                    </div>
                  )}
                  {log.exposureParams.filter && (
                    <div>
                      <span className="text-slate-500">滤光片: </span>
                      <span className="text-slate-300 font-mono">{log.exposureParams.filter}</span>
                    </div>
                  )}
                  {log.exposureParams.gain !== undefined && (
                    <div>
                      <span className="text-slate-500">Gain: </span>
                      <span className="text-slate-300 font-mono">{log.exposureParams.gain}</span>
                    </div>
                  )}
                  {log.exposureParams.temperature !== undefined && (
                    <div>
                      <span className="text-slate-500">CCD: </span>
                      <span className="text-slate-300 font-mono">{log.exposureParams.temperature}°C</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {log.notes && (
              <div className="p-2.5 rounded bg-slate-900/40 border border-slate-700/40">
                <div className="text-[10px] text-slate-500 mb-1 flex items-center gap-1">
                  <StickyNote className="w-3 h-3 text-amber-500" /> 备注
                </div>
                <div className="text-xs text-slate-300 whitespace-pre-wrap">{log.notes}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ObservationLogTimeline({ onExport }: { onExport?: (format: 'md' | 'pdf') => void }) {
  const { observationLogs, selectedTargetName, addObservationLog, updateObservationLog, deleteObservationLog } =
    useAppStore();
  const [showForm, setShowForm] = useState(false);
  const [editingLog, setEditingLog] = useState<ObservationLogEntry | null>(null);

  const targetLogs = useMemo(() => {
    if (!selectedTargetName) return [];
    return observationLogs
      .filter((l) => l.targetName === selectedTargetName)
      .sort((a, b) => {
        const dateA = `${a.observationDate} ${a.observationTime || ''}`;
        const dateB = `${b.observationDate} ${b.observationTime || ''}`;
        return dateB.localeCompare(dateA);
      });
  }, [observationLogs, selectedTargetName]);

  const handleAdd = (data: Omit<ObservationLogEntry, 'id' | 'createdAt' | 'updatedAt'>) => {
    addObservationLog(data);
    setShowForm(false);
  };

  const handleUpdate = (data: Omit<ObservationLogEntry, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingLog) {
      updateObservationLog(editingLog.id, data);
      setEditingLog(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-slate-200">观测日志时间线</h3>
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-500 font-mono">
              {targetLogs.length} 条
            </span>
          </div>
          {!selectedTargetName && (
            <p className="text-xs text-slate-500">请先在上方选择一个观测目标</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onExport && selectedTargetName && targetLogs.length > 0 && (
            <>
              <button
                onClick={() => onExport('md')}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs bg-slate-800/60 border border-slate-600 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                导出 MD
              </button>
              <button
                onClick={() => onExport('pdf')}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs bg-slate-800/60 border border-slate-600 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                导出 PDF
              </button>
            </>
          )}
          {selectedTargetName && (
            <button
              onClick={() => {
                setEditingLog(null);
                setShowForm(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-cyan-700/60 hover:bg-cyan-600 text-white text-xs font-medium transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              添加日志
            </button>
          )}
        </div>
      </div>

      {(showForm || editingLog) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-slate-900 border border-slate-700 shadow-2xl">
            <div className="sticky top-0 z-10 px-4 py-3 flex items-center justify-between bg-slate-900 border-b border-slate-700/60">
              <h3 className="text-sm font-semibold text-white">
                {editingLog ? '编辑观测日志' : '添加观测日志'}
              </h3>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingLog(null);
                }}
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4">
              <LogForm
                targetName={selectedTargetName}
                initialData={editingLog || undefined}
                onSubmit={editingLog ? handleUpdate : handleAdd}
                onCancel={() => {
                  setShowForm(false);
                  setEditingLog(null);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {selectedTargetName && targetLogs.length > 0 ? (
        <div className="relative py-1">
          {targetLogs.map((log) => (
            <LogCard
              key={log.id}
              log={log}
              onEdit={() => setEditingLog(log)}
              onDelete={() => deleteObservationLog(log.id)}
            />
          ))}
        </div>
      ) : selectedTargetName ? (
        <div className="py-12 text-center rounded-lg bg-slate-800/30 border border-dashed border-slate-700/60">
          <FileText className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <p className="text-sm text-slate-500">暂无观测日志</p>
          <p className="text-xs text-slate-600 mt-1">点击上方"添加日志"开始记录</p>
        </div>
      ) : null}
    </div>
  );
}

export { LogForm };
