/**
 * Where a meal's dish would sit when its list is empty: a porcelain plate seen
 * from above, rim and well. Drawn rather than lettered, because there is no
 * meal to take a letter from.
 */
import { StyleSheet, View } from 'react-native';

import { color } from './theme';

export function EmptyPlate({ size }: { size: number }) {
  const well = Math.round(size * 0.62);
  return (
    <View
      style={[styles.plate, { width: size, height: size, borderRadius: size / 2 }]}
      // The words beside it say the list is empty; this only shows it.
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      <View
        style={[
          styles.well,
          { width: well, height: well, borderRadius: well / 2, borderWidth: Math.max(1.5, size / 60) },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  plate: {
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.porcelain,
  },
  well: { borderColor: color.edge },
});
