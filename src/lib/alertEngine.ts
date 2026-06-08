import type {
  BeStarObservation,
  AlertRuleConfig,
  AlertStatistics,
  AlertTriggerInfo,
  BeStarAlert,
  AlertEvaluationResult,
  AlertLineKey,
} from '@/types';

const genId = () => Math.random().toString(36).substring(2, 9);

export const LINE_LABELS: Record<AlertLineKey, string> = {
  haEW: 'Hα',
  hbEW: 'Hβ',
};

export const DEFAULT_ALERT_CONFIG: AlertRuleConfig = {
  enabled: true,
  sigmaThreshold: 3,
  consecutiveObservations: 2,
  monitoredLines: ['haEW', 'hbEW'],
  enableEmailNotification: false,
  enableInAppNotification: true,
  emailRecipients: [],
  useCustomAbsoluteThreshold: false,
  customAbsoluteThreshold: undefined,
};

export const computeStatistics = (values: number[], sigmaMultiplier: number = 3): AlertStatistics | null => {
  const finite = values.filter((v) => isFinite(v));
  if (finite.length < 3) return null;

  const mean = finite.reduce((s, v) => s + v, 0) / finite.length;
  const variance = finite.reduce((s, v) => s + (v - mean) ** 2, 0) / finite.length;
  const std = Math.sqrt(variance);

  return {
    mean,
    std,
    count: finite.length,
    upperBound: mean + sigmaMultiplier * std,
    lowerBound: mean - sigmaMultiplier * std,
  };
};

const getLineValue = (obs: BeStarObservation, lineKey: AlertLineKey): number | undefined => {
  if (lineKey === 'haEW') return obs.haEW;
  if (lineKey === 'hbEW') return obs.hbEW;
  return undefined;
};

export const evaluateSingleLine = (
  observations: BeStarObservation[],
  lineKey: AlertLineKey,
  config: AlertRuleConfig
): { trigger: AlertTriggerInfo | null; stats: AlertStatistics | null } => {
  const sorted = [...observations].sort((a, b) =>
    a.observationDate.localeCompare(b.observationDate)
  );

  const valuesWithObs = sorted
    .map((o) => ({ obs: o, value: getLineValue(o, lineKey) }))
    .filter((item): item is { obs: BeStarObservation; value: number } => item.value !== undefined && isFinite(item.value));

  if (valuesWithObs.length < 3) {
    return { trigger: null, stats: null };
  }

  const allValues = valuesWithObs.map((i) => i.value);
  const stats = computeStatistics(allValues, config.sigmaThreshold);
  if (!stats) {
    return { trigger: null, stats: null };
  }

  const consec = Math.max(1, config.consecutiveObservations);
  if (valuesWithObs.length < consec + 1) {
    return { trigger: null, stats };
  }

  let consecutiveOutliers = 0;
  let latestTriggerObs: { obs: BeStarObservation; value: number } | null = null;
  let previousValueForTrigger = 0;

  for (let i = 1; i < valuesWithObs.length; i++) {
    const current = valuesWithObs[i];
    const previous = valuesWithObs[i - 1];
    const change = current.value - previous.value;

    let isOutlier = false;
    let effectiveThreshold: number;

    if (config.useCustomAbsoluteThreshold && config.customAbsoluteThreshold !== undefined) {
      effectiveThreshold = config.customAbsoluteThreshold;
      isOutlier = Math.abs(change) >= effectiveThreshold;
    } else {
      effectiveThreshold = config.sigmaThreshold * stats.std;
      isOutlier = Math.abs(change) >= effectiveThreshold;
    }

    if (isOutlier) {
      consecutiveOutliers++;
      if (consecutiveOutliers >= consec) {
        latestTriggerObs = current;
        previousValueForTrigger = previous.value;
      }
    } else {
      consecutiveOutliers = 0;
    }
  }

  if (!latestTriggerObs) {
    return { trigger: null, stats };
  }

  const change = latestTriggerObs.value - previousValueForTrigger;
  const changePercent = previousValueForTrigger !== 0 ? (change / Math.abs(previousValueForTrigger)) * 100 : 0;

  const trigger: AlertTriggerInfo = {
    lineKey,
    lineLabel: LINE_LABELS[lineKey],
    previousValue: previousValueForTrigger,
    currentValue: latestTriggerObs.value,
    change,
    changePercent,
    threshold: config.useCustomAbsoluteThreshold && config.customAbsoluteThreshold !== undefined
      ? config.customAbsoluteThreshold
      : config.sigmaThreshold * stats.std,
    stats,
    isOutlier: true,
  };

  return { trigger, stats };
};

export const evaluateTarget = (
  targetName: string,
  observations: BeStarObservation[],
  config: AlertRuleConfig,
  existingAlerts: BeStarAlert[] = []
): AlertEvaluationResult => {
  if (!config.enabled) {
    const emptyStats: Record<AlertLineKey, AlertStatistics | null> = {
      haEW: null,
      hbEW: null,
    };
    return { targetName, hasAlert: false, alerts: [], perLineStats: emptyStats };
  }

  const targetObs = observations.filter((o) => o.targetName === targetName);
  const perLineStats: Record<AlertLineKey, AlertStatistics | null> = {
    haEW: null,
    hbEW: null,
  };
  const triggers: AlertTriggerInfo[] = [];

  for (const lineKey of config.monitoredLines) {
    const { trigger, stats } = evaluateSingleLine(targetObs, lineKey, config);
    perLineStats[lineKey] = stats;
    if (trigger) {
      triggers.push(trigger);
    }
  }

  if (triggers.length === 0) {
    return { targetName, hasAlert: false, alerts: [], perLineStats };
  }

  const latestObs = [...targetObs]
    .sort((a, b) => a.observationDate.localeCompare(b.observationDate))
    .slice(-1)[0];

  if (!latestObs) {
    return { targetName, hasAlert: false, alerts: [], perLineStats };
  }

  const alreadyAlerted = existingAlerts.some(
    (a) => a.observationId === latestObs.id && !a.acknowledged
  );

  if (alreadyAlerted) {
    return { targetName, hasAlert: true, alerts: existingAlerts.filter((a) => a.targetName === targetName), perLineStats };
  }

  const maxChange = Math.max(...triggers.map((t) => Math.abs(t.changePercent)));
  const severity: 'warning' | 'critical' = maxChange > 50 ? 'critical' : 'warning';

  const triggerDescriptions = triggers
    .map((t) => `${t.lineLabel} EW 变化 ${t.change >= 0 ? '+' : ''}${t.change.toFixed(2)} Å (${t.changePercent >= 0 ? '+' : ''}${t.changePercent.toFixed(1)}%)`)
    .join('；');

  const alert: BeStarAlert = {
    id: genId(),
    targetName,
    observationId: latestObs.id,
    observationDate: latestObs.observationDate,
    triggers,
    severity,
    createdAt: new Date().toISOString(),
    acknowledged: false,
    message: `Be 星 ${targetName} 于 ${latestObs.observationDate} 监测到发射线异常变化：${triggerDescriptions}`,
  };

  return {
    targetName,
    hasAlert: true,
    alerts: [...existingAlerts.filter((a) => a.targetName === targetName), alert],
    perLineStats,
  };
};

export const evaluateAllTargets = (
  observations: BeStarObservation[],
  config: AlertRuleConfig,
  existingAlerts: BeStarAlert[] = []
): AlertEvaluationResult[] => {
  const targetNames = Array.from(new Set(observations.map((o) => o.targetName)));
  return targetNames.map((name) => evaluateTarget(name, observations, config, existingAlerts));
};

export const getTargetsWithActiveAlerts = (
  evaluations: AlertEvaluationResult[]
): string[] => {
  return evaluations
    .filter((e) => e.hasAlert && e.alerts.some((a) => !a.acknowledged))
    .map((e) => e.targetName);
};

export const sendInAppNotification = (alert: BeStarAlert): void => {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') {
      new Notification(`Be 星爆发预警 - ${alert.targetName}`, {
        body: alert.message,
        icon: '/favicon.svg',
      });
    }
  }
};

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
};

export const createEmailLink = (alert: BeStarAlert, recipients: string[] = []): string => {
  const subject = encodeURIComponent(`[Be星预警] ${alert.targetName} - ${alert.severity === 'critical' ? '紧急' : '警告'}`);
  const body = encodeURIComponent(
    `Be 星爆发预警通知\n\n` +
    `目标天体: ${alert.targetName}\n` +
    `观测日期: ${alert.observationDate}\n` +
    `预警级别: ${alert.severity === 'critical' ? '紧急' : '警告'}\n\n` +
    `详细信息:\n${alert.message}\n\n` +
    `触发详情:\n` +
    alert.triggers
      .map(
        (t) =>
          `  ${t.lineLabel}: ${t.previousValue.toFixed(2)} → ${t.currentValue.toFixed(2)} Å, ` +
          `变化 ${t.change >= 0 ? '+' : ''}${t.change.toFixed(2)} Å (${t.changePercent >= 0 ? '+' : ''}${t.changePercent.toFixed(1)}%)\n` +
          `  历史统计: 均值 ${t.stats.mean.toFixed(2)} Å, σ ${t.stats.std.toFixed(2)} Å, 阈值 ±${t.threshold.toFixed(2)} Å`
      )
      .join('\n') +
    `\n\n请及时跟进观测。`
  );
  const to = recipients.join(',');
  return `mailto:${to}?subject=${subject}&body=${body}`;
};
