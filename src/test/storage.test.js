import { describe, it, expect, beforeEach } from 'vitest';
import { mergeLogs, mergeFoods, loadLogs, saveLogs } from '../../storage.js';

describe('mergeLogs', () => {
  it('returns remote entries when local is empty', () => {
    const remote = [{ id: 'a', createdAt: '2024-01-02T00:00:00Z' }];
    expect(mergeLogs([], remote)).toEqual(remote);
  });

  it('returns local entries when remote is empty', () => {
    const local = [{ id: 'b', createdAt: '2024-01-02T00:00:00Z' }];
    expect(mergeLogs(local, [])).toEqual(local);
  });

  it('deduplicates by id, preferring remote version', () => {
    const local  = [{ id: 'x', createdAt: '2024-01-01T00:00:00Z', src: 'local' }];
    const remote = [{ id: 'x', createdAt: '2024-01-01T00:00:00Z', src: 'remote' }];
    const result = mergeLogs(local, remote);
    expect(result).toHaveLength(1);
    expect(result[0].src).toBe('remote');
  });

  it('includes local-only entries not present in remote', () => {
    const local  = [{ id: 'local-only', createdAt: '2024-01-03T00:00:00Z' }];
    const remote = [{ id: 'remote-only', createdAt: '2024-01-01T00:00:00Z' }];
    const result = mergeLogs(local, remote);
    expect(result).toHaveLength(2);
    expect(result.map(l => l.id)).toContain('local-only');
  });

  it('sorts by createdAt descending (newest first)', () => {
    const entries = [
      { id: 'old', createdAt: '2024-01-01T00:00:00Z' },
      { id: 'new', createdAt: '2024-01-03T00:00:00Z' },
      { id: 'mid', createdAt: '2024-01-02T00:00:00Z' },
    ];
    const result = mergeLogs(entries, []);
    expect(result.map(l => l.id)).toEqual(['new', 'mid', 'old']);
  });

  it('handles null/undefined inputs safely', () => {
    expect(() => mergeLogs(null, null)).not.toThrow();
    expect(mergeLogs(null, null)).toEqual([]);
  });
});

describe('mergeFoods', () => {
  it('returns remote foods when local is empty', () => {
    const remote = [{ id: 'a', name: 'Tuna' }];
    expect(mergeFoods([], remote)).toEqual(remote);
  });

  it('returns local foods when remote is empty', () => {
    const local = [{ id: 'b', name: 'Salmon' }];
    expect(mergeFoods(local, [])).toEqual(local);
  });

  it('deduplicates by id, preferring remote version', () => {
    const local  = [{ id: 'x', name: 'local name' }];
    const remote = [{ id: 'x', name: 'remote name' }];
    const result = mergeFoods(local, remote);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('remote name');
  });

  it('includes local-only foods not present in remote', () => {
    const local  = [{ id: 'local-only', name: 'New food' }];
    const remote = [{ id: 'remote-only', name: 'Drive food' }];
    const result = mergeFoods(local, remote);
    expect(result).toHaveLength(2);
    expect(result.map(f => f.id)).toContain('local-only');
    expect(result.map(f => f.id)).toContain('remote-only');
  });

  it('preserves all remote foods even with no local foods', () => {
    const remote = [
      { id: 'r1', name: 'Food 1' },
      { id: 'r2', name: 'Food 2' },
    ];
    expect(mergeFoods(null, remote)).toEqual(remote);
  });

  it('handles null/undefined inputs safely', () => {
    expect(() => mergeFoods(null, null)).not.toThrow();
    expect(mergeFoods(null, null)).toEqual([]);
  });
});

describe('localStorage persistence', () => {
  beforeEach(() => localStorage.clear());

  it('loadLogs returns [] when nothing stored', () => {
    expect(loadLogs()).toEqual([]);
  });

  it('saveLogs and loadLogs round-trip', () => {
    const logs = [{ id: 'a', kind: 'water', createdAt: new Date().toISOString() }];
    saveLogs(logs);
    expect(loadLogs()).toEqual(logs);
  });
});
