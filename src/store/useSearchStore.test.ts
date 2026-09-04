import { BREAD_OMELETTE, CHICKEN_HANDI } from '@/search/fixtures';
import { useSearchStore } from './useSearchStore';

const realFetch = globalThis.fetch;

/** Each fetch parks until the test hands it a body, so ordering is ours to choose. */
let pending: Array<(body: unknown) => void>;

beforeEach(() => {
  pending = [];
  useSearchStore.setState({ query: '', status: 'idle', hits: [] });
  globalThis.fetch = (() =>
    new Promise((resolve) => {
      pending.push((body) =>
        resolve({ ok: true, status: 200, json: async () => body } as unknown as Response),
      );
    })) as unknown as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe('useSearchStore', () => {
  it('holds the query as it is typed', () => {
    useSearchStore.getState().setQuery('omelette');

    expect(useSearchStore.getState().query).toBe('omelette');
  });

  it('reports loading, then the hits it found', async () => {
    const done = useSearchStore.getState().run('omelette');
    expect(useSearchStore.getState().status).toBe('loading');

    pending[0]({ meals: [BREAD_OMELETTE] });
    await done;

    expect(useSearchStore.getState().status).toBe('done');
    expect(useSearchStore.getState().hits.map((hit) => hit.name)).toEqual(['Bread omelette']);
  });

  it('reports done with no hits when the source finds nothing', async () => {
    const done = useSearchStore.getState().run('zzzqqq');
    pending[0]({ meals: null });
    await done;

    expect(useSearchStore.getState().status).toBe('done');
    expect(useSearchStore.getState().hits).toEqual([]);
  });

  it('goes idle for a query too short to search', async () => {
    await useSearchStore.getState().run('a');

    expect(useSearchStore.getState().status).toBe('idle');
    expect(pending).toHaveLength(0);
  });

  it('discards a late response for a query that has been replaced', async () => {
    const first = useSearchStore.getState().run('chicken');
    const second = useSearchStore.getState().run('omelette');

    // The newer query answers first, then the abandoned one arrives late.
    pending[1]({ meals: [BREAD_OMELETTE] });
    await second;
    pending[0]({ meals: [CHICKEN_HANDI] });
    await first;

    expect(useSearchStore.getState().hits.map((hit) => hit.name)).toEqual(['Bread omelette']);
    expect(useSearchStore.getState().status).toBe('done');
  });

  it('reports an error and clears the list when the request fails', async () => {
    globalThis.fetch = (() =>
      Promise.reject(new TypeError('Network request failed'))) as unknown as typeof fetch;

    await useSearchStore.getState().run('chicken');

    expect(useSearchStore.getState().status).toBe('error');
    expect(useSearchStore.getState().hits).toEqual([]);
  });
});
