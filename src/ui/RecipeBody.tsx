/**
 * Ingredients and steps, as the two uncommitted screens draw them: a recipe
 * you found and a recipe you kept are the same thing at different moments, so
 * they read the same.
 *
 * The meal detail sets its ingredients in a bordered card instead, and is
 * deliberately left out — folding all three in would mean choosing one of the
 * two treatments, which is not this component's decision to make.
 */
import { StyleSheet, Text, View } from 'react-native';

import { color, eyebrow, font, space } from './theme';

export function RecipeBody({
  ingredients,
  steps,
}: {
  ingredients: string[];
  steps: string[];
}) {
  return (
    <>
      {ingredients.length > 0 && (
        <View style={styles.section}>
          <Text style={eyebrow}>Ingredients</Text>
          {ingredients.map((line, i) => (
            <Text key={`${line}-${i}`} style={styles.line}>
              {line}
            </Text>
          ))}
        </View>
      )}

      {steps.length > 0 && (
        <View style={styles.section}>
          <Text style={eyebrow}>Steps</Text>
          {steps.map((step, i) => (
            <View key={`${i}-${step.slice(0, 12)}`} style={styles.stepRow}>
              <Text style={styles.stepNumber}>{i + 1}</Text>
              <Text style={styles.line}>{step}</Text>
            </View>
          ))}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  section: { gap: space.sm, marginTop: space.lg },
  line: { flex: 1, fontFamily: font.body, fontSize: 15, color: color.ink, lineHeight: 22 },
  stepRow: { flexDirection: 'row', gap: space.md },
  stepNumber: {
    fontFamily: font.monoMedium,
    fontSize: 13,
    color: color.mute,
    lineHeight: 22,
    width: 18,
  },
});
