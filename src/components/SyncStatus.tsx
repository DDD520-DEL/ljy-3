import { Cloud, CloudOff, RefreshCw, CheckCircle, XCircle, AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import { useAppStore } from '@/store/appStore';

function formatDateTime(iso: string | null): string {
  if (!iso) return '从未同步';
  const date = new Date(iso);
  return date.toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function SyncStatus() {
  const { syncState, startSync } = useAppStore();
  const { status, progress, error, lastSyncAt, isOnline, pendingChanges } = syncState;

  const StatusIcon = () => {
    if (!isOnline) {
      return <WifiOff className="w-4 h-4 text-amber-400" />;
    }
    switch (status) {
      case 'syncing':
        return <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'offline':
        return <CloudOff className="w-4 h-4 text-amber-400" />;
      default:
        return <Cloud className="w-4 h-4 text-slate-400" />;
    }
  };

  const statusText = () => {
    if (!isOnline) return '离线模式';
    switch (status) {
      case 'syncing':
        return progress?.message || '同步中...';
      case 'success':
        return '同步成功';
      case 'error':
        return '同步失败';
      case 'offline':
        return '离线模式';
      default:
        return '已连接云端';
    }
  };

  const statusColorClass = () => {
    if (!isOnline) return 'text-amber-300';
    switch (status) {
      case 'syncing':
        return 'text-cyan-300';
      case 'success':
        return 'text-emerald-300';
      case 'error':
        return 'text-red-300';
      case 'offline':
        return 'text-amber-300';
      default:
        return 'text-slate-300';
    }
  };

  const handleSync = async () => {
    if (status === 'syncing') return;
    await startSync('both');
  };

  return (
    <div className="flex items-center gap-2">
      {error && (status === 'error' || !isOnline) && (
        <div className="group relative">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <div className="absolute right-0 top-full mt-1 w-56 p-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-300 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 shadow-xl">
            <div className="font-semibold text-amber-400 mb-1">同步提示</div>
            <div className="text-slate-400">{error}</div>
            {pendingChanges > 0 && (
              <div className="mt-1 text-amber-400">
                {pendingChanges} 个项目待同步
              </div>
            )}
          </div>
        </div>
      )}

      <button
        onClick={handleSync}
        disabled={status === 'syncing'}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-800/60 border border-slate-700/60 hover:bg-slate-800 hover:border-slate-600 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        title={status === 'syncing' ? '同步中...' : '手动同步数据'}
      >
        <StatusIcon />
        <span className={`text-[11px] ${statusColorClass()}`}>
          {statusText()}
        </span>
      </button>

      <div className="hidden lg:flex items-center gap-1 px-2 py-1 rounded-md bg-slate-800/40 border border-slate-700/40 text-[10px] text-slate-500">
        {isOnline ? (
          <Wifi className="w-3 h-3 text-emerald-500" />
        ) : (
          <WifiOff className="w-3 h-3 text-amber-500" />
        )}
        <span>上次同步: {formatDateTime(lastSyncAt)}</span>
      </div>

      {progress && status === 'syncing' && (
        <div className="hidden sm:flex items-center gap-2 w-32">
          <div className="flex-1 h-1.5 bg-slate-700/80 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full transition-all duration-300"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <span className="text-[10px] text-cyan-300 font-mono w-8 text-right">
            {Math.round(progress.percent)}%
          </span>
        </div>
      )}
    </div>
  );
}
