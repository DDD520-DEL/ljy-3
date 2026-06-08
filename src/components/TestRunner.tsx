import { useState } from 'react';
import { runAllTests } from '@/tests/spectralAnalysis.test';
import { Play, CheckCircle2, XCircle, Terminal } from 'lucide-react';

export default function TestRunner() {
  const [results, setResults] = useState<{
    passed: string[];
    failed: { name: string; error: string }[];
  } | null>(null);

  const handleRun = () => {
    const r = runAllTests();
    setResults(r);
  };

  return (
    <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800/80 shadow-xl max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-400" />
          光谱分析单元测试
        </h3>
        <button
          onClick={handleRun}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-emerald-700/60 hover:bg-emerald-600 disabled:opacity-40 text-white font-medium transition-colors"
        >
          <Play className="w-3.5 h-3.5" />
          运行全部测试
        </button>
      </div>

      {results && (
        <div className="space-y-3">
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
      )}

      {!results && (
        <div className="text-xs text-slate-500 px-2">
          共 8 个测试用例：归一化算法（平谱/Be星发射线/吸收线/空输入）、等值宽度测量（发射/吸收）、光谱分类类型安全、谱线比值有限性。
        </div>
      )}
    </div>
  );
}
