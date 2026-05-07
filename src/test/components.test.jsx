/**
 * Component render tests — catch "missing import" and crash-on-render bugs
 * before they reach production. Each test simply proves the component mounts
 * without throwing; deeper behaviour is covered by unit/E2E tests.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ─── Shared mock translation object ────────────────────────────────────────
const t = {
  log: {
    title: 'Log', sub: 'sub', noLog: 'No logs', noLogSub: 'Add one',
    mealTypes: { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack', other: 'Other' },
    extraWater: 'Extra water',
  },
  water: {
    title: 'Water', sources: { bowl: 'Bowl', fountain: 'Fountain', syringe: 'Syringe', other: 'Other' },
  },
  waste: {
    title: 'Waste',
    types: { poop: 'Poop', pee: 'Pee' },
    poop: {
      colors: { brown: 'Brown', dark: 'Dark', yellow: 'Yellow', red: 'Red', gray: 'Gray', other: 'Other' },
      consistencies: { normal: 'Normal', soft: 'Soft', mushy: 'Mushy', liquid: 'Liquid', hard: 'Hard' },
    },
    pee: { clumps: 'clumps', colors: { normal: 'Normal', dark: 'Dark', orange: 'Orange', red: 'Red', clear: 'Clear' } },
  },
  history: {
    title: 'History', sub: 'sub', noHistory: 'No history',
    filterAll: 'All', filterMeal: 'Meal', filterWater: 'Water', filterWaste: 'Waste',
  },
  foodDb: {
    types: { dry: 'Dry', wet: 'Wet', treat: 'Treat', supplement: 'Supplement' },
  },
  common: { confirm: 'Confirm', delete: 'Delete' },
};

// ─── Mock external dependencies so components render in isolation ───────────
vi.mock('../../storage.js', () => ({
  getPhotoUrl: vi.fn().mockResolvedValue(null),
  loadLogs: vi.fn().mockReturnValue([]),
  saveLogs: vi.fn(),
  mergeLogs: vi.fn((a, b) => [...(a ?? []), ...(b ?? [])]),
}));

vi.mock('../../auth.js', () => ({
  isSignedIn: vi.fn().mockReturnValue(false),
}));

// ─── Import components under test ──────────────────────────────────────────
import { LogPage, HistoryPage, LogCard } from '../../components/pages/LogHistoryPages.jsx';

// ──────────────────────────────────────────────────────────────────────────────
describe('LogPage', () => {
  it('renders without crashing (empty logs)', () => {
    render(<LogPage t={t} todayLogs={[]} todayKcal={0} todayWater={0} todayProtein={0} onDelete={() => {}} />);
    expect(screen.getByText(t.log.noLog)).toBeTruthy();
  });

  it('renders a meal log card', () => {
    const logs = [{
      id: 'meal-1',
      kind: 'meal',
      mealType: 'breakfast',
      createdAt: '2024-01-01T08:00:00Z',
      date: '2024-01-01',
      totalKcal: 120,
      totalProtein: 10,
      totalWater: 50,
      extraWaterMl: 0,
      items: [{ foodType: 'wet', foodName: 'Chicken Can', grams: 100, kcal: 120 }],
    }];
    render(<LogPage t={t} todayLogs={logs} todayKcal={120} todayWater={50} todayProtein={10} onDelete={() => {}} />);
    expect(screen.getByText('Chicken Can')).toBeTruthy();
  });

  it('renders a water log card', () => {
    const logs = [{
      id: 'water-1',
      kind: 'water',
      ml: 150,
      source: 'bowl',
      createdAt: '2024-01-01T10:00:00Z',
      date: '2024-01-01',
    }];
    render(<LogPage t={t} todayLogs={logs} todayKcal={0} todayWater={150} todayProtein={0} onDelete={() => {}} />);
    expect(screen.getByText('150 ml')).toBeTruthy();
  });

  it('renders a waste log card (poop)', () => {
    const logs = [{
      id: 'waste-1',
      kind: 'waste',
      wasteType: 'poop',
      color: 'brown',
      consistency: 'normal',
      createdAt: '2024-01-01T09:00:00Z',
      date: '2024-01-01',
    }];
    render(<LogPage t={t} todayLogs={logs} todayKcal={0} todayWater={0} todayProtein={0} onDelete={() => {}} />);
    expect(screen.getByText('Brown')).toBeTruthy();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
describe('HistoryPage', () => {
  it('renders without crashing (empty logs)', () => {
    render(<HistoryPage t={t} logs={[]} onDelete={() => {}} />);
    expect(screen.getByText(t.history.noHistory)).toBeTruthy();
  });

  it('renders grouped log entries', () => {
    const logs = [
      { id: 'a', kind: 'water', ml: 100, source: 'bowl', date: '2024-01-02', createdAt: '2024-01-02T10:00:00Z' },
      { id: 'b', kind: 'water', ml: 200, source: 'fountain', date: '2024-01-01', createdAt: '2024-01-01T10:00:00Z' },
    ];
    render(<HistoryPage t={t} logs={logs} onDelete={() => {}} />);
    expect(screen.getByText('100 ml')).toBeTruthy();
    expect(screen.getByText('200 ml')).toBeTruthy();
  });

  it('filters by kind when a filter tab is clicked', async () => {
    const logs = [
      { id: 'w', kind: 'water', ml: 100, source: 'bowl', date: '2024-01-01', createdAt: '2024-01-01T10:00:00Z' },
      {
        id: 'm', kind: 'meal', mealType: 'lunch', date: '2024-01-01', createdAt: '2024-01-01T12:00:00Z',
        totalKcal: 80, totalProtein: 5, totalWater: 20, extraWaterMl: 0,
        items: [{ foodType: 'dry', foodName: 'Kibble', grams: 30, kcal: 80 }],
      },
    ];
    render(<HistoryPage t={t} logs={logs} onDelete={() => {}} />);

    // Both visible initially
    expect(screen.getByText('100 ml')).toBeTruthy();
    expect(screen.getByText('Kibble')).toBeTruthy();

    // Filter to water only
    await userEvent.click(screen.getByText(t.history.filterWater));
    expect(screen.getByText('100 ml')).toBeTruthy();
    expect(screen.queryByText('Kibble')).toBeNull();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
describe('LogCard delete UX', () => {
  const waterLog = {
    id: 'del-1',
    kind: 'water',
    ml: 75,
    source: 'bowl',
    createdAt: '2024-01-01T08:00:00Z',
    date: '2024-01-01',
  };

  it('renders × delete button initially', () => {
    render(<LogCard log={waterLog} t={t} onDelete={() => {}} />);
    expect(screen.getByRole('button', { name: t.common.delete })).toBeTruthy();
  });

  it('arms confirm on first click (shows ✓)', async () => {
    render(<LogCard log={waterLog} t={t} onDelete={() => {}} />);
    const btn = screen.getByRole('button', { name: t.common.delete });
    await userEvent.click(btn);
    expect(screen.getByRole('button', { name: t.common.confirm })).toBeTruthy();
  });

  it('calls onDelete with log id on second click', async () => {
    const onDelete = vi.fn();
    render(<LogCard log={waterLog} t={t} onDelete={onDelete} />);
    const btn = screen.getByRole('button', { name: t.common.delete });
    await userEvent.click(btn);
    await userEvent.click(screen.getByRole('button', { name: t.common.confirm }));
    expect(onDelete).toHaveBeenCalledWith('del-1');
  });
});
