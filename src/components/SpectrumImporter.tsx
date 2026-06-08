import { useState, useCallback } from 'react';
import Papa from 'papaparse';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Sparkles } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { normalizeSpectrumSigmaClipping } from '@/lib/spectralAnalysis';
import type { SpectrumData, SpectrumPoint } from '@/types';

const genId = () => Math.random().toString(36).substring(2, 9);

export default function SpectrumImporter() {
  const { addSpectrum, loadSampleData, spectra } = useAppStore();
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const processCSV = useCallback(
    (file: File) => {
      setError(null);
      setSuccess(null);
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        complete: (results) => {
          try {
            const data = results.data as Array<Record<string, number>>;
            const points: SpectrumPoint[] = [];

            for (const row of data) {
              const keys = Object.keys(row);
              const wlKey = keys.find(
                (k) => /wav|lambda|angstrom|波长|wl/i.test(k)
              ) || keys[0];
              const intKey = keys.find(
                (k) => /intensity|flux|count|强度|flux|rel/i.test(k)
              ) || keys[1];

              if (wlKey && intKey && row[wlKey] !== undefined && row[intKey] !== undefined) {
                const wl = Number(row[wlKey]);
                const inten = Number(row[intKey]);
                if (!isNaN(wl) && !isNaN(inten) && wl > 0) {
                  points.push({ wavelength: wl, intensity: inten });
                }
              }
            }

            if (points.length < 10) {
              setError('无法解析有效光谱数据点，请检查CSV格式');
              return;
            }

            points.sort((a, b) => a.wavelength - b.wavelength);
            const normalizedPoints = normalizeSpectrumSigmaClipping(points);

            const spectrum: SpectrumData = {
              id: genId(),
              name: file.name.replace(/\.[^/.]+$/, ''),
              targetName: 'Unknown',
              observationDate: new Date().toISOString().split('T')[0],
              wavelengthMin: normalizedPoints[0].wavelength,
              wavelengthMax: normalizedPoints[normalizedPoints.length - 1].wavelength,
              points: normalizedPoints,
              isNormalized: true,
            };

            addSpectrum(spectrum);
            setSuccess(`成功导入光谱: ${spectrum.name} (${normalizedPoints.length} 个数据点)`);
            setTimeout(() => setSuccess(null), 3000);
          } catch (e) {
            setError('解析CSV文件时出错: ' + (e as Error).message);
          }
        },
        error: (err) => {
          setError('CSV解析错误: ' + err.message);
        },
      });
    },
    [addSpectrum]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const files = Array.from(e.dataTransfer.files);
      for (const file of files) {
        if (file.name.toLowerCase().endsWith('.csv') || file.name.toLowerCase().endsWith('.fits')) {
          if (file.name.toLowerCase().endsWith('.fits')) {
            setError('FITS格式需要astrojs库支持，请使用CSV格式或转换数据');
          } else {
            processCSV(file);
          }
        } else {
          setError('不支持的文件格式，请上传 .csv 文件');
        }
      }
    },
    [processCSV]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          if (file.name.toLowerCase().endsWith('.csv')) {
            processCSV(file);
          } else if (file.name.toLowerCase().endsWith('.fits')) {
            setError('FITS格式需要专业天文库支持，请先转换为CSV格式');
          }
        }
      }
      e.target.value = '';
    },
    [processCSV]
  );

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`relative rounded-lg border-2 border-dashed transition-all duration-200 cursor-pointer ${
          dragOver
            ? 'border-cyan-400 bg-cyan-900/30'
            : 'border-slate-600 bg-slate-800/40 hover:border-slate-500 hover:bg-slate-800/60'
        }`}
      >
        <label className="flex flex-col items-center justify-center py-6 px-4 cursor-pointer">
          <Upload className="w-8 h-8 mb-2 text-slate-400" />
          <p className="text-sm font-medium text-slate-300">拖拽光谱文件到此处</p>
          <p className="text-xs text-slate-500 mt-1">
            支持 CSV（波长,强度）或 FITS 格式
          </p>
          <input
            type="file"
            multiple
            accept=".csv,.fits,.fit"
            className="hidden"
            onChange={handleFileSelect}
          />
        </label>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-900/30 border border-red-800 text-red-300 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-900/30 border border-emerald-800 text-emerald-300 text-sm">
          <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={loadSampleData}
          className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-medium transition-all"
        >
          <Sparkles className="w-4 h-4" />
          加载示例数据
        </button>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-xs text-slate-400">
          <FileSpreadsheet className="w-4 h-4" />
          {spectra.length} 个光谱
        </div>
      </div>
    </div>
  );
}
