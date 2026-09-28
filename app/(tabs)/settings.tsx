import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { mealsIn } from '@/domain/cycle';
import { WINDOW_DAYS } from '@/domain/schedule';
import { CATEGORIES, CATEGORY_LABEL, type Category } from '@/domain/types';
import { requestPermission } from '@/notifications/client';
import { useAppStore } from '@/store/useAppStore';
import { color, eyebrow, font, radius, space } from '@/ui/theme';

function toDate(time: string): Date {
  const [h, m] = time.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function toTime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function SettingsScreen() {
  const state = useAppStore();
  const [editing, setEditing] = useState<Category | null>(null);
  const [denied, setDenied] = useState(false);

  async function toggle(category: Category, on: boolean) {
    if (!on) {
      state.setNotify(category, false);
      return;
    }
    const granted = await requestPermission();
    setDenied(!granted);
    state.setNotify(category, granted);
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.lede}>
          A reminder names the meal, so you can decide before you’re out of bed.
        </Text>

        <View style={styles.panel}>
          {CATEGORIES.map((category, i) => {
            const { notify, time } = state.settings[category];
            const count = mealsIn(state, category).length;
            return (
              <View key={category} style={[styles.block, i > 0 && styles.blockDivided]}>
                <View style={styles.rowBetween}>
                  <Text style={eyebrow}>{CATEGORY_LABEL[category]}</Text>
                  <Switch
                    value={notify}
                    onValueChange={(on) => toggle(category, on)}
                    trackColor={{ true: color.yolk, false: color.edge }}
                    thumbColor={color.tile}
                    disabled={count === 0}
                  />
                </View>

                {count === 0 ? (
                  <Text style={styles.note}>
                    Add a {CATEGORY_LABEL[category].toLowerCase()} first — there’s nothing
                    to announce yet.
                  </Text>
                ) : notify ? (
                  <Pressable
                    onPress={() => setEditing(editing === category ? null : category)}
                    accessibilityRole="button"
                    style={styles.timeRow}
                  >
                    <Text style={styles.timeLabel}>Remind me at</Text>
                    <Text style={styles.timeValue}>{time}</Text>
                  </Pressable>
                ) : (
                  <Text style={styles.note}>Reminders are off.</Text>
                )}

                {editing === category && (
                  <DateTimePicker
                    value={toDate(time)}
                    mode="time"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    // The app is light-only, but iOS draws the spinner in the
                    // device's appearance — white digits on a white card in dark
                    // mode. Match the time on the row above instead.
                    themeVariant="light"
                    textColor={color.ink}
                    onChange={(event, picked) => {
                      if (Platform.OS !== 'ios') setEditing(null);
                      if (event.type === 'set' && picked) {
                        state.setTime(category, toTime(picked));
                      }
                    }}
                  />
                )}
              </View>
            );
          })}
        </View>

        {denied && (
          <Pressable onPress={() => Linking.openSettings()} style={styles.alert}>
            <Text style={styles.alertText}>
              Notifications are blocked for DAILYMEAL. Tap to open your device settings
              and allow them.
            </Text>
          </Pressable>
        )}

        <Text style={styles.footnote}>
          Reminders are scheduled {WINDOW_DAYS} days ahead and refresh each time you open
          the app. Go longer than that without opening it and they pause until you do.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.porcelain },
  content: { padding: space.xl, paddingBottom: space.huge },
  title: {
    fontFamily: font.displayBold,
    fontSize: 28,
    color: color.ink,
    letterSpacing: -0.4,
  },
  lede: {
    fontFamily: font.body,
    fontSize: 15,
    color: color.slate,
    lineHeight: 22,
    marginTop: space.sm,
  },
  panel: {
    marginTop: space.xl,
    backgroundColor: color.tile,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.edge,
  },
  block: { padding: space.lg, gap: space.md },
  blockDivided: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.edge,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  timeLabel: {
    fontFamily: font.body,
    fontSize: 15,
    color: color.slate,
  },
  timeValue: {
    fontFamily: font.monoMedium,
    fontSize: 20,
    color: color.ink,
    letterSpacing: 0.5,
  },
  note: {
    fontFamily: font.body,
    fontSize: 14,
    color: color.slate,
    lineHeight: 20,
  },
  alert: {
    marginTop: space.lg,
    padding: space.lg,
    borderRadius: radius.md,
    backgroundColor: color.yolkWash,
  },
  alertText: {
    fontFamily: font.body,
    fontSize: 14,
    color: color.ink,
    lineHeight: 20,
  },
  footnote: {
    fontFamily: font.body,
    fontSize: 13,
    color: color.slate,
    lineHeight: 19,
    marginTop: space.xl,
  },
});
