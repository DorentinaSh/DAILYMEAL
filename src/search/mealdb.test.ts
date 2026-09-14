import { BREAD_OMELETTE, CHICKEN_HANDI } from './fixtures';
import { browseRecipes, MIN_QUERY, SearchError, searchRecipes } from './mealdb';

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

describe('browseRecipes', () => {
  /** Always picks the last remaining item, so the shuffle is reproducible. */
  const lastRng = () => 0.999999;

  it('browses by first letter, the only listing that carries whole recipes', async () => {
    const calls = stubFetch(ok({ meals: [BREAD_OMELETTE] }));

    await browseRecipes(lastRng);

    expect(calls[0]).toMatch(
      /^https:\/\/www\.themealdb\.com\/api\/json\/v1\/1\/search\.php\?f=[a-z]$/,
    );
  });

  it('returns hits with their ingredients and steps intact', async () => {
    stubFetch(ok({ meals: [BREAD_OMELETTE] }));

    const [hit] = await browseRecipes(lastRng);

    expect(hit.ingredients).toEqual(['2 Bread', '2 Egg', '0.5 Salt']);
    expect(hit.steps).toEqual(['Make and enjoy']);
  });

  it('tries another letter when one holds nothing', async () => {
    let call = 0;
    const calls = stubFetch(() => {
      call += 1;
      return ok(call === 1 ? { meals: null } : { meals: [CHICKEN_HANDI] })();
    });

    const hits = await browseRecipes(lastRng);

    expect(calls).toHaveLength(2);
    expect(hits.map((h) => h.name)).toEqual(['Chicken Handi']);
  });

  it('gives up rather than trying every letter in the alphabet', async () => {
    const calls = stubFetch(ok({ meals: null }));

    expect(await browseRecipes(lastRng)).toEqual([]);
    expect(calls).toHaveLength(3);
  });

  it('caps the list so it stays browsable', async () => {
    const many = Array.from({ length: 90 }, (_, i) => ({
      ...BREAD_OMELETTE,
      idMeal: String(i),
      strMeal: `Dish ${i}`,
    }));
    stubFetch(ok({ meals: many }));

    expect(await browseRecipes(lastRng)).toHaveLength(20);
  });

  it('raises SearchError when the network fails', async () => {
    stubFetch(() => Promise.reject(new TypeError('Network request failed')));

    await expect(browseRecipes(lastRng)).rejects.toBeInstanceOf(SearchError);
  });
});
