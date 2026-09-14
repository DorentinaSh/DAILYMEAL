import { createEmptyState } from '@/domain/cycle';
import { migrateState, STATE_VERSION } from './migrate';

/** A document as version 0 wrote it: bookmarks as a flag on each meal. */
function legacy(meals: Array<{ id: string; name: string; saved?: boolean }>) {
  const { saved, ...rest } = createEmptyState();
  return {
    ...rest,
    meals: meals.map((m) => ({
      id: m.id,
      name: m.name,
      category: 'breakfast' as const,
      ingredients: ['thing'],
      steps: ['do it'],
      prepMinutes: 5,
      ...(m.saved === undefined ? {} : { saved: m.saved }),
    })),
  };
}

describe('migrateState', () => {
  it('lifts a flagged meal into a linked saved recipe', () => {
    const state = migrateState(legacy([{ id: 'a', name: 'Porridge', saved: true }]), 0);

    expect(state.saved).toHaveLength(1);
    expect(state.saved[0]).toMatchObject({
      name: 'Porridge',
      mealId: 'a',
      sourceId: null,
      imageUrl: null,
      category: 'breakfast',
    });
  });

  it('gives every migrated entry its own id', () => {
    const state = migrateState(
      legacy([
        { id: 'a', name: 'Porridge', saved: true },
        { id: 'b', name: 'Omelette', saved: true },
      ]),
      0,
    );

    const ids = state.saved.map((recipe) => recipe.id);
    expect(new Set(ids).size).toBe(2);
  });

  it('keeps the order the meals were in', () => {
    const state = migrateState(
      legacy([
        { id: 'a', name: 'Porridge', saved: true },
        { id: 'b', name: 'Omelette', saved: true },
      ]),
      0,
    );

    expect(state.saved.map((recipe) => recipe.name)).toEqual(['Porridge', 'Omelette']);
  });

  it('leaves unflagged meals out of the list', () => {
    const state = migrateState(
      legacy([
        { id: 'a', name: 'Porridge', saved: true },
        { id: 'b', name: 'Omelette' },
        { id: 'c', name: 'Toast', saved: false },
      ]),
      0,
    );

    expect(state.saved.map((recipe) => recipe.mealId)).toEqual(['a']);
  });

  it('strips the flag from every meal', () => {
    const state = migrateState(
      legacy([
        { id: 'a', name: 'Porridge', saved: true },
        { id: 'b', name: 'Omelette', saved: false },
      ]),
      0,
    );

    for (const meal of state.meals) {
      expect(meal).not.toHaveProperty('saved');
    }
  });

  it('keeps the meals themselves', () => {
    const state = migrateState(legacy([{ id: 'a', name: 'Porridge', saved: true }]), 0);

    expect(state.meals.map((meal) => meal.id)).toEqual(['a']);
  });

  it('gives a document with no bookmarks an empty list', () => {
    const state = migrateState(legacy([{ id: 'a', name: 'Porridge' }]), 0);

    expect(state.saved).toEqual([]);
  });

  it('leaves an already-migrated document alone', () => {
    const current = { ...createEmptyState(), saved: [] };

    expect(migrateState(current, STATE_VERSION)).toBe(current);
  });
});
