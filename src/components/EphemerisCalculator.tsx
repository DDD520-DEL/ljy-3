import { useState, useMemo, useEffect } from 'react';
import {
  Search,
  MapPin,
  Clock,
  Sun,
  Sunset,
  Sunrise,
  Star,
  Globe2,
  Compass,
  Target,
  Eye,
  Calendar,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Mountain,
} from 'lucide-react';
import { searchCelestialObjects, CELESTIAL_CATALOG } from '@/data/catalog';
import {
  calculateEphemeris,
  buildTimeline,
  DEFAULT_LOCATIONS,
  parseRaInput,
  parseDecInput,
  formatTime,
  formatDateTime,
  azimuthToDirection,
  raToHms,
  decToDms,
} from '@/lib/ephemeris';
import type {
  CelestialObject,
  EphemerisResult,
  ObserverLocation,
  TimelineEvent,
} from '@/types';
import clsx from 'clsx';

const typeLabels: Record<string, string> = {
  star: '恒星',
  planet: '行星',
  deep_sky: '深空天体',
  moon: '月球',
  sun: '太阳',
};

const typeColors: Record<string, string> = {
  star: 'from-amber-900/40 to-amber-900/20 border-amber-700/40 text-amber-300',
  planet: 'from-cyan-900/40 to-cyan-900/20 border-cyan-700/40 text-cyan-300',
  deep_sky: 'from-violet-900/40 to-violet-900/20 border-violet-700/40 text-violet-300',
  moon: 'from-slate-700/40 to-slate-700/20 border-slate-600/40 text-slate-300',
  sun: 'from-orange-900/40 to-orange-900/20 border-orange-700/40 text-orange-300',
};

const eventTypeColors: Record<string, string> = {
  sunrise: 'bg-amber-500',
  sunset: 'bg-orange-500',
  twilight: 'bg-sky-500',
  rise: 'bg-emerald-500',
  transit: 'bg-cyan-500',
  set: 'bg-rose-500',
  observation_start: 'bg-emerald-400',
  observation_end: 'bg-rose-400',
};

function distanceUnitLabel(unit?: string): string {
  switch (unit) {
    case 'ly':
      return '光年';
    case 'pc':
      return '秒差距';
    case 'au':
      return '天文单位';
    default:
      return '';
  }
}

function InfoCard({
  icon: Icon,
  label,
  value,
  subValue,
  color,
}: {
  icon: any;
  label: string;
  value: string;
  subValue?: string;
  color?: string;
}) {
  return (
    <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/60">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={clsx('w-3.5 h-3.5', color || 'text-slate-400')} />
        <span className="text-[10px] text-slate-400 font-medium">{label}</span>
      </div>
      <div className="text-sm font-mono text-slate-100">{value}</div>
      {subValue && <div className="text-[10px] text-slate-500 mt-0.5">{subValue}</div>}
    </div>
  );
}

function Timeline({ events }: { events: TimelineEvent[] }) {
  const relevantEvents = events.filter((e) => {
    const hour = e.time.getHours();
    return hour >= 12 || hour <= 8;
  });

  if (relevantEvents.length === 0) {
    return (
      <div className="text-xs text-slate-500 text-center py-8">暂无时间线事件</div>
    );
  }

  const startTime = new Date();
  startTime.setHours(12, 0, 0, 0);
  const endTime = new Date(startTime);
  endTime.setDate(endTime.getDate() + 1);
  endTime.setHours(8, 0, 0, 0);
  const totalDuration = endTime.getTime() - startTime.getTime();

  return (
    <div className="space-y-2">
      <div className="relative h-14 bg-slate-800/40 rounded-lg border border-slate-700/60 overflow-hidden">
        <div
          className="absolute top-0 bottom-0 bg-gradient-to-r from-amber-900/20 via-sky-900/30 to-amber-900/20"
          style={{ left: 0, right: 0 }}
        />
        <div
          className="absolute top-0 bottom-0 bg-slate-950/60"
          style={{
            left: `${((new Date(startTime).setHours(19, 0, 0, 0) - startTime.getTime()) / totalDuration) * 100}%`,
            right: `${((endTime.getTime() - new Date(endTime).setHours(6, 0, 0, 0)) / totalDuration) * 100}%`,
          }}
        />
        {relevantEvents.map((event) => {
          const position = ((event.time.getTime() - startTime.getTime()) / totalDuration) * 100;
          if (position < 0 || position > 100) return null;
          return (
            <div
              key={event.id}
              className="absolute top-0 bottom-0 flex flex-col items-center group"
              style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
            >
              <div
                className={clsx(
                  'w-1.5 h-1.5 rounded-full mt-1 cursor-pointer transition-transform hover:scale-150',
                  eventTypeColors[event.type]
                )}
              />
              <div className="opacity-0 group-hover:opacity-100 absolute top-4 z-10 transition-opacity pointer-events-none">
                <div className="bg-slate-900 border border-slate-600 rounded px-2 py-1 whitespace-nowrap text-[10px] text-slate-200 shadow-lg">
                  <div className="font-medium">{event.label}</div>
                  <div className="text-slate-400">{formatTime(event.time)}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-slate-500 px-1">
        <span>12:00</span>
        <span>18:00</span>
        <span>00:00</span>
        <span>06:00</span>
        <span>08:00</span>
      </div>
      <div className="flex flex-wrap gap-2 pt-2">
        {relevantEvents.map((event) => (
          <div
            key={event.id}
            className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-800/40 border border-slate-700/60"
          >
            <div className={clsx('w-2 h-2 rounded-full', eventTypeColors[event.type])} />
            <span className="text-[10px] text-slate-400">{formatTime(event.time)}</span>
            <span className="text-[10px] text-slate-200">{event.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function EphemerisCalculator() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedObject, setSelectedObject] = useState<CelestialObject | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [inputMode, setInputMode] = useState<'search' | 'coords'>('search');
  const [customRa, setCustomRa] = useState('');
  const [customDec, setCustomDec] = useState('');
  const [customName, setCustomName] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<ObserverLocation>(DEFAULT_LOCATIONS[0]);
  const [customLat, setCustomLat] = useState('');
  const [customLon, setCustomLon] = useState('');
  const [useCustomLocation, setUseCustomLocation] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [result, setResult] = useState<EphemerisResult | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [error, setError] = useState<string>('');

  const searchResults = useMemo(() => {
    if (inputMode !== 'search') return [];
    if (!searchQuery.trim()) return CELESTIAL_CATALOG.slice(0, 8);
    return searchCelestialObjects(searchQuery).slice(0, 12);
  }, [searchQuery, inputMode]);

  const currentLocation = useMemo(() => {
    if (!useCustomLocation) return selectedLocation;
    const lat = parseFloat(customLat);
    const lon = parseFloat(customLon);
    if (isNaN(lat) || isNaN(lon)) return selectedLocation;
    return {
      name: '自定义位置',
      latitude: Math.max(-90, Math.min(90, lat)),
      longitude: Math.max(-180, Math.min(180, lon)),
    };
  }, [selectedLocation, useCustomLocation, customLat, customLon]);

  useEffect(() => {
    if (selectedObject) {
      try {
        const ephemeris = calculateEphemeris(selectedObject, currentLocation);
        setResult(ephemeris);
        setTimelineEvents(buildTimeline(ephemeris));
        setError('');
      } catch (e) {
        setError('计算星历失败');
      }
    } else {
      setResult(null);
      setTimelineEvents([]);
    }
  }, [selectedObject, currentLocation]);

  const handleSelectObject = (obj: CelestialObject) => {
    setSelectedObject(obj);
    setSearchQuery(obj.name);
    setShowDropdown(false);
  };

  const handleCoordsSubmit = () => {
    if (!customRa || !customDec) {
      setError('请输入赤经和赤纬');
      return;
    }
    const ra = parseRaInput(customRa);
    const dec = parseDecInput(customDec);
    if (ra === null) {
      setError('赤经格式无效，请使用 "18h 36m 56s" 或 "279.234°" 格式');
      return;
    }
    if (dec === null) {
      setError('赤纬格式无效，请使用 "+38° 47\' 01\\"" 或 "38.784°" 格式');
      return;
    }
    setError('');
    const obj: CelestialObject = {
      id: 'custom_' + Date.now(),
      name: customName || '自定义天体',
      type: 'star',
      ra,
      dec,
    };
    setSelectedObject(obj);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            天体坐标查询与星历计算器
          </h3>
          <p className="text-xs text-slate-400">
            查询天体 J2000 坐标、当前视位置、日出日落时间及可观测窗口
          </p>
        </div>
        <div className="flex items-center gap-1 text-xs bg-slate-800/60 rounded-md p-1">
          <button
            onClick={() => setInputMode('search')}
            className={clsx(
              'px-3 py-1 rounded transition-colors',
              inputMode === 'search' ? 'bg-cyan-700/60 text-cyan-100' : 'text-slate-400 hover:text-slate-200'
            )}
          >
            <Search className="w-3 h-3 inline mr-1" />
            名称搜索
          </button>
          <button
            onClick={() => setInputMode('coords')}
            className={clsx(
              'px-3 py-1 rounded transition-colors',
              inputMode === 'coords' ? 'bg-cyan-700/60 text-cyan-100' : 'text-slate-400 hover:text-slate-200'
            )}
          >
            <Target className="w-3 h-3 inline mr-1" />
            坐标输入
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 space-y-4">
          {inputMode === 'search' && (
            <section className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 shadow-xl">
              <h2 className="text-xs font-semibold text-slate-300 mb-3 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5" />
                天体搜索
              </h2>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="搜索天体名称..."
                  className="w-full px-3 py-2 rounded-md bg-slate-800 border border-slate-600 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                />
                {showDropdown && searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 max-h-64 overflow-y-auto bg-slate-800 border border-slate-600 rounded-md shadow-xl z-10">
                    {searchResults.map((obj) => (
                      <button
                        key={obj.id}
                        onClick={() => handleSelectObject(obj)}
                        className="w-full px-3 py-2 text-left hover:bg-slate-700/60 transition-colors border-b border-slate-700/40 last:border-0"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-200">{obj.name}</span>
                          <span
                            className={clsx(
                              'text-[10px] px-1.5 py-0.5 rounded',
                              'bg-gradient-to-r border',
                              typeColors[obj.type]
                            )}
                          >
                            {typeLabels[obj.type]}
                          </span>
                        </div>
                        {obj.constellation && (
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            {obj.constellation} · {obj.commonNames?.[0] || ''}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {searchQuery && !showDropdown && selectedObject && (
                <div className="mt-2 text-xs text-slate-400">
                  已选择: <span className="text-cyan-300">{selectedObject.name}</span>
                </div>
              )}
            </section>
          )}

          {inputMode === 'coords' && (
            <section className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 shadow-xl">
              <h2 className="text-xs font-semibold text-slate-300 mb-3 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" />
                手动输入坐标
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] text-slate-400 mb-1 block">天体名称（可选）</label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="如：M31"
                    className="w-full px-3 py-1.5 rounded-md bg-slate-800 border border-slate-600 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 mb-1 block">
                    赤经 RA (如: 18h 36m 56s 或 279.23°)
                  </label>
                  <input
                    type="text"
                    value={customRa}
                    onChange={(e) => setCustomRa(e.target.value)}
                    placeholder="18h 36m 56s"
                    className="w-full px-3 py-1.5 rounded-md bg-slate-800 border border-slate-600 text-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 mb-1 block">
                    赤纬 Dec (如: +38° 47&apos; 01&quot; 或 38.78°)
                  </label>
                  <input
                    type="text"
                    value={customDec}
                    onChange={(e) => setCustomDec(e.target.value)}
                    placeholder="+38° 47' 01\""
                    className="w-full px-3 py-1.5 rounded-md bg-slate-800 border border-slate-600 text-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  />
                </div>
                <button
                  onClick={handleCoordsSubmit}
                  className="w-full py-1.5 rounded-md bg-cyan-700/60 hover:bg-cyan-600 text-white text-sm font-medium transition-colors"
                >
                  <Target className="w-3.5 h-3.5 inline mr-1" />
                  计算星历
                </button>
              </div>
            </section>
          )}

          <section className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 shadow-xl">
            <h2 className="text-xs font-semibold text-slate-300 mb-3 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              观测地点
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-slate-400 mb-1 block">选择城市</label>
                <select
                  value={selectedLocation.name}
                  onChange={(e) => {
                    const loc = DEFAULT_LOCATIONS.find((l) => l.name === e.target.value);
                    if (loc) {
                      setSelectedLocation(loc);
                      setUseCustomLocation(false);
                    }
                  }}
                  disabled={useCustomLocation}
                  className="w-full px-3 py-1.5 rounded-md bg-slate-800 border border-slate-600 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 disabled:opacity-50"
                >
                  {DEFAULT_LOCATIONS.map((loc) => (
                    <option key={loc.name} value={loc.name}>
                      {loc.name} ({loc.latitude.toFixed(2)}°, {loc.longitude.toFixed(2)}°)
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="customLoc"
                  checked={useCustomLocation}
                  onChange={(e) => setUseCustomLocation(e.target.checked)}
                  className="w-3.5 h-3.5 rounded bg-slate-800 border-slate-600 text-cyan-500 focus:ring-cyan-500/50"
                />
                <label htmlFor="customLoc" className="text-xs text-slate-400">
                  使用自定义坐标
                </label>
              </div>
              {useCustomLocation && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 mb-0.5 block">纬度 (°)</label>
                    <input
                      type="number"
                      value={customLat}
                      onChange={(e) => setCustomLat(e.target.value)}
                      placeholder="39.90"
                      min={-90}
                      max={90}
                      step={0.01}
                      className="w-full px-2 py-1 rounded-md bg-slate-800 border border-slate-600 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 mb-0.5 block">经度 (°)</label>
                    <input
                      type="number"
                      value={customLon}
                      onChange={(e) => setCustomLon(e.target.value)}
                      placeholder="116.41"
                      min={-180}
                      max={180}
                      step={0.01}
                      className="w-full px-2 py-1 rounded-md bg-slate-800 border border-slate-600 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    />
                  </div>
                </div>
              )}
              <div className="text-[10px] text-slate-500 bg-slate-800/40 rounded px-2 py-1.5">
                <MapPin className="w-3 h-3 inline mr-1 text-slate-400" />
                {currentLocation.name}: {currentLocation.latitude.toFixed(4)}°N,{' '}
                {currentLocation.longitude.toFixed(4)}°E
              </div>
            </div>
          </section>

          {error && (
            <div className="p-3 rounded-lg bg-rose-900/30 border border-rose-700/50 text-xs text-rose-300">
              {error}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-4">
          {!result && (
            <section className="p-8 rounded-xl bg-slate-900/60 border border-slate-800/80 shadow-xl text-center">
              <Star className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-slate-400 mb-2">等待查询</h3>
              <p className="text-xs text-slate-500">
                请在左侧输入天体名称或赤经赤纬坐标以查询星历信息
              </p>
            </section>
          )}

          {result && (
            <>
              <section className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 shadow-xl">
                <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={clsx(
                        'w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center',
                        typeColors[result.object.type]
                      )}
                    >
                      {result.object.type === 'star' && <Star className="w-5 h-5" />}
                      {result.object.type === 'planet' && <Globe2 className="w-5 h-5" />}
                      {result.object.type === 'deep_sky' && <Sparkles className="w-5 h-5" />}
                      {result.object.type === 'moon' && <Mountain className="w-5 h-5" />}
                      {result.object.type === 'sun' && <Sun className="w-5 h-5" />}
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">{result.object.name}</h2>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span
                          className={clsx(
                            'text-[10px] px-1.5 py-0.5 rounded bg-gradient-to-r border',
                            typeColors[result.object.type]
                          )}
                        >
                          {typeLabels[result.object.type]}
                        </span>
                        {result.object.constellation && (
                          <span className="text-[10px] text-slate-400">
                            {result.object.constellation}
                          </span>
                        )}
                        {result.object.spectralType && (
                          <span className="text-[10px] text-amber-400 font-mono">
                            {result.object.spectralType}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-slate-500 flex items-center gap-1 justify-end">
                      <Calendar className="w-3 h-3" />
                      计算时间
                    </div>
                    <div className="text-xs text-slate-300 font-mono">
                      {formatDateTime(result.calculationTime)}
                    </div>
                  </div>
                </div>
                {result.object.description && (
                  <p className="text-xs text-slate-400 bg-slate-800/40 rounded-lg p-3 mb-4">
                    {result.object.description}
                  </p>
                )}

                <div className="mb-4">
                  <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    天体基本信息
                  </button>
                </div>

                {showAdvanced && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                    {result.object.magnitude !== undefined && (
                      <InfoCard
                        icon={Star}
                        label="视星等"
                        value={result.object.magnitude.toFixed(2)}
                        color="text-amber-400"
                      />
                    )}
                    {result.object.distance !== undefined && (
                      <InfoCard
                        icon={Globe2}
                        label="距离"
                        value={result.object.distance.toString()}
                        subValue={distanceUnitLabel(result.object.distanceUnit)}
                        color="text-cyan-400"
                      />
                    )}
                    {result.object.commonNames && result.object.commonNames.length > 0 && (
                      <InfoCard
                        icon={Star}
                        label="别名"
                        value={result.object.commonNames[0]}
                        subValue={result.object.commonNames.slice(1).join(', ')}
                        color="text-violet-400"
                      />
                    )}
                    <InfoCard
                      icon={MapPin}
                      label="观测点"
                      value={result.observerLocation.name || '自定义'}
                      subValue={`${result.observerLocation.latitude.toFixed(2)}°N, ${result.observerLocation.longitude.toFixed(2)}°E`}
                      color="text-emerald-400"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5 text-violet-400" />
                      J2000.0 赤道坐标
                    </h3>
                    <div className="p-3 rounded-lg bg-violet-900/20 border border-violet-700/30 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] text-slate-400">赤经 RA</span>
                        <span className="text-sm font-mono text-violet-200">{result.j200.raHours}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] text-slate-400">赤纬 Dec</span>
                        <span className="text-sm font-mono text-violet-200">{result.j200.decDegrees}</span>
                      </div>
                      <div className="flex justify-between items-center border-t border-violet-700/30 pt-2">
                        <span className="text-[11px] text-slate-500">十进制度</span>
                        <span className="text-xs font-mono text-slate-400">
                          {result.j200.ra.toFixed(4)}°, {result.j200.dec.toFixed(4)}°
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-cyan-400" />
                      当前视位置
                    </h3>
                    <div className="p-3 rounded-lg bg-cyan-900/20 border border-cyan-700/30 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] text-slate-400">地平高度</span>
                        <span
                          className={clsx(
                            'text-sm font-mono',
                            result.apparent.altitude > 0 ? 'text-emerald-300' : 'text-rose-300'
                          )}
                        >
                          {result.apparent.altitude > 0 ? '+' : ''}
                          {result.apparent.altitude}°
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] text-slate-400">方位角</span>
                        <span className="text-sm font-mono text-cyan-200">
                          {result.apparent.azimuth}° ({azimuthToDirection(result.apparent.azimuth)})
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] text-slate-400">时角</span>
                        <span className="text-sm font-mono text-cyan-200">{result.apparent.hourAngle}h</span>
                      </div>
                      <div className="flex justify-between items-center border-t border-cyan-700/30 pt-2">
                        <span className="text-[11px] text-slate-400">大气质量</span>
                        <span
                          className={clsx(
                            'text-sm font-mono',
                            result.apparent.airmass <= 2
                              ? 'text-emerald-300'
                              : result.apparent.airmass <= 3
                              ? 'text-amber-300'
                              : 'text-rose-300'
                          )}
                        >
                          {result.apparent.airmass}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 shadow-xl">
                <h2 className="text-xs font-semibold text-slate-300 mb-3 flex items-center gap-1.5">
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  太阳出没与晨昏蒙影
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  <InfoCard
                    icon={Sunrise}
                    label="日出"
                    value={formatTime(result.sunTimes.sunrise)}
                    color="text-amber-400"
                  />
                  <InfoCard
                    icon={Sun}
                    label="太阳中天"
                    value={formatTime(result.sunTimes.solarNoon)}
                    color="text-orange-400"
                  />
                  <InfoCard
                    icon={Sunset}
                    label="日落"
                    value={formatTime(result.sunTimes.sunset)}
                    color="text-orange-400"
                  />
                  <InfoCard
                    icon={Clock}
                    label="民用晨昏"
                    value={`${formatTime(result.sunTimes.civilTwilightStart)} / ${formatTime(result.sunTimes.civilTwilightEnd)}`}
                    subValue="太阳高度 -6°"
                    color="text-sky-400"
                  />
                  <InfoCard
                    icon={Clock}
                    label="航海晨昏"
                    value={`${formatTime(result.sunTimes.nauticalTwilightStart)} / ${formatTime(result.sunTimes.nauticalTwilightEnd)}`}
                    subValue="太阳高度 -12°"
                    color="text-sky-500"
                  />
                  <InfoCard
                    icon={Clock}
                    label="天文晨昏"
                    value={`${formatTime(result.sunTimes.astronomicalTwilightStart)} / ${formatTime(result.sunTimes.astronomicalTwilightEnd)}`}
                    subValue="太阳高度 -18°"
                    color="text-indigo-400"
                  />
                </div>
              </section>

              <section className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 shadow-xl">
                <h2 className="text-xs font-semibold text-slate-300 mb-3 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-emerald-400" />
                  天体出没与中天
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
                  <InfoCard
                    icon={Eye}
                    label={result.isCircumpolar ? '拱极星（永不落下）' : result.isNeverRises ? '永不升起' : '升起时间'}
                    value={result.riseTime ? formatTime(result.riseTime) : '—'}
                    color="text-emerald-400"
                  />
                  <InfoCard
                    icon={Star}
                    label="中天时间"
                    value={result.transitTime ? formatTime(result.transitTime) : '—'}
                    subValue={result.transitAltitude ? `中天高度 ${result.transitAltitude}°` : undefined}
                    color="text-cyan-400"
                  />
                  <InfoCard
                    icon={Eye}
                    label={result.isCircumpolar ? '拱极星（永不落下）' : result.isNeverRises ? '永不升起' : '落下时间'}
                    value={result.setTime ? formatTime(result.setTime) : '—'}
                    color="text-rose-400"
                  />
                </div>
              </section>

              <section className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 shadow-xl">
                <h2 className="text-xs font-semibold text-slate-300 mb-3 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-violet-400" />
                  当晚观测时间轴
                </h2>
                <Timeline events={timelineEvents} />
              </section>

              <section className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 shadow-xl">
                <h2 className="text-xs font-semibold text-slate-300 mb-3 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-emerald-400" />
                  可观测窗口
                  {result.observationWindows.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 rounded bg-emerald-900/40 text-emerald-300 text-[10px]">
                      {result.observationWindows.length} 个时段
                    </span>
                  )}
                </h2>
                {result.observationWindows.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-500">
                    {result.isNeverRises
                      ? '该天体在当前观测位置永不升起'
                      : '今晚无可观测窗口（高度<30°或大气质量>2.0）'}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {result.observationWindows.map((window, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-gradient-to-r from-emerald-900/20 to-cyan-900/20 border border-emerald-700/30"
                      >
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-md bg-emerald-800/60 flex items-center justify-center text-[10px] font-bold text-emerald-200">
                              {idx + 1}
                            </span>
                            <span className="text-sm font-medium text-emerald-200">{window.description}</span>
                          </div>
                          <div className="text-xs text-slate-300 font-mono">
                            {formatTime(window.startTime)} — {formatTime(window.endTime)}
                            <span className="text-slate-500 ml-2">({window.durationMinutes} 分钟)</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-[10px]">
                          <div className="text-slate-500">
                            高度范围:{' '}
                            <span className="text-slate-300 font-mono">
                              {window.altitudeRange.min}° ~ {window.altitudeRange.max}°
                            </span>
                          </div>
                          <div className="text-slate-500">
                            大气质量:{' '}
                            <span className="text-slate-300 font-mono">
                              {window.airmassRange.min.toFixed(2)} ~ {window.airmassRange.max.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
