import { Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';

import { color, font, radius, space } from './theme';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'solid' | 'outline' | 'quiet' | 'danger';
  /** 'sm' is for a button sharing a line with other content. */
  size?: 'md' | 'sm';
  disabled?: boolean;
  style?: ViewStyle;
};

export function Button({
  label,
  onPress,
  variant = 'outline',
  size = 'md',
  disabled,
  style,
}: Props) {
  const small = size === 'sm';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      // Only the ink shrinks: the slop keeps the touch target a thumb wide,
      // which a 34pt pill is not.
      hitSlop={small ? space.sm : undefined}
      style={({ pressed }) => [
        styles.base,
        small && styles.small,
        variant === 'solid' && styles.solid,
        variant === 'outline' && styles.outline,
        variant === 'quiet' && styles.quiet,
        variant === 'danger' && styles.danger,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text
        style={[
          styles.label,
          small && styles.smallLabel,
          variant === 'solid' && styles.solidLabel,
          variant === 'danger' && styles.dangerLabel,
          disabled && styles.disabledLabel,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  small: {
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radius.sm,
    minHeight: 34,
  },
  solid: { backgroundColor: color.ink },
  outline: { borderWidth: 1, borderColor: color.edge, backgroundColor: color.tile },
  quiet: { backgroundColor: 'transparent' },
  danger: { borderWidth: 1, borderColor: color.chili, backgroundColor: 'transparent' },
  pressed: { opacity: 0.62 },
  disabled: { opacity: 1, borderColor: color.edge, backgroundColor: 'transparent' },
  label: {
    fontFamily: font.bodyMedium,
    fontSize: 15,
    color: color.ink,
  },
  smallLabel: { fontSize: 13 },
  solidLabel: { color: color.tile },
  dangerLabel: { color: color.chili },
  disabledLabel: { color: color.mute },
});
