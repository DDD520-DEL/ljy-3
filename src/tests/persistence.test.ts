import type { Project, ProjectData, WorkspaceState } from '@/types';
import { localDB } from '@/lib/localStorage';
import { migrateFromLocalStorage, PERSIST_QUEUE_KEY } from '@/store/appStore';

const genId = () => Math.random().toString(36).substring(2, 9);

function assert(condition: boolean, msg: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

function assertEqual<T>(actual: T, expected: T, msg: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Assertion failed: ${msg}. Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    );
  }
}

const createEmptyProjectData = (): ProjectData => ({
  spectra: [],
  beObservations: [],
  currentSpectrumId: null,
  selectedTargetName: '',
  classificationResult: null,
});

const makeProject = (overrides: Partial<Project> = {}): Project => {
  const now = new Date().toISOString();
  return {
    id: genId(),
    name: 'Test Project',
    description: 'Test',
    createdAt: now,
    updatedAt: now,
    data: createEmptyProjectData(),
    ...overrides,
  };
};

export const testLocalDBSaveAndLoadProjects = async () => {
  await localDB.init();
  const project1 = makeProject({ id: 'test-proj-1', name: 'Project 1' });
  const project2 = makeProject({ id: 'test-proj-2', name: 'Project 2' });

  await localDB.saveProjects([project1, project2]);
  const loaded = await localDB.loadProjects();

  assert(Array.isArray(loaded), 'loadProjects should return array');
  assert(loaded.length === 2, `should load 2 projects, got ${loaded.length}`);
  assertEqual(loaded[0].id, 'test-proj-1', 'first project id should match');
  assertEqual(loaded[1].name, 'Project 2', 'second project name should match');
};

export const testLocalDBSaveSingleProject = async () => {
  const project = makeProject({ id: 'test-single', name: 'Single Project' });
  await localDB.saveProject(project);

  const loaded = await localDB.loadProjects();
  const found = loaded.find((p) => p.id === 'test-single');
  assert(!!found, 'should find the single saved project');
  assertEqual(found!.name, 'Single Project', 'project name should persist');
};

export const testLocalDBDeleteProject = async () => {
  const project = makeProject({ id: 'test-delete', name: 'To Delete' });
  await localDB.saveProject(project);
  let loaded = await localDB.loadProjects();
  assert(loaded.some((p) => p.id === 'test-delete'), 'project should exist before delete');

  await localDB.deleteProject('test-delete');
  loaded = await localDB.loadProjects();
  assert(!loaded.some((p) => p.id === 'test-delete'), 'project should not exist after delete');
};

export const testLocalDBMetadata = async () => {
  const testValue = { count: 42, label: 'test' };
  await localDB.setMetadata('test-key', testValue);
  const loaded = await localDB.getMetadata<{ count: number; label: string }>('test-key');
  assert(loaded !== null, 'metadata should be retrievable');
  assertEqual(loaded!.count, 42, 'metadata count should match');
  assertEqual(loaded!.label, 'test', 'metadata label should match');

  const missing = await localDB.getMetadata<string>('nonexistent');
  assert(missing === null, 'nonexistent metadata should return null');
};

export const testLocalDBPendingSyncItems = async () => {
  const item = {
    id: 'pending-1',
    entityType: 'project' as const,
    entityId: 'proj-1',
    operation: 'update' as const,
    data: { foo: 'bar' },
    createdAt: new Date().toISOString(),
    retryCount: 0,
  };

  await localDB.clearPendingSyncItems();
  await localDB.addPendingSyncItem(item);
  const items = await localDB.getPendingSyncItems();
  assert(items.length === 1, `should have 1 pending item, got ${items.length}`);
  assertEqual(items[0].id, 'pending-1', 'pending item id should match');

  await localDB.removePendingSyncItem('pending-1');
  const afterRemove = await localDB.getPendingSyncItems();
  assert(afterRemove.length === 0, 'should have 0 pending items after remove');

  await localDB.addPendingSyncItem(item);
  await localDB.clearPendingSyncItems();
  const afterClear = await localDB.getPendingSyncItems();
  assert(afterClear.length === 0, 'clear should remove all pending items');
};

export const testMigrateFromLocalStorage = async () => {
  const mockOldState: WorkspaceState = {
    projects: [
      {
        id: 'migrated-1',
        name: 'Migrated Project',
        description: 'From localStorage',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        data: {
          spectra: [
            {
              id: 'spec-1',
              name: 'Old Spectrum',
              targetName: 'Vega',
              observationDate: '2025-01-01',
              wavelengthMin: 4000,
              wavelengthMax: 7000,
              points: [{ wavelength: 5000, intensity: 1.0 }],
              isNormalized: true,
            },
          ],
          beObservations: [],
          currentSpectrumId: 'spec-1',
          selectedTargetName: 'Vega',
          classificationResult: null,
        },
      },
    ],
    currentProjectId: 'migrated-1',
    visibleLineCategories: { hydrogen: true, helium: true, metal: false },
    normalizationRange: null,
  };

  localStorage.setItem(PERSIST_QUEUE_KEY, JSON.stringify(mockOldState));
  await localDB.saveProjects([]);

  const migrated = await migrateFromLocalStorage();
  assert(migrated !== null, 'migration should return projects');
  assert(migrated!.length === 1, `should migrate 1 project, got ${migrated!.length}`);
  assertEqual(migrated![0].id, 'migrated-1', 'migrated project id should be preserved');
  assertEqual(migrated![0].name, 'Migrated Project', 'migrated project name should be preserved');
  assert(migrated![0].data.spectra.length === 1, 'migrated project should have spectrum data');
  assertEqual(migrated![0].data.spectra[0].name, 'Old Spectrum', 'spectrum data should be preserved');

  const fromDB = await localDB.loadProjects();
  const found = fromDB.find((p) => p.id === 'migrated-1');
  assert(!!found, 'migrated data should be written to IndexedDB');
};

export const testMigrateFromLocalStorageEmpty = async () => {
  localStorage.removeItem(PERSIST_QUEUE_KEY);
  const result = await migrateFromLocalStorage();
  assert(result === null, 'migration should return null when no localStorage data');
};

export const testMigrateFromLocalStorageInvalidJSON = async () => {
  localStorage.setItem(PERSIST_QUEUE_KEY, '{invalid json');
  const result = await migrateFromLocalStorage();
  assert(result === null, 'migration should handle invalid JSON gracefully');
};

export const testMigrateFromLocalStorageNoProjects = async () => {
  localStorage.setItem(PERSIST_QUEUE_KEY, JSON.stringify({ projects: null }));
  const result = await migrateFromLocalStorage();
  assert(result === null, 'migration should return null when projects is invalid');
};

export const testPersistenceQueueLatestWins = async () => {
  await localDB.saveProjects([]);

  const proj1 = makeProject({ id: 'queue-test', name: 'Version 1' });
  const proj2 = makeProject({ id: 'queue-test', name: 'Version 2' });
  const proj3 = makeProject({ id: 'queue-test', name: 'Version 3' });

  const { persistQueue } = await import('@/store/appStore');
  const p1 = persistQueue.enqueue([proj1]);
  const p2 = persistQueue.enqueue([proj2]);
  const p3 = persistQueue.enqueue([proj3]);

  await Promise.all([p1, p2, p3]);

  const latest = persistQueue.getLatest();
  assert(latest !== null, 'queue should track latest projects');
  assertEqual(latest![0].name, 'Version 3', 'latest projects should be version 3');

  const fromDB = await localDB.loadProjects();
  const dbProj = fromDB.find((p) => p.id === 'queue-test');
  assert(!!dbProj, 'project should be in DB');
  assertEqual(dbProj!.name, 'Version 3', 'DB should contain latest version');
};

export interface PersistenceTestResult {
  passed: string[];
  failed: { name: string; error: string }[];
}

export const runAllPersistenceTests = async (): Promise<PersistenceTestResult> => {
  const tests: { name: string; fn: () => Promise<void> }[] = [
    { name: 'localDBSaveAndLoadProjects', fn: testLocalDBSaveAndLoadProjects },
    { name: 'localDBSaveSingleProject', fn: testLocalDBSaveSingleProject },
    { name: 'localDBDeleteProject', fn: testLocalDBDeleteProject },
    { name: 'localDBMetadata', fn: testLocalDBMetadata },
    { name: 'localDBPendingSyncItems', fn: testLocalDBPendingSyncItems },
    { name: 'migrateFromLocalStorage', fn: testMigrateFromLocalStorage },
    { name: 'migrateFromLocalStorageEmpty', fn: testMigrateFromLocalStorageEmpty },
    { name: 'migrateFromLocalStorageInvalidJSON', fn: testMigrateFromLocalStorageInvalidJSON },
    { name: 'migrateFromLocalStorageNoProjects', fn: testMigrateFromLocalStorageNoProjects },
    { name: 'persistenceQueueLatestWins', fn: testPersistenceQueueLatestWins },
  ];

  const passed: string[] = [];
  const failed: { name: string; error: string }[] = [];

  for (const test of tests) {
    try {
      await test.fn();
      passed.push(test.name);
    } catch (e) {
      failed.push({ name: test.name, error: (e as Error).message });
    }
  }

  return { passed, failed };
};
