import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type ViewStyle } from 'react-native';

import { color, font, radius, space } from './theme';

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  /** What a screen reader calls the field; the placeholder is gone once you type. */
  accessibilityLabel: string;
  style?: ViewStyle;
  /** A button at the field's far end, such as Search's filters. */
  children?: ReactNode;
};

/**
 * The search well both tabs share: the green magnifier, what you type, and a
 * × to clear it once there's something to clear.
 */
export function SearchField({
  value,
  onChangeText,
  placeholder,
  accessibilityLabel,
  style,
  children,
}: Props) {
  return (
    <View style={[styles.field, children != null && styles.fieldWithButton, style]}>
      <Magnifier />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={color.placeholder}
        style={styles.input}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        accessibilityLabel={accessibilityLabel}
      />
      {value.length > 0 && (
        <Pressable
          onPress={() => onChangeText('')}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
        >
          <Text style={styles.clear}>×</Text>
        </Pressable>
      )}
      {children}
    </View>
  );
}

/** Drawn, like the tab marks, rather than pulled from an icon set. */
function Magnifier() {
  return (
    <View style={styles.magnifier} accessible={false}>
      <View style={styles.lens} />
      <View style={styles.lensHandle} />
    </View>
  );
}

const styles = StyleSheet.create({
  // A soft green well rather than an outlined box: the tint marks the field,
  // so it needs no border.
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    height: 52,
    backgroundColor: color.leafWash,
    borderRadius: radius.lg,
  },
  // A button at the end sits inset by this much on every side it touches.
  fieldWithButton: { paddingRight: 8 },
  // The green, as Search's filter button is: 3.1:1 on the
  // wash, just over the 3:1 a meaningful icon needs. The placeholder and the
  // accessibility label are what identify the field all the same, and the
  // placeholder is held to 4.5:1.
  // The box is exactly the drawing's bounds, so the row's centring lines the
  // whole magnifier up with the text: its middle lands on the field's middle,
  // which is where Poppins's capitals are centred at this size (26.0 of 52).
  // Drawn bottom-aligned in a taller box, it sat 2pt below them.
  magnifier: { width: 17, height: 17 },
  lens: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: color.leaf,
  },
  // Centred on the lens's 45° diagonal, 9.5 out from its middle, so it starts
  // just inside the rim and runs straight out from it.
  lensHandle: {
    position: 'absolute',
    top: 10.2,
    left: 12.7,
    width: 2,
    height: 7,
    borderRadius: 1,
    backgroundColor: color.leaf,
    transform: [{ rotate: '-45deg' }],
  },
  input: {
    flex: 1,
    fontFamily: font.regular,
    fontSize: 16,
    color: color.ink,
    padding: 0,
    // Android pads the line for accents above it, which drops the text below
    // the magnifier; iOS ignores both of these.
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  clear: { fontFamily: font.regular, fontSize: 22, color: color.mute, lineHeight: 24 },
});
