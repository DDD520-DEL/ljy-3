import { useState } from 'react';
import { useAppStore } from '@/store/appStore';
import {
  Settings,
  Bell,
  Mail,
  AlertTriangle,
  Check,
  X,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Trash2,
  CheckCheck,
  ExternalLink,
} from 'lucide-react';
import type { AlertLineKey } from '@/types';
import { LINE_LABELS, requestNotificationPermission, createEmailLink } from '@/lib/alertEngine';

export default function AlertPanel() {
  const {
    alertConfig,
    alerts,
    alertEvaluations,
    updateAlertConfig,
    runAlertEvaluation,
    acknowledgeAlert,
    acknowledgeAllAlerts,
    clearAlerts,
  } = useAppStore();

  const [expanded, setExpanded] = useState(true);
  const [showConfig, setShowConfig] = useState(false);
  const [emailInput, setEmailInput] = useState('');

  const activeAlerts = alerts.filter((a) => !a.acknowledged);
  const activeAlertTargets = new Set(activeAlerts.map((a) => a.targetName));

  const handleAddEmail = () => {
    const email = emailInput.trim();
    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      if (!alertConfig.emailRecipients.includes(email)) {
        updateAlertConfig({
          emailRecipients: [...alertConfig.emailRecipients, email],
        });
      }
      setEmailInput('');
    }
  };

  const handleRemoveEmail = (email: string) => {
    updateAlertConfig({
      emailRecipients: alertConfig.emailRecipients.filter((e) => e !== email),
    });
  };

  const toggleMonitoredLine = (lineKey: AlertLineKey) => {
    const current = alertConfig.monitoredLines;
    const next = current.includes(lineKey)
      ? current.filter((k) => k !== lineKey)
      : [...current, lineKey];
    if (next.length > 0) {
      updateAlertConfig({ monitoredLines: next });
    }
  };

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      updateAlertConfig({ enableInAppNotification: true });
    }
  };

  return (
    <div className="rounded-lg bg-slate-900/40 border border-slate-700/60 overflow-hidden">
      <div
        className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-slate-800/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <AlertTriangle
            className={`w-4 h-4 ${activeAlerts.length > 0 ? 'text-amber-400 animate-pulse' : 'text-slate-500'}`}
          />
          <span className="text-xs font-medium text-slate-300">Be 星预警中心</span>
          {activeAlerts.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-medium">
              {activeAlerts.length} 条活跃
            </span>
          )}
          {activeAlertTargets.size > 0 && (
            <span className="text-[10px] text-slate-500">
              影响 {activeAlertTargets.size} 个目标
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowConfig(!showConfig);
            }}
            className="p-1 rounded hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 transition-colors"
            title="预警设置"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              runAlertEvaluation();
            }}
            className="p-1 rounded hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 transition-colors"
            title="重新评估预警"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-slate-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-500" />
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-700/40">
          {showConfig && (
            <div className="p-3 border-b border-slate-700/40 bg-slate-800/30 space-y-3">
              <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">
                预警规则配置
              </div>

              <div className="flex items-center justify-between">
                <label className="text-xs text-slate-300">启用预警系统</label>
                <button
                  onClick={() => updateAlertConfig({ enabled: !alertConfig.enabled })}
                  className={`relative w-10 h-5 rounded-full transition-colors ${
                    alertConfig.enabled ? 'bg-cyan-600' : 'bg-slate-600'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                      alertConfig.enabled ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-300">
                  Sigma 阈值 (当前: {alertConfig.sigmaThreshold}σ)
                </label>
                <input
                  type="range"
                  min="1"
                  max="6"
                  step="0.5"
                  value={alertConfig.sigmaThreshold}
                  onChange={(e) =>
                    updateAlertConfig({ sigmaThreshold: parseFloat(e.target.value) })
                  }
                  className="w-full accent-cyan-500"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>1σ (宽松)</span>
                  <span>3σ (标准)</span>
                  <span>6σ (严格)</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-300">
                  连续异常观测次数 (当前: {alertConfig.consecutiveObservations} 次)
                </label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  value={alertConfig.consecutiveObservations}
                  onChange={(e) =>
                    updateAlertConfig({
                      consecutiveObservations: parseInt(e.target.value),
                    })
                  }
                  className="w-full accent-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-300">监测谱线</label>
                <div className="flex gap-2">
                  {(['haEW', 'hbEW'] as AlertLineKey[]).map((key) => (
                    <button
                      key={key}
                      onClick={() => toggleMonitoredLine(key)}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                        alertConfig.monitoredLines.includes(key)
                          ? 'bg-cyan-700/50 text-cyan-100 border border-cyan-600/50'
                          : 'bg-slate-700/50 text-slate-400 border border-slate-600/50 hover:text-slate-200'
                      }`}
                    >
                      {alertConfig.monitoredLines.includes(key) && (
                        <Check className="w-3 h-3" />
                      )}
                      {LINE_LABELS[key]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-300">自定义绝对阈值 (Å)</label>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1 text-xs text-slate-400">
                    <input
                      type="checkbox"
                      checked={alertConfig.useCustomAbsoluteThreshold}
                      onChange={(e) =>
                        updateAlertConfig({ useCustomAbsoluteThreshold: e.target.checked })
                      }
                      className="accent-cyan-500"
                    />
                    启用
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={alertConfig.customAbsoluteThreshold ?? ''}
                    disabled={!alertConfig.useCustomAbsoluteThreshold}
                    onChange={(e) =>
                      updateAlertConfig({
                        customAbsoluteThreshold: e.target.value
                          ? parseFloat(e.target.value)
                          : undefined,
                      })
                    }
                    placeholder="如: 2.0"
                    className="w-24 px-2 py-1 rounded bg-slate-800 border border-slate-600 text-xs text-slate-200 disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div className="border-t border-slate-700/40 pt-3 space-y-2">
                <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">
                  通知设置
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="w-3.5 h-3.5 text-cyan-400" />
                    <label className="text-xs text-slate-300">站内浏览器通知</label>
                  </div>
                  {alertConfig.enableInAppNotification ? (
                    <button
                      onClick={() => updateAlertConfig({ enableInAppNotification: false })}
                      className="flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-700/50 text-cyan-100 text-xs"
                    >
                      <Check className="w-3 h-3" />
                      已启用
                    </button>
                  ) : (
                    <button
                      onClick={handleEnableNotifications}
                      className="px-2 py-0.5 rounded bg-slate-700 text-slate-300 text-xs hover:bg-slate-600 transition-colors"
                    >
                      点击启用
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-amber-400" />
                    <label className="text-xs text-slate-300">邮件通知</label>
                  </div>
                  <button
                    onClick={() =>
                      updateAlertConfig({
                        enableEmailNotification: !alertConfig.enableEmailNotification,
                      })
                    }
                    className={`relative w-10 h-5 rounded-full transition-colors ${
                      alertConfig.enableEmailNotification ? 'bg-cyan-600' : 'bg-slate-600'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                        alertConfig.enableEmailNotification
                          ? 'translate-x-5'
                          : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                {alertConfig.enableEmailNotification && (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddEmail()}
                        placeholder="输入邮箱地址"
                        className="flex-1 px-2 py-1 rounded bg-slate-800 border border-slate-600 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      />
                      <button
                        onClick={handleAddEmail}
                        className="px-2 py-1 rounded bg-cyan-700/60 hover:bg-cyan-600 text-white text-xs transition-colors"
                      >
                        添加
                      </button>
                    </div>
                    {alertConfig.emailRecipients.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {alertConfig.emailRecipients.map((email) => (
                          <span
                            key={email}
                            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-700/50 text-[11px] text-slate-300"
                          >
                            {email}
                            <button
                              onClick={() => handleRemoveEmail(email)}
                              className="text-slate-500 hover:text-red-400"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="p-3 space-y-2 max-h-72 overflow-y-auto">
            {alerts.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-40" />
                暂无预警记录
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">
                    共 {alerts.length} 条记录，{activeAlerts.length} 条未处理
                  </span>
                  <div className="flex gap-1">
                    {activeAlerts.length > 0 && (
                      <button
                        onClick={acknowledgeAllAlerts}
                        className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-700/50 text-[10px] text-slate-300 hover:bg-slate-700 transition-colors"
                      >
                        <CheckCheck className="w-3 h-3" />
                        全部确认
                      </button>
                    )}
                    <button
                      onClick={clearAlerts}
                      className="flex items-center gap-1 px-2 py-0.5 rounded bg-red-900/30 text-[10px] text-red-300 hover:bg-red-900/50 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      清空
                    </button>
                  </div>
                </div>
                {[...alerts]
                  .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                  .slice(0, 20)
                  .map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-2 rounded-md border transition-colors ${
                        alert.acknowledged
                          ? 'bg-slate-800/20 border-slate-700/30 opacity-60'
                          : alert.severity === 'critical'
                          ? 'bg-red-900/20 border-red-700/40'
                          : 'bg-amber-900/20 border-amber-700/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                alert.severity === 'critical'
                                  ? 'bg-red-500/30 text-red-300'
                                  : 'bg-amber-500/30 text-amber-300'
                              }`}
                            >
                              {alert.severity === 'critical' ? '紧急' : '警告'}
                            </span>
                            <span className="text-xs font-medium text-slate-200">
                              {alert.targetName}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {new Date(alert.createdAt).toLocaleString('zh-CN')}
                            </span>
                            {alert.acknowledged && (
                              <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                                <Check className="w-2.5 h-2.5" />
                                已确认
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                            {alert.message}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {alert.triggers.map((t, i) => (
                              <span
                                key={i}
                                className="px-1.5 py-0.5 rounded bg-slate-700/40 text-[10px] text-slate-400 font-mono"
                              >
                                {t.lineLabel}: {t.previousValue.toFixed(2)} →{' '}
                                {t.currentValue.toFixed(2)}
                                <span
                                  className={
                                    t.change < 0 ? 'text-cyan-400' : 'text-rose-400'
                                  }
                                >
                                  {' '}
                                  ({t.change >= 0 ? '+' : ''}
                                  {t.change.toFixed(2)})
                                </span>
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 shrink-0">
                          {!alert.acknowledged && (
                            <button
                              onClick={() => acknowledgeAlert(alert.id)}
                              className="p-1 rounded hover:bg-slate-700/50 text-slate-400 hover:text-green-400 transition-colors"
                              title="确认预警"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {alertConfig.enableEmailNotification &&
                            alertConfig.emailRecipients.length > 0 && (
                              <a
                                href={createEmailLink(alert, alertConfig.emailRecipients)}
                                className="p-1 rounded hover:bg-slate-700/50 text-slate-400 hover:text-amber-400 transition-colors"
                                title="发送邮件通知"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                        </div>
                      </div>
                    </div>
                  ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
