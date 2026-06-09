import { useState } from 'react';
import { useAppStore } from '@/store/appStore';
import { useTeamStore } from '@/store/teamStore';
import {
  Lock,
  Users,
  Globe,
  Eye,
  X,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { VisibilityType, SpectrumData } from '@/types';

interface Props {
  spectrum: SpectrumData;
  onClose?: () => void;
}

const VISIBILITY_OPTIONS: { value: VisibilityType; label: string; description: string; icon: typeof Lock; color: string }[] = [
  {
    value: 'private',
    label: '私有',
    description: '只有您自己可以查看',
    icon: Lock,
    color: 'text-red-400 bg-red-900/30 border-red-800/40',
  },
  {
    value: 'team',
    label: '团队可见',
    description: '指定团队的成员可以查看',
    icon: Users,
    color: 'text-violet-400 bg-violet-900/30 border-violet-800/40',
  },
  {
    value: 'public',
    label: '公开',
    description: '所有人都可以查看',
    icon: Globe,
    color: 'text-emerald-400 bg-emerald-900/30 border-emerald-800/40',
  },
];

export default function VisibilitySettings({ spectrum, onClose }: Props) {
  const { setSpectrumVisibility } = useAppStore();
  const { getUserTeams, currentUser } = useTeamStore();
  const userTeams = getUserTeams();

  const [selectedVisibility, setSelectedVisibility] = useState<VisibilityType>(spectrum.visibility);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>(spectrum.teamIds ?? []);
  const [expanded, setExpanded] = useState(true);

  const handleToggleTeam = (teamId: string) => {
    setSelectedTeamIds((prev) =>
      prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId]
    );
  };

  const handleSave = () => {
    setSpectrumVisibility(
      spectrum.id,
      selectedVisibility,
      selectedVisibility === 'team' ? selectedTeamIds : undefined
    );
    onClose?.();
  };

  const getAvatarInitials = (name: string) => {
    return name
      .split(' ')
      .map((p) => p[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const currentOption = VISIBILITY_OPTIONS.find((o) => o.value === selectedVisibility)!;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5 text-cyan-400" />
          可见权限设置
        </h4>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-700/60 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 p-2 rounded-md bg-slate-800/40 border border-slate-700/60">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
          style={{ backgroundColor: currentUser.avatarColor }}
        >
          {getAvatarInitials(spectrum.ownerName)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-slate-200 truncate">{spectrum.name}</div>
          <div className="text-[10px] text-slate-500">所有者: {spectrum.ownerName}</div>
        </div>
      </div>

      <div className="space-y-1.5">
        {VISIBILITY_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isSelected = selectedVisibility === option.value;
          return (
            <button
              key={option.value}
              onClick={() => setSelectedVisibility(option.value)}
              className={`w-full flex items-start gap-2 p-2.5 rounded-md border transition-all text-left ${
                isSelected
                  ? option.color + ' ring-1 ring-current/40'
                  : 'bg-slate-800/30 border-slate-700/60 hover:bg-slate-800/50 hover:border-slate-600/60'
              }`}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${isSelected ? '' : 'text-slate-400'}`} />
              <div className="flex-1 min-w-0">
                <div className={`text-xs font-semibold ${isSelected ? '' : 'text-slate-200'}`}>
                  {option.label}
                </div>
                <div className={`text-[10px] mt-0.5 ${isSelected ? 'opacity-80' : 'text-slate-500'}`}>
                  {option.description}
                </div>
              </div>
              {isSelected && <Check className="w-4 h-4 flex-shrink-0 mt-0.5" />}
            </button>
          );
        })}
      </div>

      {selectedVisibility === 'team' && (
        <div className="space-y-1.5">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-between p-2 rounded-md bg-slate-800/40 border border-slate-700/60 hover:bg-slate-800/60 transition-colors"
          >
            <span className="text-[11px] font-medium text-slate-300 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-violet-400" />
              选择可见团队
              <span className="text-slate-500">({selectedTeamIds.length}/{userTeams.length})</span>
            </span>
            {expanded ? (
              <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            )}
          </button>

          {expanded && (
            <div className="max-h-48 overflow-y-auto space-y-1 p-1 rounded-md bg-slate-900/40 border border-slate-700/40">
              {userTeams.length === 0 ? (
                <div className="p-3 text-center text-[11px] text-slate-500">
                  您还没有加入任何团队
                </div>
              ) : (
                userTeams.map((team) => {
                  const isSelected = selectedTeamIds.includes(team.id);
                  return (
                    <button
                      key={team.id}
                      onClick={() => handleToggleTeam(team.id)}
                      className={`w-full flex items-center gap-2 p-2 rounded text-left transition-colors ${
                        isSelected
                          ? 'bg-violet-900/40 text-violet-200'
                          : 'hover:bg-slate-800/60 text-slate-300'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 ${
                          isSelected
                            ? 'bg-violet-600'
                            : 'bg-slate-700 border border-slate-600'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-medium truncate">{team.name}</div>
                        <div className="text-[9px] text-slate-500">
                          {team.members.length} 名成员
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button
          onClick={handleSave}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium transition-all"
        >
          <Check className="w-3.5 h-3.5" />
          保存设置
        </button>
        {onClose && (
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs rounded-md bg-slate-700/60 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            取消
          </button>
        )}
      </div>
    </div>
  );
}

export function VisibilityBadge({ visibility }: { visibility: VisibilityType }) {
  const option = VISIBILITY_OPTIONS.find((o) => o.value === visibility)!;
  const Icon = option.icon;
  return (
    <span
      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium border ${option.color}`}
      title={option.description}
    >
      <Icon className="w-2.5 h-2.5" />
      {option.label}
    </span>
  );
}
