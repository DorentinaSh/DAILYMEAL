import { Tabs } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { color, font } from '@/ui/theme';

/**
 * Tab marks are drawn rather than imported: three small glyphs that echo the
 * cycle strip on the cards, so the app's one visual idea carries into the
 * chrome instead of borrowing a stock icon set.
 */
function TabMark({
  shape,
  focused,
}: {
  shape: 'today' | 'search' | 'meals' | 'saved' | 'settings';
  focused: boolean;
}) {
  const tint = focused ? color.ink : color.mute;
  if (shape === 'today') {
    return (
      <View style={styles.mark}>
        <View style={[styles.tick, { backgroundColor: focused ? color.yolk : tint, height: 16 }]} />
        <View style={[styles.tick, { backgroundColor: tint }]} />
        <View style={[styles.tick, { backgroundColor: tint }]} />
      </View>
    );
  }
  if (shape === 'search') {
    return (
      <View style={styles.markSearch}>
        <View style={[styles.ring, { borderColor: tint }]} />
        <View style={[styles.handle, { backgroundColor: tint }]} />
      </View>
    );
  }
  if (shape === 'meals') {
    return (
      <View style={styles.markStack}>
        <View style={[styles.bar, { backgroundColor: tint }]} />
        <View style={[styles.bar, { backgroundColor: tint }]} />
        <View style={[styles.bar, { backgroundColor: tint, width: 10 }]} />
      </View>
    );
  }
  if (shape === 'saved') {
    return (
      <View style={styles.markSaved}>
        <View style={[styles.bookmark, { backgroundColor: tint }]}>
          {/* The notch is painted in the bar behind it, as on the save button. */}
          <View style={[styles.bookmarkNotch, { borderBottomColor: color.tile }]} />
        </View>
      </View>
    );
  }
  return (
    <View style={styles.markStack}>
      <View style={[styles.bar, { backgroundColor: tint, width: 18 }]} />
      <View style={[styles.bar, { backgroundColor: tint, width: 11 }]} />
      <View style={[styles.bar, { backgroundColor: tint, width: 15 }]} />
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: color.ink,
        tabBarInactiveTintColor: color.mute,
        tabBarStyle: {
          backgroundColor: color.tile,
          borderTopColor: color.edge,
          height: 88,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontFamily: font.monoMedium,
          fontSize: 10,
          letterSpacing: 1,
          textTransform: 'uppercase',
        },
        sceneStyle: { backgroundColor: color.porcelain },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ focused }) => <TabMark shape="today" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ focused }) => <TabMark shape="search" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="meals"
        options={{
          title: 'Meals',
          tabBarIcon: ({ focused }) => <TabMark shape="meals" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: 'Saved',
          tabBarIcon: ({ focused }) => <TabMark shape="saved" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused }) => <TabMark shape="settings" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  mark: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 18 },
  markStack: { gap: 3, height: 18, justifyContent: 'center' },
  tick: { width: 3, height: 9, borderRadius: 1.5 },
  bar: { width: 15, height: 3, borderRadius: 1.5 },
  markSearch: { flexDirection: 'row', alignItems: 'flex-end', height: 18 },
  ring: { width: 13, height: 13, borderRadius: 6.5, borderWidth: 2 },
  handle: {
    width: 3,
    height: 7,
    borderRadius: 1.5,
    marginLeft: -2,
    marginBottom: 1,
    transform: [{ rotate: '-45deg' }],
  },
  markSaved: { height: 18, justifyContent: 'center' },
  bookmark: {
    width: 13,
    height: 17,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    justifyContent: 'flex-end',
  },
  bookmarkNotch: {
    width: 0,
    height: 0,
    borderLeftWidth: 6.5,
    borderRightWidth: 6.5,
    borderBottomWidth: 5,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
});
