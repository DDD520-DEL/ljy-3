import type {
  VisibilityType,
  TeamRole,
  User,
  Team,
  TeamMember,
  ClassificationAuthor,
  SharedClassificationResult,
  SpectrumData,
  TeamInvitation,
  ManualClassificationResult,
} from '@/types';
import { useTeamStore } from '@/store/teamStore';
import { initializeSpectrumWithVersion } from '@/lib/versionManager';

function assert(condition: boolean, msg: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

function assertDeepEqual<T>(actual: T, expected: T, msg: string): void {
  const aStr = JSON.stringify(actual);
  const eStr = JSON.stringify(expected);
  if (aStr !== eStr) {
    throw new Error(`Assertion failed: ${msg}. Expected ${eStr}, got ${aStr}`);
  }
}

const AVATAR_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16',
];

const makeUser = (id: string, name: string, email: string): User => ({
  id, name, email,
  avatarColor: AVATAR_COLORS[0],
  createdAt: new Date().toISOString(),
});

const makeManualResult = (): ManualClassificationResult => ({
  source: 'manual',
  spectralType: 'G',
  spectralSubtype: 2,
  luminosityClass: 'V',
  confidence: 85,
  reviewerNotes: '测试备注',
  confirmedAt: new Date().toISOString(),
  matchedFeatures: ['Hα', 'Hβ'],
  deviationRegions: [],
});

export const testVisibilityTypeValues = () => {
  const validVisibilities: VisibilityType[] = ['private', 'team', 'public'];
  assert(validVisibilities.length === 3, 'should have exactly 3 visibility types');
  assert(validVisibilities.includes('private'), 'private visibility exists');
  assert(validVisibilities.includes('team'), 'team visibility exists');
  assert(validVisibilities.includes('public'), 'public visibility exists');
};

export const testTeamRoleValues = () => {
  const validRoles: TeamRole[] = ['owner', 'admin', 'member'];
  assert(validRoles.length === 3, 'should have exactly 3 team roles');
  assert(validRoles.includes('owner'), 'owner role exists');
  assert(validRoles.includes('admin'), 'admin role exists');
  assert(validRoles.includes('member'), 'member role exists');
};

export const testUserStructure = () => {
  const user = makeUser('u-1', '张三', 'zhangsan@example.com');
  assert(user.id === 'u-1', 'user id preserved');
  assert(user.name === '张三', 'user name preserved');
  assert(user.email === 'zhangsan@example.com', 'user email preserved');
  assert(AVATAR_COLORS.includes(user.avatarColor), 'avatar color from pool');
  assert(typeof user.createdAt === 'string' && user.createdAt.length > 0, 'createdAt is string');
};

export const testTeamStoreInitialState = () => {
  const { teams, currentTeamId, currentUser } = useTeamStore.getState();
  assert(currentUser !== undefined, 'current user exists');
  assert(currentUser.id.length > 0, 'current user has id');
  assert(currentUser.name.length > 0, 'current user has name');
  assert(Array.isArray(teams), 'teams is an array');
  assert(typeof currentTeamId === 'string' || currentTeamId === null, 'currentTeamId is string or null');
};

export const testCreateTeam = () => {
  const initialState = useTeamStore.getState();
  const initialCount = initialState.teams.length;

  const teamName = '测试研究团队';
  const teamDescription = '这是一个用于测试的团队';
  const newTeam = initialState.createTeam(teamName, teamDescription);

  const { teams, currentTeamId } = useTeamStore.getState();
  assert(teams.length === initialCount + 1, 'team count increased by 1');
  assert(newTeam.name === teamName, 'team name preserved');
  assert(newTeam.description === teamDescription, 'team description preserved');
  assert(newTeam.ownerId === initialState.currentUser.id, 'owner is current user');
  assert(newTeam.members.length >= 1, 'team has at least 1 member (owner)');
  assert(currentTeamId === newTeam.id, 'newly created team is current team');

  const ownerMember = newTeam.members.find((m) => m.userId === initialState.currentUser.id);
  assert(ownerMember !== undefined, 'owner is in members list');
  assert(ownerMember!.role === 'owner', 'owner has owner role');
};

export const testRenameTeam = () => {
  const { createTeam, renameTeam, teams } = useTeamStore.getState();
  const team = createTeam('旧名称');
  const newName = '新名称';

  renameTeam(team.id, newName);

  const updated = useTeamStore.getState().teams.find((t) => t.id === team.id);
  assert(updated !== undefined, 'team still exists');
  assert(updated!.name === newName, 'team name updated');
};

export const testDeleteTeam = () => {
  const { createTeam, deleteTeam, currentUser } = useTeamStore.getState();
  const team = createTeam('待删除团队');
  const teamId = team.id;

  deleteTeam(teamId);

  const { teams, currentTeamId } = useTeamStore.getState();
  assert(!teams.find((t) => t.id === teamId), 'team no longer exists');
  assert(currentTeamId !== teamId, 'deleted team is no longer current');
};

export const testSwitchTeam = () => {
  const { createTeam, switchTeam, currentUser } = useTeamStore.getState();
  const t1 = createTeam('团队A');
  const t2 = createTeam('团队B');

  switchTeam(t1.id);
  assert(useTeamStore.getState().currentTeamId === t1.id, 'switched to team A');

  switchTeam(t2.id);
  assert(useTeamStore.getState().currentTeamId === t2.id, 'switched to team B');
};

export const testAddMember = () => {
  const { createTeam, addMember, currentUser } = useTeamStore.getState();
  const team = createTeam('成员测试团队');

  const newMember = addMember(team.id, '李四', 'lisi@example.com', 'member');

  assert(newMember !== null, 'addMember returns non-null');
  assert(newMember!.userName === '李四', 'member name preserved');
  assert(newMember!.userEmail === 'lisi@example.com', 'member email preserved');
  assert(newMember!.role === 'member', 'member role is member');

  const updated = useTeamStore.getState().teams.find((t) => t.id === team.id);
  assert(updated !== undefined, 'team exists');
  const found = updated!.members.find((m) => m.userId === newMember!.userId);
  assert(found !== undefined, 'new member found');
};

export const testUpdateMemberRole = () => {
  const { createTeam, addMember, updateMemberRole, currentUser } = useTeamStore.getState();
  const team = createTeam('角色测试团队');

  const added = addMember(team.id, '王五', 'wangwu@example.com', 'member');
  assert(added !== null, 'member added');

  updateMemberRole(team.id, added!.userId, 'admin');

  const updated = useTeamStore.getState().teams.find((t) => t.id === team.id);
  const member = updated!.members.find((m) => m.userId === added!.userId);
  assert(member!.role === 'admin', 'role updated to admin');
};

export const testRemoveMember = () => {
  const { createTeam, addMember, removeMember, currentUser } = useTeamStore.getState();
  const team = createTeam('移除成员测试');

  const added = addMember(team.id, '赵六', 'zhaoliu@example.com', 'member');
  assert(added !== null, 'member added');

  const before = useTeamStore.getState().teams.find((t) => t.id === team.id)!.members.length;
  removeMember(team.id, added!.userId);
  const after = useTeamStore.getState().teams.find((t) => t.id === team.id)!.members.length;
  assert(after === before - 1, 'member count decreased');
  const removed = useTeamStore.getState().teams.find((t) => t.id === team.id)!.members.find((m) => m.userId === added!.userId);
  assert(removed === undefined, 'member removed');
};

export const testInviteMember = () => {
  const { createTeam, inviteMember, currentUser } = useTeamStore.getState();
  const team = createTeam('邀请测试团队');

  const invitation = inviteMember(team.id, 'invitee@example.com');

  assert(invitation.teamId === team.id, 'invitation teamId correct');
  assert(invitation.teamName === team.name, 'invitation teamName correct');
  assert(invitation.inviteeEmail === 'invitee@example.com', 'invitee email preserved');
  assert(invitation.invitedBy === currentUser.id, 'invitedBy is current user');
  assert(invitation.status === 'pending', 'status is pending');

  const { invitations } = useTeamStore.getState();
  const found = invitations.find((i) => i.id === invitation.id);
  assert(found !== undefined, 'invitation stored');
};

export const testAcceptInvitation = () => {
  const { createTeam, inviteMember, acceptInvitation, currentUser } = useTeamStore.getState();
  const team = createTeam('接受邀请团队');
  const invitation = inviteMember(team.id, 'accept@example.com');

  acceptInvitation(invitation.id);

  const { invitations, teams } = useTeamStore.getState();
  const updatedInvitation = invitations.find((i) => i.id === invitation.id);
  assert(updatedInvitation!.status === 'accepted', 'invitation status accepted');
};

export const testDeclineInvitation = () => {
  const { createTeam, inviteMember, declineInvitation } = useTeamStore.getState();
  const team = createTeam('拒绝邀请团队');
  const invitation = inviteMember(team.id, 'decline@example.com');

  declineInvitation(invitation.id);

  const updatedInvitation = useTeamStore.getState().invitations.find((i) => i.id === invitation.id);
  assert(updatedInvitation!.status === 'declined', 'invitation status declined');
};

export const testCanViewSpectrumPrivate = () => {
  const { canViewSpectrum, createTeam, currentUser, addMember } = useTeamStore.getState();

  const privateSpectrum = {
    id: 'sp-private',
    visibility: 'private' as VisibilityType,
    ownerId: currentUser.id,
  };

  assert(canViewSpectrum(privateSpectrum, currentUser.id) === true, 'owner can view private spectrum');

  const anotherUserId = 'u-other';
  assert(canViewSpectrum(privateSpectrum, anotherUserId) === false, 'others cannot view private spectrum');
};

export const testCanViewSpectrumPublic = () => {
  const { canViewSpectrum, currentUser } = useTeamStore.getState();

  const publicSpectrum = {
    id: 'sp-public',
    visibility: 'public' as VisibilityType,
    ownerId: 'u-anyone',
  };

  assert(canViewSpectrum(publicSpectrum, currentUser.id) === true, 'anyone can view public spectrum');
  assert(canViewSpectrum(publicSpectrum, 'u-stranger') === true, 'stranger can view public spectrum');
};

export const testCanViewSpectrumTeam = () => {
  const { canViewSpectrum, createTeam, currentUser, addMember } = useTeamStore.getState();

  const team = createTeam('可见性测试团队');

  const added = addMember(team.id, '成员', 'member@example.com', 'member');
  assert(added !== null, 'member added');
  const memberUserId = added!.userId;

  const teamSpectrum = {
    id: 'sp-team',
    visibility: 'team' as VisibilityType,
    ownerId: currentUser.id,
    teamIds: [team.id],
  };

  assert(canViewSpectrum(teamSpectrum, currentUser.id) === true, 'team member can view team spectrum');
  assert(canViewSpectrum(teamSpectrum, memberUserId) === true, 'added member can view team spectrum');
  assert(canViewSpectrum(teamSpectrum, 'u-outsider') === false, 'outsider cannot view team spectrum');
};

export const testCanViewSpectrumTeamNoTeamIds = () => {
  const { canViewSpectrum, createTeam, currentUser, addMember } = useTeamStore.getState();
  const team = createTeam('无teamIds团队');

  const teamSpectrumNoIds = {
    id: 'sp-team-noids',
    visibility: 'team' as VisibilityType,
    ownerId: currentUser.id,
  };

  assert(canViewSpectrum(teamSpectrumNoIds, currentUser.id) === true, 'owner can always view their spectrum');
  assert(canViewSpectrum(teamSpectrumNoIds, 'u-any') === false, 'others cannot view team spectrum without teamIds');
};

export const testCreateClassificationAuthor = () => {
  const { createClassificationAuthor, currentUser } = useTeamStore.getState();

  const author = createClassificationAuthor();
  assert(author.userId === currentUser.id, 'author userId matches current user');
  assert(author.userName === currentUser.name, 'author userName matches current user');
  assert(author.avatarColor === currentUser.avatarColor, 'author avatarColor matches current user');
};

export const testBuildSharedClassification = () => {
  const { buildSharedClassification } = useTeamStore.getState();
  const manual = makeManualResult();
  const spectrumId = 'sp-test';

  const shared = buildSharedClassification(spectrumId, manual);

  assert(shared.spectrumId === spectrumId, 'spectrumId preserved');
  assert(shared.spectralType === manual.spectralType, 'spectralType preserved');
  assert(shared.spectralSubtype === manual.spectralSubtype, 'spectralSubtype preserved');
  assert(shared.luminosityClass === manual.luminosityClass, 'luminosityClass preserved');
  assert(shared.confidence === manual.confidence, 'confidence preserved');
  assert(shared.reviewerNotes === manual.reviewerNotes, 'reviewerNotes preserved');
  assert(shared.author !== undefined, 'author present');
  assert(typeof shared.classifiedAt === 'string' && shared.classifiedAt.length > 0, 'classifiedAt is string timestamp');
  assert(shared.source === 'manual', 'source is manual');
};

export const testSpectrumDataExtendedFields = () => {
  const { currentUser } = useTeamStore.getState();

  const base = {
    id: 'sp-extended',
    name: '测试光谱',
    targetName: '测试目标',
    observationDate: '2026-01-01',
    wavelengthMin: 3800,
    wavelengthMax: 7000,
    points: [{ wavelength: 5000, intensity: 1.0 }],
    isNormalized: true,
    visibility: 'team' as VisibilityType,
    ownerId: currentUser.id,
    ownerName: currentUser.name,
    teamIds: ['team-1', 'team-2'],
    sharedClassifications: [],
  };
  const spectrum: SpectrumData = initializeSpectrumWithVersion(base, currentUser.id);

  assert(spectrum.visibility === 'team', 'visibility field present');
  assert(spectrum.ownerId === currentUser.id, 'ownerId field present');
  assert(spectrum.ownerName === currentUser.name, 'ownerName field present');
  assert(spectrum.teamIds?.length === 2, 'teamIds field present with 2 items');
  assert(Array.isArray(spectrum.sharedClassifications), 'sharedClassifications is array');
  assert(spectrum.currentVersionId !== undefined && spectrum.currentVersionId !== null, 'currentVersionId field present');
  assert(Array.isArray(spectrum.versions), 'versions is array');
  assert(spectrum.versions.length >= 1, 'at least one version exists');
};

export const testSharedClassificationResultStructure = () => {
  const { createClassificationAuthor } = useTeamStore.getState();
  const result: SharedClassificationResult = {
    ...makeManualResult(),
    author: createClassificationAuthor(),
    classifiedAt: new Date().toISOString(),
    spectrumId: 'sp-1',
  };

  assert(result.author !== undefined, 'author field present');
  assert(typeof result.author.userId === 'string', 'author.userId is string');
  assert(typeof result.classifiedAt === 'string', 'classifiedAt is string');
  assert(typeof result.spectrumId === 'string', 'spectrumId is string');
  assert('spectralType' in result, 'inherited spectralType');
  assert('luminosityClass' in result, 'inherited luminosityClass');
};

export const runAllTests = (): { passed: string[]; failed: { name: string; error: string }[] } => {
  const tests = [
    { name: 'visibilityTypeValues', fn: testVisibilityTypeValues },
    { name: 'teamRoleValues', fn: testTeamRoleValues },
    { name: 'userStructure', fn: testUserStructure },
    { name: 'teamStoreInitialState', fn: testTeamStoreInitialState },
    { name: 'createTeam', fn: testCreateTeam },
    { name: 'renameTeam', fn: testRenameTeam },
    { name: 'deleteTeam', fn: testDeleteTeam },
    { name: 'switchTeam', fn: testSwitchTeam },
    { name: 'addMember', fn: testAddMember },
    { name: 'updateMemberRole', fn: testUpdateMemberRole },
    { name: 'removeMember', fn: testRemoveMember },
    { name: 'inviteMember', fn: testInviteMember },
    { name: 'acceptInvitation', fn: testAcceptInvitation },
    { name: 'declineInvitation', fn: testDeclineInvitation },
    { name: 'canViewSpectrumPrivate', fn: testCanViewSpectrumPrivate },
    { name: 'canViewSpectrumPublic', fn: testCanViewSpectrumPublic },
    { name: 'canViewSpectrumTeam', fn: testCanViewSpectrumTeam },
    { name: 'canViewSpectrumTeamNoTeamIds', fn: testCanViewSpectrumTeamNoTeamIds },
    { name: 'createClassificationAuthor', fn: testCreateClassificationAuthor },
    { name: 'buildSharedClassification', fn: testBuildSharedClassification },
    { name: 'spectrumDataExtendedFields', fn: testSpectrumDataExtendedFields },
    { name: 'sharedClassificationResultStructure', fn: testSharedClassificationResultStructure },
  ];

  const passed: string[] = [];
  const failed: { name: string; error: string }[] = [];

  for (const test of tests) {
    try {
      test.fn();
      passed.push(test.name);
    } catch (e) {
      failed.push({ name: test.name, error: (e as Error).message });
    }
  }

  return { passed, failed };
};
