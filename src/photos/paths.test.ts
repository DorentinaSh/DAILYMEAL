import type { Meal } from '@/domain/types';
import { hasOwnPhoto, photoName, photoUriFor } from './paths';

const DIR = 'file:///var/app/Documents/meals';

function meal(fields: Partial<Meal> = {}): Meal {
  return {
    id: 'm1',
    name: 'Shakshuka',
    category: 'breakfast',
    ingredients: [],
    steps: [],
    prepMinutes: null,
    ...fields,
  };
}

describe('photoName', () => {
  it('names a jpg after the id it is given', () => {
    expect(photoName('k3f9-abcd1234')).toBe('photo-k3f9-abcd1234.jpg');
  });

  // It takes the id rather than minting one so the result is deterministic here;
  // uniqueness is makeId's job and is proven where makeId is tested.
  it('is a bare name, with no directory in it', () => {
    expect(photoName('x')).not.toContain('/');
  });
});

describe('photoUriFor', () => {
  it('prefers the photo you added over the one the source sent', () => {
    const uri = photoUriFor(
      meal({ photoFile: 'photo-mine.jpg', imageUrl: 'https://themealdb.example/x.jpg' }),
      DIR,
    );
    expect(uri).toBe('file:///var/app/Documents/meals/photo-mine.jpg');
  });

  it("falls back to the source's photo when you have not added one", () => {
    expect(photoUriFor(meal({ imageUrl: 'https://themealdb.example/x.jpg' }), DIR)).toBe(
      'https://themealdb.example/x.jpg',
    );
  });

  // Removing your own photo writes null, and that has to read as "fall back",
  // not as "this meal has no picture".
  it('treats a cleared photoFile as absent', () => {
    expect(
      photoUriFor(
        meal({ photoFile: null, imageUrl: 'https://themealdb.example/x.jpg' }),
        DIR,
      ),
    ).toBe('https://themealdb.example/x.jpg');
  });

  it('gives back nothing for a meal with neither, so the mark draws a letter', () => {
    expect(photoUriFor(meal(), DIR)).toBeNull();
    expect(photoUriFor(meal({ photoFile: null, imageUrl: null }), DIR)).toBeNull();
  });

  it('joins the directory and the name with exactly one slash', () => {
    expect(photoUriFor(meal({ photoFile: 'p.jpg' }), 'file:///a/meals/')).toBe(
      'file:///a/meals/p.jpg',
    );
    expect(photoUriFor(meal({ photoFile: 'p.jpg' }), 'file:///a/meals')).toBe(
      'file:///a/meals/p.jpg',
    );
  });

  // A bare filename handed to <Image> renders nothing at all, silently, which
  // is the failure this whole module exists to prevent.
  it('never returns a bare filename', () => {
    const uri = photoUriFor(meal({ photoFile: 'photo-mine.jpg' }), DIR);
    expect(uri).not.toBe('photo-mine.jpg');
    expect(uri?.startsWith('file://')).toBe(true);
  });
});

describe('hasOwnPhoto', () => {
  it('is true only when the photo is yours', () => {
    expect(hasOwnPhoto(meal({ photoFile: 'p.jpg' }))).toBe(true);
    expect(hasOwnPhoto(meal({ imageUrl: 'https://themealdb.example/x.jpg' }))).toBe(false);
    expect(hasOwnPhoto(meal({ photoFile: null }))).toBe(false);
    expect(hasOwnPhoto(meal())).toBe(false);
  });
});
