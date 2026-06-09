import { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  X,
  MapPin,
  Trash2,
  ChevronDown,
  ChevronRight,
  Sparkles,
  List,
  Layers,
} from 'lucide-react';
import { SPECTRAL_LINES, PERIODIC_GROUP_LABELS, ELEMENT_NAMES, WAVELENGTH_RANGES } from '@/data/astronomy';
import { useAppStore } from '@/store/appStore';
import type { SpectralLine } from '@/types';

type GroupMode = 'periodic' | 'category' | 'element';

export default function SpectralLineReference() {
  const {
    spectralLineMarkers,
    addSpectralLineMarker,
    removeSpectralLineMarker,
    clearSpectralLineMarkers,
  } = useAppStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [wlMin, setWlMin] = useState<string>('');
  const [wlMax, setWlMax] = useState<string>('');
  const [wlPreset, setWlPreset] = useState<string>('optical');
  const [groupMode, setGroupMode] = useState<GroupMode>('periodic');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [selectedLine, setSelectedLine] = useState<SpectralLine | null>(null);

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  const isLineMarked = (line: SpectralLine) =>
    spectralLineMarkers.some(
      (m) => m.wavelength === line.wavelength && m.label === line.label
    );

  const handleLineClick = (line: SpectralLine) => {
    setSelectedLine(line);
    if (!isLineMarked(line)) {
      addSpectralLineMarker(line);
    }
  };

  const filteredLines = useMemo(() => {
    let lines = [...SPECTRAL_LINES];

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      lines = lines.filter((l) => {
        const elementName = ELEMENT_NAMES[l.element] || '';
        return (
          l.label.toLowerCase().includes(q) ||
          l.element.toLowerCase().includes(q) ||
          elementName.includes(q) ||
          elementName.toLowerCase().includes(q) ||
          l.ion.toLowerCase().includes(q) ||
          String(l.wavelength).includes(q) ||
          (l.transition && l.transition.toLowerCase().includes(q)) ||
          (l.description && l.description.toLowerCase().includes(q))
        );
      });
    }

    if (wlMin) {
      const min = parseFloat(wlMin);
      if (!isNaN(min)) lines = lines.filter((l) => l.wavelength >= min);
    }
    if (wlMax) {
      const max = parseFloat(wlMax);
      if (!isNaN(max)) lines = lines.filter((l) => l.wavelength <= max);
    }

    return lines.sort((a, b) => a.wavelength - b.wavelength);
  }, [searchQuery, wlMin, wlMax]);

  const groupedLines = useMemo(() => {
    const groups: Record<string, SpectralLine[]> = {};

    if (groupMode === 'periodic') {
      for (const line of filteredLines) {
        const key = line.periodicGroup || 'transition_metal';
        if (!groups[key]) groups[key] = [];
        groups[key].push(line);
      }
    } else if (groupMode === 'category') {
      for (const line of filteredLines) {
        const key = line.category;
        if (!groups[key]) groups[key] = [];
        groups[key].push(line);
      }
    } else if (groupMode === 'element') {
      for (const line of filteredLines) {
        const key = line.element;
        if (!groups[key]) groups[key] = [];
        groups[key].push(line);
      }
    }

    return groups;
  }, [filteredLines, groupMode]);

  const sortedGroupKeys = useMemo(() => {
    const keys = Object.keys(groupedLines);
    if (groupMode === 'periodic') {
      return keys.sort(
        (a, b) =>
          (PERIODIC_GROUP_LABELS[a]?.order || 99) - (PERIODIC_GROUP_LABELS[b]?.order || 99)
      );
    } else if (groupMode === 'category') {
      const order: Record<string, number> = { hydrogen: 1, helium: 2, metal: 3 };
      return keys.sort((a, b) => (order[a] || 99) - (order[b] || 99));
    } else {
      return keys.sort((a, b) => a.localeCompare(b));
    }
  }, [groupedLines, groupMode]);

  const handlePresetWl = (key: string) => {
    setWlPreset(key);
    if (key === 'all') {
      setWlMin('');
      setWlMax('');
    } else {
      const range = WAVELENGTH_RANGES[key as keyof typeof WAVELENGTH_RANGES];
      if (range) {
        setWlMin(String(range.min));
        setWlMax(String(range.max));
      }
    }
  };

  const getGroupLabel = (key: string) => {
    if (groupMode === 'periodic') {
      return PERIODIC_GROUP_LABELS[key]?.label || key;
    } else if (groupMode === 'category') {
      const map: Record<string, string> = {
        hydrogen: '氢线 (Hydrogen)',
        helium: '氦线 (Helium)',
        metal: '金属线 (Metals)',
      };
      return map[key] || key;
    } else {
      const cn = ELEMENT_NAMES[key] || '';
      return cn ? `${key} (${cn})` : key;
    }
  };

  const getGroupBadgeClass = (key: string) => {
    if (groupMode === 'periodic') {
      return PERIODIC_GROUP_LABELS[key]?.color || 'bg-slate-700/60 text-slate-300 border-slate-600/60';
    } else if (groupMode === 'category') {
      const map: Record<string, string> = {
        hydrogen: 'bg-red-900/40 text-red-300 border-red-700/50',
        helium: 'bg-sky-900/40 text-sky-300 border-sky-700/50',
        metal: 'bg-amber-900/40 text-amber-300 border-amber-700/50',
      };
      return map[key] || 'bg-slate-700/60 text-slate-300 border-slate-600/60';
    }
    return 'bg-slate-700/60 text-slate-300 border-slate-600/60';
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-violet-400" />
          谱线速查表
        </h2>
        {spectralLineMarkers.length > 0 && (
          <button
            onClick={clearSpectralLineMarkers}
            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] bg-slate-700/50 hover:bg-slate-700 text-slate-400 hover:text-red-300 transition-colors"
            title="清除所有临时标记"
          >
            <Trash2 className="w-3 h-3" />
            清除标记 ({spectralLineMarkers.length})
          </button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜索元素/谱线/波长..."
          className="w-full pl-8 pr-8 py-1.5 text-xs rounded-md bg-slate-800/60 border border-slate-700/60 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <Filter className="w-3 h-3 text-slate-500" />
          <span className="text-[10px] text-slate-500">波长范围:</span>
          <div className="flex items-center gap-1 flex-wrap">
            {[
              { key: 'all', label: '全部' },
              { key: 'optical', label: '可见光' },
              { key: 'blue', label: '蓝' },
              { key: 'green', label: '绿' },
              { key: 'red', label: '红' },
              { key: 'uv', label: '近紫外' },
              { key: 'nir', label: '近红外' },
            ].map((p) => (
              <button
                key={p.key}
                onClick={() => handlePresetWl(p.key)}
                className={`px-1.5 py-0.5 rounded text-[10px] transition-colors ${
                  wlPreset === p.key
                    ? 'bg-violet-700/50 text-violet-200 border border-violet-600/50'
                    : 'bg-slate-800/40 text-slate-400 hover:text-slate-300 border border-slate-700/40'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={wlMin}
            onChange={(e) => {
              setWlMin(e.target.value);
              setWlPreset('');
            }}
            placeholder="最小 Å"
            className="w-20 px-2 py-1 text-[11px] rounded bg-slate-800/60 border border-slate-700/60 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500/50 font-mono"
          />
          <span className="text-slate-600 text-xs">—</span>
          <input
            type="number"
            value={wlMax}
            onChange={(e) => {
              setWlMax(e.target.value);
              setWlPreset('');
            }}
            placeholder="最大 Å"
            className="w-20 px-2 py-1 text-[11px] rounded bg-slate-800/60 border border-slate-700/60 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500/50 font-mono"
          />
          <span className="text-[10px] text-slate-500 ml-auto">
            共 {filteredLines.length} 条
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1 flex-wrap">
        <span className="text-[10px] text-slate-500">分组:</span>
        <button
          onClick={() => setGroupMode('periodic')}
          className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] transition-colors ${
            groupMode === 'periodic'
              ? 'bg-violet-700/50 text-violet-200 border border-violet-600/50'
              : 'bg-slate-800/40 text-slate-400 hover:text-slate-300 border border-slate-700/40'
          }`}
        >
          <Layers className="w-3 h-3" />
          周期表族
        </button>
        <button
          onClick={() => setGroupMode('category')}
          className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] transition-colors ${
            groupMode === 'category'
              ? 'bg-violet-700/50 text-violet-200 border border-violet-600/50'
              : 'bg-slate-800/40 text-slate-400 hover:text-slate-300 border border-slate-700/40'
          }`}
        >
          <List className="w-3 h-3" />
          元素类别
        </button>
        <button
          onClick={() => setGroupMode('element')}
          className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] transition-colors ${
            groupMode === 'element'
              ? 'bg-violet-700/50 text-violet-200 border border-violet-600/50'
              : 'bg-slate-800/40 text-slate-400 hover:text-slate-300 border border-slate-700/40'
          }`}
        >
          <Sparkles className="w-3 h-3" />
          元素
        </button>
      </div>

      {selectedLine && (
        <div className="p-2.5 rounded-md bg-slate-800/60 border border-slate-700/60 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <span
                className="inline-block w-3 h-3 rounded-sm flex-shrink-0"
                style={{ backgroundColor: selectedLine.color }}
              />
              <span className="text-sm font-semibold text-slate-200">{selectedLine.label}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/60 text-slate-400 font-mono">
                {selectedLine.wavelength.toFixed(1)} Å
              </span>
            </div>
            <button
              onClick={() => setSelectedLine(null)}
              className="text-slate-500 hover:text-slate-300 flex-shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
            <div>
              <span className="text-slate-500">元素:</span>{' '}
              <span className="text-slate-300">
                {selectedLine.element} ({ELEMENT_NAMES[selectedLine.element] || '?'})
              </span>
            </div>
            <div>
              <span className="text-slate-500">离子态:</span>{' '}
              <span className="text-slate-300">{selectedLine.ion}</span>
            </div>
            {selectedLine.transition && (
              <div className="col-span-2">
                <span className="text-slate-500">跃迁:</span>{' '}
                <span className="text-slate-300 font-mono">{selectedLine.transition}</span>
              </div>
            )}
            {selectedLine.ewRangeMin !== undefined && selectedLine.ewRangeMax !== undefined && (
              <div className="col-span-2">
                <span className="text-slate-500">典型 EW 范围:</span>{' '}
                <span className="text-emerald-300 font-mono">
                  {selectedLine.ewRangeMin} – {selectedLine.ewRangeMax} Å
                </span>
              </div>
            )}
            {selectedLine.description && (
              <div className="col-span-2 text-slate-400 text-[11px] pt-0.5 border-t border-slate-700/40">
                {selectedLine.description}
              </div>
            )}
          </div>
          <button
            onClick={() => {
              if (!isLineMarked(selectedLine)) {
                addSpectralLineMarker(selectedLine);
              }
            }}
            disabled={isLineMarked(selectedLine)}
            className={`w-full mt-1 flex items-center justify-center gap-1.5 px-2 py-1 rounded text-[11px] transition-colors ${
              isLineMarked(selectedLine)
                ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/40 cursor-default'
                : 'bg-violet-700/50 hover:bg-violet-600/60 text-violet-100 border border-violet-600/50'
            }`}
          >
            <MapPin className="w-3 h-3" />
            {isLineMarked(selectedLine) ? '已在光谱图上标记' : '在光谱图上标记此线'}
          </button>
        </div>
      )}

      {spectralLineMarkers.length > 0 && (
        <div className="p-2 rounded-md bg-violet-900/20 border border-violet-800/40">
          <div className="text-[10px] text-violet-400 mb-1.5 flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            已标记谱线 ({spectralLineMarkers.length})
          </div>
          <div className="flex flex-wrap gap-1">
            {spectralLineMarkers.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800/60 border border-slate-700/40"
              >
                <span
                  className="inline-block w-2 h-2 rounded-sm"
                  style={{ backgroundColor: m.color }}
                />
                <span className="text-[10px] text-slate-300 font-mono">
                  {m.label} {m.wavelength.toFixed(0)}
                </span>
                <button
                  onClick={() => removeSpectralLineMarker(m.id)}
                  className="text-slate-500 hover:text-red-400"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="max-h-[420px] overflow-y-auto space-y-1.5 pr-0.5 custom-scrollbar">
        {sortedGroupKeys.length === 0 && (
          <div className="text-center py-6 text-slate-500 text-xs">
            未找到匹配的谱线
          </div>
        )}
        {sortedGroupKeys.map((groupKey) => {
          const lines = groupedLines[groupKey];
          const isExpanded = expandedGroups[groupKey] !== false;
          return (
            <div key={groupKey} className="space-y-1">
              <button
                onClick={() => toggleGroup(groupKey)}
                className={`w-full flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium transition-colors border ${getGroupBadgeClass(
                  groupKey
                )}`}
              >
                {isExpanded ? (
                  <ChevronDown className="w-3 h-3 flex-shrink-0" />
                ) : (
                  <ChevronRight className="w-3 h-3 flex-shrink-0" />
                )}
                <span className="truncate">{getGroupLabel(groupKey)}</span>
                <span className="ml-auto opacity-70 font-mono">{lines.length}</span>
              </button>
              {isExpanded && (
                <div className="space-y-0.5 pl-1">
                  {lines.map((line) => {
                    const marked = isLineMarked(line);
                    const isSelected = selectedLine?.label === line.label && selectedLine?.wavelength === line.wavelength;
                    return (
                      <button
                        key={`${line.label}-${line.wavelength}`}
                        onClick={() => handleLineClick(line)}
                        className={`w-full flex items-center gap-2 px-2 py-1 rounded text-left text-[11px] transition-colors ${
                          isSelected
                            ? 'bg-violet-800/40 border border-violet-700/50'
                            : marked
                            ? 'bg-emerald-900/20 border border-emerald-800/30 hover:bg-emerald-900/30'
                            : 'hover:bg-slate-800/50 border border-transparent'
                        }`}
                      >
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0"
                          style={{ backgroundColor: line.color }}
                        />
                        <span className="font-mono text-slate-200 truncate flex-shrink-0 w-20">
                          {line.label}
                        </span>
                        <span className="text-slate-400 font-mono ml-auto flex-shrink-0">
                          {line.wavelength.toFixed(1)}
                        </span>
                        {marked && (
                          <MapPin className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-700/40">
        💡 点击谱线可在光谱图上添加临时标记并查看详细信息
      </div>
    </div>
  );
}
