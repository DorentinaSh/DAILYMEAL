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

describe('browseRecipes', () => {
  /**
   * A browse holds the catalogue for the rest of the session, so each test
   * takes a fresh module and meets an empty one. SearchError comes from the
   * same instance — a re-imported module carries its own class.
   */
  function freshModule(): typeof import('./mealdb') {
    jest.resetModules();
    return jest.requireActual('./mealdb');
  }

  /** Answers per letter, so gaps, order and failures can all be arranged. */
  function stubLetters(meals: Record<string, unknown[]>, broken: string[] = []) {
    const calls: string[] = [];
    globalThis.fetch = ((url: string) => {
      calls.push(url);
      const letter = url.slice(-1);
      if (broken.includes(letter)) {
        return Promise.reject(new TypeError('Network request failed'));
      }
      return ok({ meals: meals[letter] ?? null })();
    }) as unknown as typeof fetch;
    return calls;
  }

  function dish(name: string, id: string) {
    return { ...BREAD_OMELETTE, idMeal: id, strMeal: name };
  }

  it('asks for every letter of the alphabet', async () => {
    const { browseRecipes } = freshModule();
    const calls = stubLetters({});

    await browseRecipes();

    expect(calls).toHaveLength(26);
    expect(calls[0]).toBe('https://www.themealdb.com/api/json/v1/1/search.php?f=a');
    expect(calls[25]).toBe('https://www.themealdb.com/api/json/v1/1/search.php?f=z');
  });

  it('keeps the order the source gives, sorting nothing itself', async () => {
    const { browseRecipes } = freshModule();
    stubLetters({
      a: [dish('Ayam Percik', '1'), dish('Apam balik', '2')],
      b: [dish('Bakso', '3')],
      z: [dish('Zuppa Toscana', '4')],
    });

    const hits = await browseRecipes();

    expect(hits.map((h) => h.name)).toEqual([
      'Ayam Percik',
      'Apam balik',
      'Bakso',
      'Zuppa Toscana',
    ]);
  });

  it('returns the whole catalogue rather than a sample of it', async () => {
    const { browseRecipes } = freshModule();
    stubLetters({
      a: Array.from({ length: 90 }, (_, i) => dish(`Dish ${i}`, String(i))),
    });

    expect(await browseRecipes()).toHaveLength(90);
  });

  it('returns hits with their ingredients and steps intact', async () => {
    const { browseRecipes } = freshModule();
    stubLetters({ b: [BREAD_OMELETTE] });

    const [hit] = await browseRecipes();

    expect(hit.ingredients).toEqual(['2 Bread', '2 Egg', '0.5 Salt']);
    expect(hit.steps).toEqual(['Make and enjoy']);
  });

  it('keeps the letters that answered when one of them fails', async () => {
    const { browseRecipes } = freshModule();
    stubLetters({ a: [dish('Apam balik', '1')], c: [dish('Corba', '2')] }, ['b']);

    const hits = await browseRecipes();

    expect(hits.map((h) => h.name)).toEqual(['Apam balik', 'Corba']);
  });

  it('raises SearchError only once every letter has failed', async () => {
    const { browseRecipes, SearchError: Failure } = freshModule();
    const calls = stubLetters({}, 'abcdefghijklmnopqrstuvwxyz'.split(''));

    await expect(browseRecipes()).rejects.toBeInstanceOf(Failure);
    expect(calls).toHaveLength(26);
  });

  it('fetches the catalogue once a session', async () => {
    const { browseRecipes } = freshModule();
    const calls = stubLetters({ a: [dish('Apam balik', '1')] });

    const first = await browseRecipes();
    const second = await browseRecipes();

    expect(calls).toHaveLength(26);
    expect(second).toEqual(first);
  });

  it('goes back for the catalogue when a letter was missed', async () => {
    const { browseRecipes } = freshModule();
    const calls = stubLetters({ a: [dish('Apam balik', '1')] }, ['b']);

    await browseRecipes();
    await browseRecipes();

    expect(calls).toHaveLength(52);
  });
});
