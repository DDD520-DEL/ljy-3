import { useState } from 'react';
import {
  Telescope,
  Database,
  Activity,
  LineChart,
  BookOpen,
  Info,
} from 'lucide-react';
import SpectrumImporter from '@/components/SpectrumImporter';
import SpectrumList from '@/components/SpectrumList';
import SpectrumViewer from '@/components/SpectrumViewer';
import ClassificationPanel from '@/components/ClassificationPanel';
import BeStarMonitor from '@/components/BeStarMonitor';
import ProjectSelector from '@/components/ProjectSelector';
import { useAppStore } from '@/store/appStore';

type TabType = 'classify' | 'monitor' | 'help';

export default function Home() {
  const { spectra, clearAll, currentProjectId, beObservations } = useAppStore();
  const [activeTab, setActiveTab] = useState<TabType>('classify');
  const [showInfoOpen, setShowInfoOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-200">
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-sm">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Telescope className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">
                恒星光谱分类与 Be 星监测系统
              </h1>
              <p className="text-[11px] text-slate-400">
                Stellar Spectral Classification &amp; Be-Star Emission Line Monitor
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ProjectSelector />
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/60 border border-slate-700/60 text-[11px] text-slate-400">
              <Database className="w-3 h-3" />
              {spectra.length} 光谱 · {beObservations.length} 观测
            </div>
            <button
              onClick={clearAll}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] bg-slate-800/60 border border-slate-700/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              清空当前项目数据
            </button>
            <button
              onClick={() => setShowInfoOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] bg-slate-800/60 border border-slate-700/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <Info className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">帮助</span>
            </button>
          </div>
        </div>
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 pb-2 flex items-center gap-1 overflow-x-auto">
          <nav className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('classify')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-sm font-medium transition-all ${
                activeTab === 'classify'
                  ? 'bg-cyan-900/40 text-cyan-300 border border-cyan-700/50'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <LineChart className="w-4 h-4" />
              光谱分类
            </button>
            <button
              onClick={() => setActiveTab('monitor')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-sm font-medium transition-all ${
                activeTab === 'monitor'
                  ? 'bg-cyan-900/40 text-cyan-300 border border-cyan-700/50'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Activity className="w-4 h-4" />
              Be 星监测
            </button>
            <button
              onClick={() => setActiveTab('help')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-sm font-medium transition-all ${
                activeTab === 'help'
                  ? 'bg-cyan-900/40 text-cyan-300 border border-cyan-700/50'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              使用说明
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-[1800px] mx-auto px-4 sm:px-6 py-5">
        {activeTab === 'classify' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <aside className="lg:col-span-3 space-y-4">
              <section className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 shadow-xl">
                <h2 className="text-xs font-semibold text-slate-300 mb-3">数据导入</h2>
                <SpectrumImporter />
              </section>
              <section className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 shadow-xl">
                <h2 className="text-xs font-semibold text-slate-300 mb-3 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5" />
                  光谱列表
                </h2>
                <SpectrumList />
              </section>
            </aside>
            <div className="lg:col-span-6 space-y-4">
              <section className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 shadow-xl">
                <h2 className="text-xs font-semibold text-slate-300 mb-3">光谱显示</h2>
                <SpectrumViewer />
              </section>
            </div>
            <aside className="lg:col-span-3">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 shadow-xl sticky top-32">
                <ClassificationPanel />
              </div>
            </aside>
          </div>
        )}

        {activeTab === 'monitor' && (
          <section className="p-5 rounded-xl bg-slate-900/60 border border-slate-800/80 shadow-xl">
            <BeStarMonitor />
          </section>
        )}

        {activeTab === 'help' && (
          <section className="p-6 rounded-xl bg-slate-900/60 border border-slate-800/80 shadow-xl max-w-3xl mx-auto">
            <div className="space-y-5 text-sm text-slate-300">
              <h2 className="text-xl font-bold text-white mb-4">使用说明</h2>
              <div>
                <h3 className="text-base font-semibold text-cyan-300 mb-2">1. 数据导入</h3>
                <p className="text-slate-400">支持 CSV 格式文件，应包含两列数据：</p>
                <ul className="mt-2 space-y-1 list-disc list-inside text-slate-400">
                  <li>波长 (单位: Angstrom / Å)</li>
                  <li>相对强度 / 流量 / 计数</li>
                </ul>
                <p className="mt-2 text-slate-400">
                  文件首行应为表头，例如{' '}
                  <code className="px-1.5 py-0.5 rounded bg-slate-800 text-[11px]">
                    wavelength,intensity
                  </code>
                  。导入后会自动归一化处理。
                </p>
              </div>
              <div>
                <h3 className="text-base font-semibold text-cyan-300 mb-2">2. 光谱分类</h3>
                <p className="text-slate-400">
                  系统根据 Morgan-Keenan (MK) 二元分类系统自动匹配：
                </p>
                <ul className="mt-2 space-y-1 list-disc list-inside text-slate-400">
                  <li>
                    <strong>光谱型 (O, B, A, F, G, K, M)</strong>：基于温度判定
                  </li>
                  <li>
                    <strong>光度级 (I-VII)</strong>：基于光度判定
                  </li>
                  <li>自动标注氢巴尔末线系 (Hα, Hβ, Hγ ...)</li>
                  <li>检测 He I/II 线系与主要金属线 (Ca II, Na I, Mg I, Fe I 等)</li>
                </ul>
              </div>
              <div>
                <h3 className="text-base font-semibold text-cyan-300 mb-2">3. Be 星监测</h3>
                <p className="text-slate-400">
                  Be 星是具有巴尔末发射线的 B 型发射星。系统支持：
                </p>
                <ul className="mt-2 space-y-1 list-disc list-inside text-slate-400">
                  <li>同一目标多历元光谱叠加对比</li>
                  <li>Hα / Hβ 发射线等值宽度 (EW) 测量</li>
                  <li>等值宽度时间序列趋势图</li>
                  <li>V 星等光变曲线</li>
                </ul>
              </div>
              <div>
                <h3 className="text-base font-semibold text-cyan-300 mb-2">4. 谱线标注</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
                  <div className="p-2.5 rounded-md bg-slate-800/50">
                    <span className="text-red-400 font-mono text-sm">氢巴尔末线系</span>
                    <p className="text-[11px] text-slate-400 mt-1">红色标注</p>
                    <p className="text-[11px] text-slate-400">
                      Hα 6562.8, Hβ 4861.3, Hγ 4340.5 ...
                    </p>
                  </div>
                  <div className="p-2.5 rounded-md bg-slate-800/50">
                    <span className="text-blue-400 font-mono text-sm">氦线</span>
                    <p className="text-[11px] text-slate-400 mt-1">蓝色标注</p>
                    <p className="text-[11px] text-slate-400">
                      He I 5875.6, He I 4471.5, He II 4685.7
                    </p>
                  </div>
                  <div className="p-2.5 rounded-md bg-slate-800/50">
                    <span className="text-amber-400 font-mono text-sm">金属线</span>
                    <p className="text-[11px] text-slate-400 mt-1">橙色/绿色标注</p>
                    <p className="text-[11px] text-slate-400">
                      Ca II, Na I D, Mg I b, Fe I
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      {showInfoOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowInfoOpen(false)}
        >
          <div
            className="max-w-md w-full mx-4 p-6 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-white">关于本系统</h3>
            <p className="mt-2 text-sm text-slate-400">面向业余天文学家的光谱分类辅助工具</p>
            <div className="mt-4 text-xs text-slate-500">
              本系统提供低分辨率光谱的快速 MK 光谱型识别与 Be
              星发射线长期监测记录。适用于使用小型望远镜 + 低色散光谱仪的观测数据处理。
            </div>
            <div className="mt-4 pt-4 border-t border-slate-700/60 flex justify-end">
              <button
                onClick={() => setShowInfoOpen(false)}
                className="px-4 py-1.5 rounded-md bg-cyan-700/60 hover:bg-cyan-600 text-white text-sm transition-colors"
              >
                知道了
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
