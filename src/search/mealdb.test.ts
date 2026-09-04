import { BREAD_OMELETTE } from './fixtures';
import { MIN_QUERY, SearchError, searchRecipes } from './mealdb';

const realFetch = globalThis.fetch;

/** Replaces fetch with one that always answers the same way, and records calls. */
function stubFetch(reply: () => Promise<unknown>) {
  const calls: string[] = [];
  globalThis.fetch = ((url: string) => {
    calls.push(url);
    return reply();
  }) as unknown as typeof fetch;
  return calls;
}

function ok(body: unknown) {
  return async () => ({ ok: true, status: 200, json: async () => body }) as unknown as Response;
}

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe('searchRecipes', () => {
  it('asks the search endpoint for the encoded query', async () => {
    const calls = stubFetch(ok({ meals: [BREAD_OMELETTE] }));

    await searchRecipes('bread omelette');

    expect(calls[0]).toBe(
      'https://www.themealdb.com/api/json/v1/1/search.php?s=bread%20omelette',
    );
  });

  it('returns normalized hits', async () => {
    stubFetch(ok({ meals: [BREAD_OMELETTE] }));

    const hits = await searchRecipes('omelette');

    expect(hits).toHaveLength(1);
    expect(hits[0].name).toBe('Bread omelette');
    expect(hits[0].ingredients).toEqual(['2 Bread', '2 Egg', '0.5 Salt']);
  });

  it('returns nothing for a query too short to be worth a request', async () => {
    const calls = stubFetch(ok({ meals: [BREAD_OMELETTE] }));

    expect(await searchRecipes('a')).toEqual([]);
    expect(await searchRecipes('   ')).toEqual([]);
    expect(calls).toHaveLength(0);
    expect(MIN_QUERY).toBe(2);
  });

  it('reads the source’s null as no results', async () => {
    stubFetch(ok({ meals: null }));

    expect(await searchRecipes('zzzqqq')).toEqual([]);
  });

  it('raises SearchError when the service answers with an error status', async () => {
    stubFetch(async () => ({ ok: false, status: 503 }) as unknown as Response);

    await expect(searchRecipes('chicken')).rejects.toBeInstanceOf(SearchError);
  });

  it('raises SearchError when the network fails', async () => {
    stubFetch(() => Promise.reject(new TypeError('Network request failed')));

    await expect(searchRecipes('chicken')).rejects.toBeInstanceOf(SearchError);
  });

  it('raises SearchError when the body is not the shape we expect', async () => {
    stubFetch(async () => ({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError('bad json');
      },
    }) as unknown as Response);

    await expect(searchRecipes('chicken')).rejects.toBeInstanceOf(SearchError);
  });
});
