import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Team,
  TeamMember,
  TeamRole,
  User,
  TeamInvitation,
  VisibilityType,
  SpectrumData,
  SharedClassificationResult,
  ClassificationAuthor,
} from '@/types';

const genId = () => Math.random().toString(36).substring(2, 9);

const AVATAR_COLORS = [
  '#06b6d4', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444',
  '#ec4899', '#6366f1', '#14b8a6', '#f97316', '#84cc16',
];

const createDefaultUser = (): User => ({
  id: genId(),
  name: '当前用户',
  email: 'user@example.com',
  avatarColor: AVATAR_COLORS[0],
  createdAt: new Date().toISOString(),
});

const createSampleTeams = (currentUser: User): Team[] => {
  const now = new Date().toISOString();
  return [
    {
      id: genId(),
      name: '昴星团研究小组',
      description: '专注于昴星团恒星光谱观测与分析的研究团队',
      ownerId: currentUser.id,
      createdAt: now,
      updatedAt: now,
      members: [
        {
          userId: currentUser.id,
          userName: currentUser.name,
          userEmail: currentUser.email,
          avatarColor: currentUser.avatarColor,
          role: 'owner' as TeamRole,
          joinedAt: now,
        },
        {
          userId: genId(),
          userName: '张天文学家',
          userEmail: 'zhang@astro.example.com',
          avatarColor: AVATAR_COLORS[2],
          role: 'admin' as TeamRole,
          joinedAt: now,
          invitedBy: currentUser.id,
        },
        {
          userId: genId(),
          userName: '李观测员',
          userEmail: 'li@astro.example.com',
          avatarColor: AVATAR_COLORS[4],
          role: 'member' as TeamRole,
          joinedAt: now,
          invitedBy: currentUser.id,
        },
      ],
    },
    {
      id: genId(),
      name: 'Be星监测协作组',
      description: 'Be星发射线长期监测与数据共享',
      ownerId: currentUser.id,
      createdAt: now,
      updatedAt: now,
      members: [
        {
          userId: currentUser.id,
          userName: currentUser.name,
          userEmail: currentUser.email,
          avatarColor: currentUser.avatarColor,
          role: 'owner' as TeamRole,
          joinedAt: now,
        },
        {
          userId: genId(),
          userName: '王研究员',
          userEmail: 'wang@be-star.example.com',
          avatarColor: AVATAR_COLORS[6],
          role: 'member' as TeamRole,
          joinedAt: now,
          invitedBy: currentUser.id,
        },
      ],
    },
  ];
};

interface TeamStoreState {
  teams: Team[];
  currentTeamId: string | null;
  currentUser: User;
  invitations: TeamInvitation[];

  createTeam: (name: string, description?: string) => Team;
  deleteTeam: (teamId: string) => void;
  renameTeam: (teamId: string, name: string, description?: string) => void;
  switchTeam: (teamId: string | null) => void;
  getCurrentTeam: () => Team | undefined;

  addMember: (teamId: string, userName: string, userEmail: string, role?: TeamRole) => TeamMember | null;
  removeMember: (teamId: string, userId: string) => void;
  updateMemberRole: (teamId: string, userId: string, role: TeamRole) => void;

  inviteMember: (teamId: string, inviteeEmail: string) => TeamInvitation;
  acceptInvitation: (invitationId: string) => void;
  declineInvitation: (invitationId: string) => void;

  canViewSpectrum: (spectrum: SpectrumData, userId?: string) => boolean;
  getTeamMembers: (teamId: string) => TeamMember[];
  getUserTeams: (userId?: string) => Team[];

  createClassificationAuthor: () => ClassificationAuthor;
  buildSharedClassification: (
    spectrumId: string,
    classification: Omit<SharedClassificationResult, 'author' | 'classifiedAt' | 'spectrumId'>
  ) => SharedClassificationResult;
}

export const useTeamStore = create<TeamStoreState>()(
  persist(
    (set, get) => {
      const defaultUser = createDefaultUser();
      return {
        teams: createSampleTeams(defaultUser),
        currentTeamId: null,
        currentUser: defaultUser,
        invitations: [],

        createTeam: (name, description) => {
          const now = new Date().toISOString();
          const { currentUser } = get();
          const newTeam: Team = {
            id: genId(),
            name,
            description,
            ownerId: currentUser.id,
            createdAt: now,
            updatedAt: now,
            members: [
              {
                userId: currentUser.id,
                userName: currentUser.name,
                userEmail: currentUser.email,
                avatarColor: currentUser.avatarColor,
                role: 'owner',
                joinedAt: now,
              },
            ],
          };
          set((state) => ({
            teams: [...state.teams, newTeam],
            currentTeamId: state.currentTeamId ?? newTeam.id,
          }));
          return newTeam;
        },

        deleteTeam: (teamId) => {
          set((state) => {
            const teams = state.teams.filter((t) => t.id !== teamId);
            return {
              teams,
              currentTeamId: state.currentTeamId === teamId ? teams[0]?.id ?? null : state.currentTeamId,
            };
          });
        },

        renameTeam: (teamId, name, description) => {
          set((state) => ({
            teams: state.teams.map((t) =>
              t.id === teamId
                ? { ...t, name, description, updatedAt: new Date().toISOString() }
                : t
            ),
          }));
        },

        switchTeam: (teamId) => set({ currentTeamId: teamId }),

        getCurrentTeam: () => {
          const { teams, currentTeamId } = get();
          return teams.find((t) => t.id === currentTeamId);
        },

        addMember: (teamId, userName, userEmail, role = 'member') => {
          const now = new Date().toISOString();
          const { currentUser } = get();
          let newMember: TeamMember | null = null;
          set((state) => {
            const teams = state.teams.map((t) => {
              if (t.id !== teamId) return t;
              if (t.members.some((m) => m.userEmail === userEmail)) return t;
              newMember = {
                userId: genId(),
                userName,
                userEmail,
                avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
                role,
                joinedAt: now,
                invitedBy: currentUser.id,
              };
              return {
                ...t,
                members: [...t.members, newMember],
                updatedAt: now,
              };
            });
            return { teams };
          });
          return newMember;
        },

        removeMember: (teamId, userId) => {
          const now = new Date().toISOString();
          set((state) => ({
            teams: state.teams.map((t) =>
              t.id === teamId
                ? {
                    ...t,
                    members: t.members.filter((m) => m.userId !== userId),
                    updatedAt: now,
                  }
                : t
            ),
          }));
        },

        updateMemberRole: (teamId, userId, role) => {
          const now = new Date().toISOString();
          set((state) => ({
            teams: state.teams.map((t) =>
              t.id === teamId
                ? {
                    ...t,
                    members: t.members.map((m) =>
                      m.userId === userId ? { ...m, role } : m
                    ),
                    updatedAt: now,
                  }
                : t
            ),
          }));
        },

        inviteMember: (teamId, inviteeEmail) => {
          const now = new Date().toISOString();
          const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
          const { currentUser, teams } = get();
          const team = teams.find((t) => t.id === teamId);
          const invitation: TeamInvitation = {
            id: genId(),
            teamId,
            teamName: team?.name ?? '',
            invitedBy: currentUser.id,
            invitedByName: currentUser.name,
            inviteeEmail,
            status: 'pending',
            createdAt: now,
            expiresAt,
          };
          set((state) => ({
            invitations: [...state.invitations, invitation],
          }));
          return invitation;
        },

        acceptInvitation: (invitationId) => {
          const { invitations, currentUser } = get();
          const invitation = invitations.find((i) => i.id === invitationId);
          if (!invitation) return;

          const now = new Date().toISOString();
          set((state) => ({
            invitations: state.invitations.map((i) =>
              i.id === invitationId ? { ...i, status: 'accepted' } : i
            ),
            teams: state.teams.map((t) =>
              t.id === invitation.teamId
                ? {
                    ...t,
                    members: [
                      ...t.members,
                      {
                        userId: currentUser.id,
                        userName: currentUser.name,
                        userEmail: currentUser.email,
                        avatarColor: currentUser.avatarColor,
                        role: 'member',
                        joinedAt: now,
                        invitedBy: invitation.invitedBy,
                      },
                    ],
                    updatedAt: now,
                  }
                : t
            ),
          }));
        },

        declineInvitation: (invitationId) => {
          set((state) => ({
            invitations: state.invitations.map((i) =>
              i.id === invitationId ? { ...i, status: 'declined' } : i
            ),
          }));
        },

        canViewSpectrum: (spectrum, userId) => {
          const { currentUser, teams } = get();
          const uid = userId ?? currentUser.id;

          if (spectrum.visibility === 'public') return true;
          if (spectrum.ownerId === uid) return true;
          if (spectrum.visibility === 'private') return false;

          if (spectrum.visibility === 'team') {
            const userTeams = teams.filter((t) =>
              t.members.some((m) => m.userId === uid)
            );
            const userTeamIds = new Set(userTeams.map((t) => t.id));
            const spectrumTeamIds = spectrum.teamIds ?? [];
            return spectrumTeamIds.some((tid) => userTeamIds.has(tid));
          }

          return false;
        },

        getTeamMembers: (teamId) => {
          const { teams } = get();
          return teams.find((t) => t.id === teamId)?.members ?? [];
        },

        getUserTeams: (userId) => {
          const { teams, currentUser } = get();
          const uid = userId ?? currentUser.id;
          return teams.filter((t) => t.members.some((m) => m.userId === uid));
        },

        createClassificationAuthor: () => {
          const { currentUser } = get();
          return {
            userId: currentUser.id,
            userName: currentUser.name,
            avatarColor: currentUser.avatarColor,
          };
        },

        buildSharedClassification: (spectrumId, classification) => {
          const author = get().createClassificationAuthor();
          return {
            ...classification,
            author,
            classifiedAt: new Date().toISOString(),
            spectrumId,
          };
        },
      };
    },
    {
      name: 'stellar-spectra-teams',
      partialize: (state) => ({
        teams: state.teams,
        currentTeamId: state.currentTeamId,
        currentUser: state.currentUser,
        invitations: state.invitations,
      }),
    }
  )
);
