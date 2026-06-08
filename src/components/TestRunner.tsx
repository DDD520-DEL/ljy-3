import { useState } from 'react';
import { runAllTests } from '@/tests/spectralAnalysis.test';
import { runAllPersistenceTests } from '@/tests/persistence.test';
import { Play, CheckCircle2, XCircle, Terminal, Loader2 } from 'lucide-react';

export default function TestRunner() {
  const [spectralResults, setSpectralResults] = useState<{
    passed: string[];
    failed: { name: string; error: string }[];
  } | null>(null);

  const [persistenceResults, setPersistenceResults] = useState<{
    passed: string[];
    failed: { name: string; error: string }[];
  } | null>(null);

  const [isRunning, setIsRunning] = useState(false);

  const handleRunSpectral = () => {
    const r = runAllTests();
    setSpectralResults(r);
  };

  const handleRunPersistence = async () => {
    setIsRunning(true);
    try {
      const r = await runAllPersistenceTests();
      setPersistenceResults(r);
    } finally {
      setIsRunning(false);
    }
  };

  const handleRunAll = async () => {
    setIsRunning(true);
    try {
      const sr = runAllTests();
      setSpectralResults(sr);
      const pr = await runAllPersistenceTests();
      setPersistenceResults(pr);
    } finally {
      setIsRunning(false);
    }
  };

  const renderResults = (
    results: { passed: string[]; failed: { name: string; error: string }[] } | null,
    title: string
  ) =>
    results && (
      <div className="space-y-3 pt-4 border-t border-slate-800">
        <h4 className="text-xs font-semibold text-slate-300">{title}</h4>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-900/30 border border-emerald-800/60 text-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5" />
            通过 {results.passed.length}
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-red-900/30 border border-red-800/60 text-red-300">
            <XCircle className="w-3.5 h-3.5" />
            失败 {results.failed.length}
          </div>
        </div>

        <div className="space-y-1.5">
          {results.passed.map((name) => (
            <div
              key={name}
              className="flex items-center gap-2 px-3 py-1.5 rounded bg-emerald-900/10 border border-emerald-800/30 text-xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-mono text-emerald-300">{name}</span>
              <span className="ml-auto text-emerald-400/70">PASS</span>
            </div>
          ))}
          {results.failed.map((f) => (
            <div
              key={f.name}
              className="px-3 py-2 rounded bg-red-900/20 border border-red-800/40 text-xs space-y-1"
            >
              <div className="flex items-center gap-2">
                <XCircle className="w-3.5 h-3.5 text-red-400" />
                <span className="font-mono text-red-300">{f.name}</span>
                <span className="ml-auto text-red-400">FAIL</span>
              </div>
              <div className="text-red-300/80 pl-5">{f.error}</div>
            </div>
          ))}
        </div>
      </div>
    );

  return (
    <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800/80 shadow-xl max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-400" />
          单元测试面板
        </h3>
        <div className="flex gap-2">
          <button
            onClick={handleRunSpectral}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-indigo-700/60 hover:bg-indigo-600 disabled:opacity-40 text-white font-medium transition-colors"
          >
            <Play className="w-3.5 h-3.5" />
            光谱分析测试
          </button>
          <button
            onClick={handleRunPersistence}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-cyan-700/60 hover:bg-cyan-600 disabled:opacity-40 text-white font-medium transition-colors"
          >
            {isRunning ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            持久化测试
          </button>
          <button
            onClick={handleRunAll}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-emerald-700/60 hover:bg-emerald-600 disabled:opacity-40 text-white font-medium transition-colors"
          >
            {isRunning ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            运行全部测试
          </button>
        </div>
      </div>

      {!spectralResults && !persistenceResults && (
        <div className="text-xs text-slate-500 px-2">
          光谱分析测试：归一化算法、等值宽度测量、光谱分类、谱线比值等。
          <br />
          持久化测试：IndexedDB 读写、localStorage 数据迁移、写入队列 latest-wins 策略等。
        </div>
      )}

      {renderResults(spectralResults, '光谱分析测试')}
      {renderResults(persistenceResults, '持久化与同步测试')}
    </div>
  );
}
