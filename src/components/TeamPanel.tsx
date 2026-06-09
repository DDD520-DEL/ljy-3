import { useState } from 'react';
import { useTeamStore } from '@/store/teamStore';
import {
  Users,
  Plus,
  Trash2,
  Edit3,
  UserPlus,
  Mail,
  Crown,
  Shield,
  User,
  X,
  Check,
  ChevronDown,
  ChevronUp,
  Save,
  LogOut,
} from 'lucide-react';
import type { TeamRole } from '@/types';

const ROLE_LABELS: Record<TeamRole, string> = {
  owner: '所有者',
  admin: '管理员',
  member: '成员',
};

const ROLE_ICONS: Record<TeamRole, typeof Crown> = {
  owner: Crown,
  admin: Shield,
  member: User,
};

export default function TeamPanel() {
  const {
    teams,
    currentTeamId,
    currentUser,
    createTeam,
    deleteTeam,
    renameTeam,
    switchTeam,
    addMember,
    removeMember,
    updateMemberRole,
    inviteMember,
    getCurrentTeam,
  } = useTeamStore();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDesc, setNewTeamDesc] = useState('');
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteTeamId, setInviteTeamId] = useState<string | null>(null);
  const [addMemberName, setAddMemberName] = useState('');
  const [addMemberEmail, setAddMemberEmail] = useState('');
  const [addMemberRole, setAddMemberRole] = useState<TeamRole>('member');
  const [addingMemberToTeam, setAddingMemberToTeam] = useState<string | null>(null);

  const currentTeam = getCurrentTeam();

  const handleCreateTeam = () => {
    if (!newTeamName.trim()) return;
    createTeam(newTeamName.trim(), newTeamDesc.trim() || undefined);
    setNewTeamName('');
    setNewTeamDesc('');
    setShowCreateForm(false);
  };

  const handleStartEdit = (teamId: string, name: string, desc?: string) => {
    setEditingTeamId(teamId);
    setEditName(name);
    setEditDesc(desc ?? '');
  };

  const handleSaveEdit = (teamId: string) => {
    if (!editName.trim()) return;
    renameTeam(teamId, editName.trim(), editDesc.trim() || undefined);
    setEditingTeamId(null);
  };

  const handleToggleExpand = (teamId: string) => {
    setExpandedTeamId(expandedTeamId === teamId ? null : teamId);
    setAddingMemberToTeam(null);
    setInviteTeamId(null);
  };

  const handleInviteMember = (teamId: string) => {
    if (!inviteEmail.trim()) return;
    inviteMember(teamId, inviteEmail.trim());
    setInviteEmail('');
    setInviteTeamId(null);
  };

  const handleAddMember = (teamId: string) => {
    if (!addMemberName.trim() || !addMemberEmail.trim()) return;
    addMember(teamId, addMemberName.trim(), addMemberEmail.trim(), addMemberRole);
    setAddMemberName('');
    setAddMemberEmail('');
    setAddMemberRole('member');
    setAddingMemberToTeam(null);
  };

  const getAvatarInitials = (name: string) => {
    return name
      .split(' ')
      .map((p) => p[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Users className="w-4 h-4 text-violet-400" />
          团队协作
        </h3>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md font-medium transition-all ${
            showCreateForm
              ? 'bg-violet-600 hover:bg-violet-500 text-white'
              : 'bg-slate-700/60 hover:bg-slate-700 text-slate-300 border border-slate-600/60'
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
          {showCreateForm ? '取消' : '创建团队'}
        </button>
      </div>

      <div className="flex items-center gap-2 p-2.5 rounded-md bg-slate-800/40 border border-slate-700/60">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
          style={{ backgroundColor: currentUser.avatarColor }}
        >
          {getAvatarInitials(currentUser.name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-slate-200 truncate">{currentUser.name}</div>
          <div className="text-[10px] text-slate-500 truncate">{currentUser.email}</div>
        </div>
      </div>

      {showCreateForm && (
        <div className="p-3 rounded-lg bg-violet-900/20 border border-violet-800/40 space-y-2">
          <div className="text-xs font-semibold text-violet-300">创建新团队</div>
          <input
            type="text"
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            placeholder="团队名称"
            className="w-full px-2.5 py-1.5 text-xs rounded-md bg-slate-900/60 border border-slate-700/60 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-600"
          />
          <input
            type="text"
            value={newTeamDesc}
            onChange={(e) => setNewTeamDesc(e.target.value)}
            placeholder="团队描述（可选）"
            className="w-full px-2.5 py-1.5 text-xs rounded-md bg-slate-900/60 border border-slate-700/60 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-600"
          />
          <button
            onClick={handleCreateTeam}
            disabled={!newTeamName.trim()}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium transition-all"
          >
            <Check className="w-3.5 h-3.5" />
            创建团队
          </button>
        </div>
      )}

      {currentTeam && (
        <div className="p-3 rounded-lg bg-violet-900/20 border border-violet-700/50">
          <div className="text-[10px] font-semibold text-violet-400 uppercase tracking-wide mb-1.5">
            当前团队
          </div>
          <div className="text-sm font-semibold text-violet-200">{currentTeam.name}</div>
          {currentTeam.description && (
            <div className="text-[11px] text-violet-400/80 mt-0.5">{currentTeam.description}</div>
          )}
          <div className="text-[10px] text-slate-500 mt-1.5">
            {currentTeam.members.length} 名成员
          </div>
        </div>
      )}

      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 scrollbar-thin">
        {teams.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-500 rounded-lg bg-slate-800/30 border border-dashed border-slate-700">
            暂无团队，点击上方按钮创建
          </div>
        ) : (
          teams.map((team) => {
            const isExpanded = expandedTeamId === team.id;
            const isEditing = editingTeamId === team.id;
            const isCurrent = currentTeamId === team.id;
            const myRole = team.members.find((m) => m.userId === currentUser.id)?.role;
            const canManage = myRole === 'owner' || myRole === 'admin';

            return (
              <div
                key={team.id}
                className={`rounded-lg border transition-all ${
                  isCurrent
                    ? 'bg-violet-900/20 border-violet-700/50'
                    : 'bg-slate-800/40 border-slate-700/60 hover:border-slate-600/60'
                }`}
              >
                <div
                  className="flex items-start gap-2 p-2.5 cursor-pointer"
                  onClick={() => handleToggleExpand(team.id)}
                >
                  <div className="flex-1 min-w-0" onClick={(e) => { e.stopPropagation(); switchTeam(team.id); }}>
                    {isEditing ? (
                      <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full px-2 py-1 text-xs rounded bg-slate-900/60 border border-slate-600 text-slate-200 focus:outline-none focus:border-violet-500"
                        />
                        <input
                          type="text"
                          value={editDesc}
                          onChange={(e) => setEditDesc(e.target.value)}
                          placeholder="团队描述"
                          className="w-full px-2 py-1 text-xs rounded bg-slate-900/60 border border-slate-600 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500"
                        />
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleSaveEdit(team.id)}
                            disabled={!editName.trim()}
                            className="flex items-center gap-1 px-2 py-1 text-[10px] rounded bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-40"
                          >
                            <Save className="w-3 h-3" />
                            保存
                          </button>
                          <button
                            onClick={() => setEditingTeamId(null)}
                            className="flex items-center gap-1 px-2 py-1 text-[10px] rounded bg-slate-700 hover:bg-slate-600 text-slate-300"
                          >
                            <X className="w-3 h-3" />
                            取消
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-1.5">
                          {isCurrent && (
                            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                          )}
                          <span className={`text-xs font-semibold truncate ${isCurrent ? 'text-violet-200' : 'text-slate-200'}`}>
                            {team.name}
                          </span>
                        </div>
                        {team.description && (
                          <div className="text-[10px] text-slate-500 truncate mt-0.5">
                            {team.description}
                          </div>
                        )}
                        <div className="text-[10px] text-slate-500 mt-1">
                          {team.members.length} 成员
                        </div>
                      </>
                    )}
                  </div>

                  {!isEditing && (
                    <div className="flex items-center gap-0.5">
                      {canManage && (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleStartEdit(team.id, team.name, team.description); }}
                            className="p-1 rounded hover:bg-slate-700/60 text-slate-400 hover:text-slate-200 transition-colors"
                            title="编辑团队"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          {myRole === 'owner' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`确定删除团队"${team.name}"吗？`)) {
                                  deleteTeam(team.id);
                                }
                              }}
                              className="p-1 rounded hover:bg-red-900/50 text-slate-400 hover:text-red-400 transition-colors"
                              title="删除团队"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-500" />
                      )}
                    </div>
                  )}
                </div>

                {isExpanded && !isEditing && (
                  <div className="px-2.5 pb-2.5 space-y-2 border-t border-slate-700/40 pt-2">
                    <div className="space-y-1">
                      {team.members.map((member) => {
                        const RoleIcon = ROLE_ICONS[member.role];
                        const isMe = member.userId === currentUser.id;

                        return (
                          <div
                            key={member.userId}
                            className={`flex items-center gap-2 p-1.5 rounded ${
                              isMe ? 'bg-violet-900/30' : 'bg-slate-900/30'
                            }`}
                          >
                            <div
                              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                              style={{ backgroundColor: member.avatarColor }}
                            >
                              {getAvatarInitials(member.userName)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1">
                                <span className={`text-[11px] font-medium truncate ${isMe ? 'text-violet-200' : 'text-slate-200'}`}>
                                  {member.userName}
                                  {isMe && <span className="text-violet-400"> (我)</span>}
                                </span>
                              </div>
                              <div className="text-[9px] text-slate-500 truncate">
                                {member.userEmail}
                              </div>
                            </div>
                            {canManage && (
                              <select
                                value={member.role}
                                onChange={(e) => updateMemberRole(team.id, member.userId, e.target.value as TeamRole)}
                                disabled={member.userId === currentUser.id || member.role === 'owner'}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 border border-slate-600 text-slate-300 focus:outline-none focus:border-violet-500 disabled:opacity-50"
                              >
                                <option value="owner">所有者</option>
                                <option value="admin">管理员</option>
                                <option value="member">成员</option>
                              </select>
                            )}
                            {!canManage && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] bg-slate-700/60 text-slate-400">
                                <RoleIcon className="w-2.5 h-2.5" />
                                {ROLE_LABELS[member.role]}
                              </span>
                            )}
                            {canManage && member.role !== 'owner' && member.userId !== currentUser.id && (
                              <button
                                onClick={() => removeMember(team.id, member.userId)}
                                className="p-0.5 rounded hover:bg-red-900/50 text-slate-400 hover:text-red-400 transition-colors"
                                title="移除成员"
                              >
                                <LogOut className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {canManage && addingMemberToTeam !== team.id && inviteTeamId !== team.id && (
                      <div className="flex gap-1 pt-1">
                        <button
                          onClick={() => { setAddingMemberToTeam(team.id); setInviteTeamId(null); }}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[11px] rounded-md bg-slate-700/60 hover:bg-slate-700 text-slate-300 transition-colors"
                        >
                          <UserPlus className="w-3 h-3" />
                          添加成员
                        </button>
                        <button
                          onClick={() => { setInviteTeamId(team.id); setAddingMemberToTeam(null); }}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[11px] rounded-md bg-slate-700/60 hover:bg-slate-700 text-slate-300 transition-colors"
                        >
                          <Mail className="w-3 h-3" />
                          发送邀请
                        </button>
                      </div>
                    )}

                    {addingMemberToTeam === team.id && (
                      <div className="p-2 rounded-md bg-slate-900/60 border border-slate-700/60 space-y-1.5">
                        <div className="text-[10px] font-medium text-slate-400">直接添加成员</div>
                        <input
                          type="text"
                          value={addMemberName}
                          onChange={(e) => setAddMemberName(e.target.value)}
                          placeholder="成员姓名"
                          className="w-full px-2 py-1 text-[11px] rounded bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500"
                        />
                        <input
                          type="email"
                          value={addMemberEmail}
                          onChange={(e) => setAddMemberEmail(e.target.value)}
                          placeholder="成员邮箱"
                          className="w-full px-2 py-1 text-[11px] rounded bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500"
                        />
                        <select
                          value={addMemberRole}
                          onChange={(e) => setAddMemberRole(e.target.value as TeamRole)}
                          className="w-full px-2 py-1 text-[11px] rounded bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-violet-500"
                        >
                          <option value="admin">管理员</option>
                          <option value="member">成员</option>
                        </select>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleAddMember(team.id)}
                            disabled={!addMemberName.trim() || !addMemberEmail.trim()}
                            className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-[11px] rounded bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-40"
                          >
                            <Check className="w-3 h-3" />
                            添加
                          </button>
                          <button
                            onClick={() => { setAddingMemberToTeam(null); setAddMemberName(''); setAddMemberEmail(''); }}
                            className="px-2 py-1 text-[11px] rounded bg-slate-700 hover:bg-slate-600 text-slate-300"
                          >
                            取消
                          </button>
                        </div>
                      </div>
                    )}

                    {inviteTeamId === team.id && (
                      <div className="p-2 rounded-md bg-slate-900/60 border border-slate-700/60 space-y-1.5">
                        <div className="text-[10px] font-medium text-slate-400">通过邮箱邀请</div>
                        <input
                          type="email"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          placeholder="邀请邮箱"
                          className="w-full px-2 py-1 text-[11px] rounded bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500"
                        />
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleInviteMember(team.id)}
                            disabled={!inviteEmail.trim()}
                            className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-[11px] rounded bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-40"
                          >
                            <Mail className="w-3 h-3" />
                            发送邀请
                          </button>
                          <button
                            onClick={() => { setInviteTeamId(null); setInviteEmail(''); }}
                            className="px-2 py-1 text-[11px] rounded bg-slate-700 hover:bg-slate-600 text-slate-300"
                          >
                            取消
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
