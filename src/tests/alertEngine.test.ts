import type { BeStarObservation, AlertRuleConfig, BeStarAlert, AlertLineKey } from '@/types';
import {
  computeStatistics,
  evaluateSingleLine,
  evaluateTarget,
  evaluateAllTargets,
  getTargetsWithActiveAlerts,
  DEFAULT_ALERT_CONFIG,
  LINE_LABELS,
  createEmailLink,
} from '@/lib/alertEngine';

const makeObs = (
  id: string,
  targetName: string,
  date: string,
  haEW: number,
  hbEW?: number
): BeStarObservation => ({
  id,
  targetName,
  observationDate: date,
  spectrumId: `sp-${id}`,
  haEW,
  hbEW,
  vMagnitude: undefined,
  notes: '',
});

function assert(condition: boolean, msg: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

function assertClose(actual: number, expected: number, tolerance: number, msg: string): void {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(
      `Assertion failed: ${msg}. Expected ${expected} ±${tolerance}, got ${actual}`
    );
  }
}

export const testComputeStatisticsBasic = () => {
  const values = [1, 2, 3, 4, 5];
  const stats = computeStatistics(values, 3);
  assert(stats !== null, 'should return stats for 5 values');
  assertClose(stats!.mean, 3, 1e-6, 'mean should be 3');
  assertClose(stats!.std, Math.sqrt(2), 1e-3, 'std should be sqrt(2) ≈ 1.414');
  assert(stats!.count === 5, 'count should be 5');
  assertClose(stats!.upperBound, 3 + 3 * Math.sqrt(2), 1e-3, 'upperBound correct');
  assertClose(stats!.lowerBound, 3 - 3 * Math.sqrt(2), 1e-3, 'lowerBound correct');
};

export const testComputeStatisticsInsufficientData = () => {
  assert(computeStatistics([1, 2]) === null, '2 values should return null');
  assert(computeStatistics([]) === null, 'empty should return null');
  assert(computeStatistics([1]) === null, '1 value should return null');
};

export const testComputeStatisticsFiltersNonFinite = () => {
  const stats = computeStatistics([1, NaN, 3, Infinity, 5, -Infinity], 3);
  assert(stats !== null, 'should ignore non-finite and compute on valid values');
  assert(stats!.count === 3, 'should count only valid values');
  assertClose(stats!.mean, 3, 1e-6, 'mean of [1,3,5] should be 3');
};

export const testDefaultAlertConfig = () => {
  assert(DEFAULT_ALERT_CONFIG.enabled === true, 'alerting enabled by default');
  assert(DEFAULT_ALERT_CONFIG.sigmaThreshold === 3, 'default sigma is 3');
  assert(DEFAULT_ALERT_CONFIG.consecutiveObservations === 2, 'default consecutive is 2');
  assert(DEFAULT_ALERT_CONFIG.monitoredLines.includes('haEW'), 'monitors Hα by default');
  assert(DEFAULT_ALERT_CONFIG.monitoredLines.includes('hbEW'), 'monitors Hβ by default');
  assert(DEFAULT_ALERT_CONFIG.enableInAppNotification === true, 'in-app enabled by default');
  assert(DEFAULT_ALERT_CONFIG.enableEmailNotification === false, 'email disabled by default');
  assert(DEFAULT_ALERT_CONFIG.useCustomAbsoluteThreshold === false, 'custom threshold disabled');
};

export const testLineLabels = () => {
  assert(LINE_LABELS.haEW === 'Hα', 'haEW label is Hα');
  assert(LINE_LABELS.hbEW === 'Hβ', 'hbEW label is Hβ');
};

export const testEvaluateSingleLineNoOutlier = () => {
  const observations: BeStarObservation[] = [];
  for (let i = 0; i < 10; i++) {
    observations.push(
      makeObs(`obs-${i}`, 'Test', `2026-01-${String(i + 1).padStart(2, '0')}`, -5 + (Math.random() - 0.5) * 0.2)
    );
  }
  const { trigger, stats } = evaluateSingleLine(observations, 'haEW', DEFAULT_ALERT_CONFIG);
  assert(stats !== null, 'should have stats for 10 observations');
  assert(trigger === null, 'no outlier in stable data should produce no trigger');
};

export const testEvaluateSingleLineInsufficientData = () => {
  const observations: BeStarObservation[] = [
    makeObs('1', 'Test', '2026-01-01', -5),
    makeObs('2', 'Test', '2026-01-02', -5.1),
  ];
  const { trigger, stats } = evaluateSingleLine(observations, 'haEW', DEFAULT_ALERT_CONFIG);
  assert(stats === null, 'should have no stats with only 2 observations');
  assert(trigger === null, 'should have no trigger');
};

export const testEvaluateSingleLineWithOutlier = () => {
  const observations: BeStarObservation[] = [];
  for (let i = 0; i < 8; i++) {
    observations.push(
      makeObs(`obs-${i}`, 'Test', `2026-01-${String(i + 1).padStart(2, '0')}`, -5 + (i - 4) * 0.05)
    );
  }
  observations.push(makeObs('obs-8', 'Test', '2026-01-09', -5.2));
  observations.push(makeObs('obs-9', 'Test', '2026-01-10', -12.0));
  observations.push(makeObs('obs-10', 'Test', '2026-01-11', -15.0));

  const config: AlertRuleConfig = { ...DEFAULT_ALERT_CONFIG, consecutiveObservations: 2 };
  const { trigger, stats } = evaluateSingleLine(observations, 'haEW', config);

  assert(stats !== null, 'stats should be computed');
  assert(trigger !== null, 'large outlier changes should trigger alert');
  if (trigger) {
    assert(trigger.lineKey === 'haEW', 'trigger line should be haEW');
    assert(trigger.isOutlier === true, 'should be marked as outlier');
    assert(Math.abs(trigger.change) > trigger.threshold, 'change should exceed threshold');
    assert(isFinite(trigger.changePercent), 'change percent should be finite');
  }
};

export const testEvaluateSingleLineCustomAbsoluteThreshold = () => {
  const observations: BeStarObservation[] = [];
  for (let i = 0; i < 6; i++) {
    observations.push(
      makeObs(`obs-${i}`, 'Test', `2026-01-${String(i + 1).padStart(2, '0')}`, -5.0)
    );
  }
  observations.push(makeObs('obs-6', 'Test', '2026-01-07', -6.0));
  observations.push(makeObs('obs-7', 'Test', '2026-01-08', -7.0));

  const config: AlertRuleConfig = {
    ...DEFAULT_ALERT_CONFIG,
    useCustomAbsoluteThreshold: true,
    customAbsoluteThreshold: 0.8,
    consecutiveObservations: 1,
  };

  const { trigger } = evaluateSingleLine(observations, 'haEW', config);
  assert(trigger !== null, 'should trigger with custom absolute threshold');
  if (trigger) {
    assert(trigger.threshold === 0.8, 'threshold should use custom absolute value');
  }
};

export const testEvaluateSingleLineConsecutiveRequirement = () => {
  const observations: BeStarObservation[] = [];
  for (let i = 0; i < 8; i++) {
    observations.push(
      makeObs(`obs-${i}`, 'Test', `2026-01-${String(i + 1).padStart(2, '0')}`, -5.0)
    );
  }
  observations.push(makeObs('obs-8', 'Test', '2026-01-09', -10.0));
  observations.push(makeObs('obs-9', 'Test', '2026-01-10', -5.1));

  const config: AlertRuleConfig = { ...DEFAULT_ALERT_CONFIG, consecutiveObservations: 2 };
  const { trigger } = evaluateSingleLine(observations, 'haEW', config);
  assert(trigger === null, 'single spike followed by normal should not trigger with consec=2');
};

export const testEvaluateTargetNoAlert = () => {
  const observations: BeStarObservation[] = [];
  for (let i = 0; i < 8; i++) {
    observations.push(
      makeObs(`obs-${i}`, 'TestStar', `2026-01-${String(i + 1).padStart(2, '0')}`, -5.0 + (Math.random() - 0.5) * 0.1, -1.5)
    );
  }
  const result = evaluateTarget('TestStar', observations, DEFAULT_ALERT_CONFIG);
  assert(result.targetName === 'TestStar', 'target name preserved');
  assert(result.hasAlert === false, 'no alert for stable data');
  assert(result.alerts.length === 0, 'no alert objects');
  assert(result.perLineStats.haEW !== null, 'haEW stats computed');
};

export const testEvaluateTargetWithAlert = () => {
  const observations: BeStarObservation[] = [];
  for (let i = 0; i < 6; i++) {
    observations.push(
      makeObs(`obs-${i}`, 'BeStar', `2026-01-${String(i + 1).padStart(2, '0')}`, -5.0, -1.5)
    );
  }
  observations.push(makeObs('obs-6', 'BeStar', '2026-01-07', -8.0, -2.5));
  observations.push(makeObs('obs-7', 'BeStar', '2026-01-08', -12.0, -4.0));

  const config: AlertRuleConfig = { ...DEFAULT_ALERT_CONFIG, consecutiveObservations: 1 };
  const result = evaluateTarget('BeStar', observations, config);
  assert(result.hasAlert === true, 'should detect alert');
  assert(result.alerts.length > 0, 'should produce alert objects');

  const alert = result.alerts[result.alerts.length - 1];
  assert(alert.targetName === 'BeStar', 'alert has correct target');
  assert(alert.triggers.length > 0, 'alert has triggers');
  assert(typeof alert.message === 'string' && alert.message.length > 0, 'alert has message');
  assert(alert.severity === 'warning' || alert.severity === 'critical', 'severity is valid');
  assert(alert.acknowledged === false, 'new alert is unacknowledged');
};

export const testEvaluateTargetDisabled = () => {
  const observations: BeStarObservation[] = [];
  for (let i = 0; i < 10; i++) {
    observations.push(
      makeObs(`obs-${i}`, 'BeStar', `2026-01-${String(i + 1).padStart(2, '0')}`, i > 5 ? -20 : -5.0)
    );
  }
  const config: AlertRuleConfig = { ...DEFAULT_ALERT_CONFIG, enabled: false };
  const result = evaluateTarget('BeStar', observations, config);
  assert(result.hasAlert === false, 'disabled config should not alert');
  assert(result.alerts.length === 0, 'no alerts when disabled');
};

export const testEvaluateAllTargets = () => {
  const observations: BeStarObservation[] = [];
  for (let i = 0; i < 8; i++) {
    observations.push(
      makeObs(`a-${i}`, 'StarA', `2026-01-${String(i + 1).padStart(2, '0')}`, -5.0)
    );
    observations.push(
      makeObs(`b-${i}`, 'StarB', `2026-01-${String(i + 1).padStart(2, '0')}`, i > 5 ? -15 : -5.0)
    );
  }
  const config: AlertRuleConfig = { ...DEFAULT_ALERT_CONFIG, consecutiveObservations: 1 };
  const results = evaluateAllTargets(observations, config);
  assert(results.length === 2, 'should evaluate both targets');
  const starA = results.find((r) => r.targetName === 'StarA');
  const starB = results.find((r) => r.targetName === 'StarB');
  assert(starA !== undefined && starA.hasAlert === false, 'StarA has no alert');
  assert(starB !== undefined && starB.hasAlert === true, 'StarB has alert');
};

export const testGetTargetsWithActiveAlerts = () => {
  const eval1 = {
    targetName: 'StarA',
    hasAlert: true,
    alerts: [
      { id: '1', targetName: 'StarA', observationId: 'o1', observationDate: '2026-01-01', triggers: [], severity: 'warning' as const, createdAt: '', acknowledged: false, message: '' },
    ],
    perLineStats: { haEW: null, hbEW: null },
  };
  const eval2 = {
    targetName: 'StarB',
    hasAlert: true,
    alerts: [
      { id: '2', targetName: 'StarB', observationId: 'o2', observationDate: '2026-01-01', triggers: [], severity: 'warning' as const, createdAt: '', acknowledged: true, message: '' },
    ],
    perLineStats: { haEW: null, hbEW: null },
  };
  const eval3 = {
    targetName: 'StarC',
    hasAlert: false,
    alerts: [],
    perLineStats: { haEW: null, hbEW: null },
  };

  const active = getTargetsWithActiveAlerts([eval1, eval2, eval3]);
  assert(active.includes('StarA'), 'StarA with unacknowledged alert is active');
  assert(!active.includes('StarB'), 'StarB with only acknowledged alerts is inactive');
  assert(!active.includes('StarC'), 'StarC with no alerts is inactive');
  assert(active.length === 1, 'only one active target');
};

export const testEvaluateTargetAvoidsDuplicateAlerts = () => {
  const observations: BeStarObservation[] = [];
  for (let i = 0; i < 8; i++) {
    observations.push(
      makeObs(`obs-${i}`, 'DupStar', `2026-01-${String(i + 1).padStart(2, '0')}`, i > 5 ? -20 : -5.0)
    );
  }
  const config: AlertRuleConfig = { ...DEFAULT_ALERT_CONFIG, consecutiveObservations: 1 };
  const result1 = evaluateTarget('DupStar', observations, config);
  const alertCount1 = result1.alerts.length;
  assert(alertCount1 > 0, 'first evaluation produces alert');

  const result2 = evaluateTarget('DupStar', observations, config, result1.alerts);
  assert(result2.alerts.length === alertCount1, 'second evaluation should not produce duplicate');
};

export const testCreateEmailLinkFormat = () => {
  const alert: BeStarAlert = {
    id: 'test',
    targetName: 'TestStar',
    observationId: 'obs-1',
    observationDate: '2026-01-15',
    triggers: [
      {
        lineKey: 'haEW',
        lineLabel: 'Hα',
        previousValue: -5.0,
        currentValue: -10.0,
        change: -5.0,
        changePercent: 100,
        threshold: 1.5,
        stats: { mean: -5.0, std: 0.5, count: 10, upperBound: -3.5, lowerBound: -6.5 },
        isOutlier: true,
      },
    ],
    severity: 'critical',
    createdAt: '2026-01-15T10:00:00Z',
    acknowledged: false,
    message: 'Test alert message',
  };

  const link = createEmailLink(alert, ['a@test.com', 'b@test.com']);
  assert(link.startsWith('mailto:'), 'should start with mailto:');
  assert(link.includes('a@test.com'), 'should include first recipient');
  assert(link.includes('b@test.com'), 'should include second recipient');
  assert(link.includes('subject='), 'should have subject param');
  assert(link.includes('body='), 'should have body param');
  assert(decodeURIComponent(link).includes('TestStar'), 'body should contain target name');
};

export const testEvaluateTargetFiltersByTargetName = () => {
  const observations: BeStarObservation[] = [];
  for (let i = 0; i < 10; i++) {
    observations.push(
      makeObs(`x-${i}`, 'TargetX', `2026-01-${String(i + 1).padStart(2, '0')}`, i > 7 ? -20 : -5.0)
    );
    observations.push(
      makeObs(`y-${i}`, 'TargetY', `2026-01-${String(i + 1).padStart(2, '0')}`, -5.0)
    );
  }
  const config: AlertRuleConfig = { ...DEFAULT_ALERT_CONFIG, consecutiveObservations: 1 };
  const resultX = evaluateTarget('TargetX', observations, config);
  const resultY = evaluateTarget('TargetY', observations, config);
  assert(resultX.hasAlert === true, 'TargetX has outlier data → alert');
  assert(resultY.hasAlert === false, 'TargetY is stable → no alert');
};

export const testEvaluateSingleLineHb = () => {
  const observations: BeStarObservation[] = [];
  for (let i = 0; i < 8; i++) {
    observations.push(
      makeObs(`obs-${i}`, 'Test', `2026-01-${String(i + 1).padStart(2, '0')}`, -5.0, -1.5)
    );
  }
  observations.push(makeObs('obs-8', 'Test', '2026-01-09', -5.1, -3.0));
  observations.push(makeObs('obs-9', 'Test', '2026-01-10', -5.2, -5.0));

  const config: AlertRuleConfig = { ...DEFAULT_ALERT_CONFIG, consecutiveObservations: 2 };
  const { trigger } = evaluateSingleLine(observations, 'hbEW', config);
  assert(trigger !== null, 'Hβ outlier should trigger');
  assert(trigger?.lineKey === 'hbEW', 'trigger line should be hbEW');
  assert(trigger?.lineLabel === 'Hβ', 'trigger label should be Hβ');
};

export const runAlertTests = (): { passed: string[]; failed: { name: string; error: string }[] } => {
  const tests = [
    { name: 'computeStatisticsBasic', fn: testComputeStatisticsBasic },
    { name: 'computeStatisticsInsufficientData', fn: testComputeStatisticsInsufficientData },
    { name: 'computeStatisticsFiltersNonFinite', fn: testComputeStatisticsFiltersNonFinite },
    { name: 'defaultAlertConfig', fn: testDefaultAlertConfig },
    { name: 'lineLabels', fn: testLineLabels },
    { name: 'evaluateSingleLineNoOutlier', fn: testEvaluateSingleLineNoOutlier },
    { name: 'evaluateSingleLineInsufficientData', fn: testEvaluateSingleLineInsufficientData },
    { name: 'evaluateSingleLineWithOutlier', fn: testEvaluateSingleLineWithOutlier },
    { name: 'evaluateSingleLineCustomAbsoluteThreshold', fn: testEvaluateSingleLineCustomAbsoluteThreshold },
    { name: 'evaluateSingleLineConsecutiveRequirement', fn: testEvaluateSingleLineConsecutiveRequirement },
    { name: 'evaluateTargetNoAlert', fn: testEvaluateTargetNoAlert },
    { name: 'evaluateTargetWithAlert', fn: testEvaluateTargetWithAlert },
    { name: 'evaluateTargetDisabled', fn: testEvaluateTargetDisabled },
    { name: 'evaluateAllTargets', fn: testEvaluateAllTargets },
    { name: 'getTargetsWithActiveAlerts', fn: testGetTargetsWithActiveAlerts },
    { name: 'evaluateTargetAvoidsDuplicateAlerts', fn: testEvaluateTargetAvoidsDuplicateAlerts },
    { name: 'createEmailLinkFormat', fn: testCreateEmailLinkFormat },
    { name: 'evaluateTargetFiltersByTargetName', fn: testEvaluateTargetFiltersByTargetName },
    { name: 'evaluateSingleLineHb', fn: testEvaluateSingleLineHb },
  ];

  const passed: string[] = [];
  const failed: { name: string; error: string }[] = [];

  for (const test of tests) {
    try {
      test.fn();
      passed.push(test.name);
    } catch (e) {
      failed.push({ name: test.name, error: (e as Error).message });
    }
  }

  return { passed, failed };
};
