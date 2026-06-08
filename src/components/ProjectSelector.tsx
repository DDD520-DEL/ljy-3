import { useState, useEffect, useRef } from 'react';
import {
  FolderKanban,
  Plus,
  ChevronDown,
  Trash2,
  Edit3,
  Check,
  X,
  Sparkles,
  Database,
  Calendar,
  Clock,
} from 'lucide-react';
import { useAppStore } from '@/store/appStore';

export default function ProjectSelector() {
  const {
    projects,
    currentProjectId,
    switchProject,
    createProject,
    deleteProject,
    renameProject,
    getCurrentProject,
  } = useAppStore();

  const [isOpen, setIsOpen] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [withSampleData, setWithSampleData] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const currentProject = getCurrentProject();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowCreateForm(false);
        setEditingId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCreate = () => {
    if (!newName.trim()) return;
    createProject(newName.trim(), newDescription.trim() || undefined, withSampleData);
    setNewName('');
    setNewDescription('');
    setWithSampleData(false);
    setShowCreateForm(false);
    setIsOpen(false);
  };

  const handleStartEdit = (projectId: string) => {
    const p = projects.find((x) => x.id === projectId);
    if (!p) return;
    setEditingId(projectId);
    setEditName(p.name);
    setEditDescription(p.description || '');
  };

  const handleSaveEdit = (projectId: string) => {
    if (!editName.trim()) return;
    renameProject(projectId, editName.trim(), editDescription.trim() || undefined);
    setEditingId(null);
  };

  const handleDelete = (projectId: string) => {
    if (projects.length <= 1) return;
    const p = projects.find((x) => x.id === projectId);
    if (p && !confirm(`确定要删除项目"${p.name}"吗？该项目的所有数据将被永久删除。`)) return;
    deleteProject(projectId);
    setIsOpen(false);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-800/60 border border-slate-700/60 hover:bg-slate-800 hover:border-slate-600 transition-all text-sm"
      >
        <FolderKanban className="w-4 h-4 text-cyan-400" />
        <span className="font-medium text-slate-200 max-w-[160px] truncate">
          {currentProject?.name || '未选择项目'}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 rounded-xl bg-slate-900 border border-slate-700/80 shadow-2xl z-50 overflow-hidden">
          <div className="p-2 border-b border-slate-800/80">
            {!showCreateForm ? (
              <button
                onClick={() => setShowCreateForm(true)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-medium transition-all"
              >
                <Plus className="w-4 h-4" />
                创建新项目
              </button>
            ) : (
              <div className="space-y-2">
                <input
                  autoFocus
                  type="text"
                  placeholder="项目名称（如：M31 巡天）"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-md bg-slate-800 border border-slate-600 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                />
                <input
                  type="text"
                  placeholder="项目描述（可选）"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-md bg-slate-800 border border-slate-600 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                />
                <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={withSampleData}
                    onChange={(e) => setWithSampleData(e.target.checked)}
                    className="rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500/50"
                  />
                  <span>填充示例数据</span>
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={handleCreate}
                    disabled={!newName.trim()}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-cyan-700/60 hover:bg-cyan-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                    创建
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateForm(false);
                      setNewName('');
                      setNewDescription('');
                    }}
                    className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
                  >
                    取消
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            <div className="p-1.5">
              <div className="px-2 py-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                我的项目
              </div>
              {projects.map((p) => {
                const isActive = p.id === currentProjectId;
                const isEditing = editingId === p.id;

                return (
                  <div key={p.id}>
                    {isEditing ? (
                      <div className="p-2 rounded-lg bg-slate-800/60 border border-cyan-700/40 space-y-2">
                        <input
                          autoFocus
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full px-2.5 py-1 rounded-md bg-slate-900 border border-slate-600 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                        />
                        <input
                          type="text"
                          placeholder="项目描述（可选）"
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          className="w-full px-2.5 py-1 rounded-md bg-slate-900 border border-slate-600 text-xs text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                        />
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleSaveEdit(p.id)}
                            disabled={!editName.trim()}
                            className="flex items-center gap-1 px-2 py-1 rounded-md bg-cyan-700/60 hover:bg-cyan-600 disabled:opacity-40 text-white text-xs transition-colors"
                          >
                            <Check className="w-3 h-3" />
                            保存
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs transition-colors"
                          >
                            <X className="w-3 h-3" />
                            取消
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => {
                          switchProject(p.id);
                          setIsOpen(false);
                        }}
                        className={`group p-2.5 rounded-lg cursor-pointer transition-all border ${
                          isActive
                            ? 'bg-cyan-900/30 border-cyan-700/50'
                            : 'bg-slate-800/30 border-transparent hover:bg-slate-800/60 hover:border-slate-700/60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              {isActive && (
                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" />
                              )}
                              <span
                                className={`text-sm font-medium truncate ${
                                  isActive ? 'text-cyan-200' : 'text-slate-200'
                                }`}
                              >
                                {p.name}
                              </span>
                            </div>
                            {p.description && (
                              <p className="mt-0.5 text-[11px] text-slate-500 truncate pl-3">
                                {p.description}
                              </p>
                            )}
                            <div className="mt-1.5 flex items-center gap-3 text-[10px] text-slate-500 pl-3">
                              <span className="flex items-center gap-0.5">
                                <Database className="w-3 h-3" />
                                {p.data.spectra.length} 光谱
                              </span>
                              <span className="flex items-center gap-0.5">
                                <Calendar className="w-3 h-3" />
                                {p.data.beObservations.length} 观测
                              </span>
                              <span className="flex items-center gap-0.5">
                                <Clock className="w-3 h-3" />
                                {formatDate(p.updatedAt)}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartEdit(p.id);
                              }}
                              className="p-1 rounded hover:bg-slate-700/80 text-slate-400 hover:text-slate-200 transition-colors"
                              title="编辑"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(p.id);
                              }}
                              disabled={projects.length <= 1}
                              className={`p-1 rounded transition-colors ${
                                projects.length <= 1
                                  ? 'text-slate-700 cursor-not-allowed'
                                  : 'hover:bg-red-900/50 text-slate-400 hover:text-red-400'
                              }`}
                              title={projects.length <= 1 ? '至少保留一个项目' : '删除项目'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-2 border-t border-slate-800/80 bg-slate-950/50">
            <div className="flex items-center justify-between text-[10px] text-slate-500">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                本地持久化 + 云端同步
              </span>
              <span>共 {projects.length} 个项目</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
