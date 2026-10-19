/**
 * A reminder as it lands, drawn after a lock-screen banner — the app, the
 * time, a title and a line — so the setting reads as the thing it makes
 * rather than as a bare time.
 */
import { StyleSheet, Text, View } from 'react-native';

import { PlateIcon } from './icons';
import { color, font, space } from './theme';

type Props = {
  title: string;
  body: string;
  time: string;
};

export function ReminderPreview({ title, body, time }: Props) {
  return (
    <View
      style={styles.banner}
      accessible
      accessibilityLabel={`Preview: ${title}, ${body}, at ${time}`}
    >
      <View style={styles.icon}>
        <PlateIcon tint={color.page} />
      </View>
      <View style={styles.text}>
        <View style={styles.top}>
          <Text style={styles.app}>DAILYMEAL</Text>
          <Text style={styles.time}>{time}</Text>
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    gap: space.md,
    paddingVertical: space.md,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: color.tile,
    boxShadow: '0px 6px 16px rgba(22, 48, 46, 0.08)',
  },
  // The app's mark: a plate on the one green.
  icon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: color.leaf,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, minWidth: 0 },
  top: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm },
  app: {
    fontFamily: font.medium,
    fontSize: 11,
    letterSpacing: 0.6,
    color: color.slate,
  },
  time: { fontFamily: font.regular, fontSize: 11, color: color.slate },
  title: {
    fontFamily: font.semibold,
    fontSize: 15,
    lineHeight: 20,
    color: color.ink,
    marginTop: 2,
  },
  body: { fontFamily: font.regular, fontSize: 15, lineHeight: 20, color: color.ink },
});
