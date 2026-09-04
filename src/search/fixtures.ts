/**
 * Real responses, captured from the live endpoint and trimmed to the fields we
 * read. Tests run against these so the suite never touches the network.
 */
import type { RawMeal } from './types';

/** Breakfast, three ingredients, and the blank padding the source sends. */
export const BREAD_OMELETTE: RawMeal = {
  idMeal: '53076',
  strMeal: 'Bread omelette',
  strCategory: 'Breakfast',
  strArea: 'India',
  strMealThumb: 'https://www.themealdb.com/images/media/meals/hqaejl1695738653.jpg',
  strInstructions: 'Make and enjoy',
  strIngredient1: 'Bread',
  strMeasure1: '2',
  strIngredient2: 'Egg',
  strMeasure2: '2',
  strIngredient3: 'Salt',
  strMeasure3: '0.5',
  // The source pads every unused slot — sometimes '', sometimes a space, sometimes null.
  strIngredient4: '',
  strMeasure4: ' ',
  strIngredient5: '   ',
  strMeasure5: '   ',
  strIngredient6: null,
  strMeasure6: null,
};

/** Not breakfast, and instructions broken by CRLF rather than newline. */
export const CHICKEN_HANDI: RawMeal = {
  idMeal: '52795',
  strMeal: 'Chicken Handi',
  strCategory: 'Chicken',
  strArea: 'Indian',
  strMealThumb: 'https://www.themealdb.com/images/media/meals/wyxwsp1486979827.jpg',
  strInstructions:
    'Heat the oil and fry the onion until deep golden brown.\r\n' +
    'Add the garlic and sauté for a minute.\r\n' +
    '\r\n' +
    '  Return the onion to the pot and stir.  ',
  strIngredient1: 'Chicken',
  strMeasure1: '1.2 kg',
  strIngredient2: 'Onion',
  strMeasure2: '5 thinly sliced',
};
