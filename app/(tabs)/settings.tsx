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
import { nearbyTimes } from '@/domain/day';
import { WINDOW_DAYS } from '@/domain/schedule';
import { CATEGORIES, CATEGORY_LABEL, DEFAULT_TIMES, type Category } from '@/domain/types';
import { requestPermission } from '@/notifications/client';
import { useAppStore } from '@/store/useAppStore';
import { ReminderPreview } from '@/ui/ReminderPreview';
import { TimeChip } from '@/ui/TimeChip';
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

        <View style={styles.cards}>
          {CATEGORIES.map((category) => {
            const { notify, time } = state.settings[category];
            const count = mealsIn(state, category).length;
            const label = CATEGORY_LABEL[category];
            // Around the usual time rather than the chosen one, so picking a
            // chip never moves the chips.
            const presets = nearbyTimes(DEFAULT_TIMES[category]);
            const custom = !presets.includes(time);
            const picking = editing === category;

            return (
              <View key={category} style={styles.card}>
                <View style={styles.rowBetween}>
                  <Text style={styles.name}>{label}</Text>
                  <Switch
                    value={notify}
                    onValueChange={(on) => toggle(category, on)}
                    trackColor={{ true: color.leaf, false: color.edge }}
                    ios_backgroundColor={color.edge}
                    thumbColor={color.tile}
                    disabled={count === 0}
                    accessibilityLabel={`${label} reminders`}
                  />
                </View>

                {count === 0 ? (
                  <Text style={styles.note}>
                    Add a {label.toLowerCase()} first — there’s nothing to announce yet.
                  </Text>
                ) : notify ? (
                  <>
                    <View style={styles.preview}>
                      <Text style={eyebrow}>Your reminder</Text>
                      {/* The category only. The reminder itself still names
                          the day's meal. */}
                      <ReminderPreview
                        title={label}
                        body={`Time for ${label.toLowerCase()}`}
                        time={time}
                      />
                    </View>

                    <View style={styles.chips}>
                      {presets.map((preset) => (
                        <TimeChip
                          key={preset}
                          label={preset}
                          selected={preset === time}
                          accessibilityLabel={`Remind me at ${preset}`}
                          onPress={() => {
                            setEditing(null);
                            state.setTime(category, preset);
                          }}
                        />
                      ))}
                      {/* Any other minute. Once one is chosen, this chip is
                          the one that wears it. */}
                      <TimeChip
                        label={custom ? time : 'Other'}
                        clock
                        selected={custom}
                        accessibilityLabel={
                          custom ? `Remind me at ${time}. Pick another time` : 'Pick another time'
                        }
                        onPress={() => setEditing(picking ? null : category)}
                      />
                    </View>

                    {picking && (
                      <DateTimePicker
                        value={toDate(time)}
                        mode="time"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        // The app is light-only, but iOS draws the spinner in the
                        // device's appearance — white digits on a pale card in dark
                        // mode. Match the times around it instead.
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
                  </>
                ) : (
                  <Text style={styles.note}>Reminders are off.</Text>
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
  screen: { flex: 1, backgroundColor: color.page },
  content: { padding: space.xl, paddingBottom: space.huge },
  title: {
    fontFamily: font.semibold,
    fontSize: 28,
    color: color.leaf,
  },
  lede: {
    fontFamily: font.regular,
    fontSize: 15,
    color: color.slate,
    lineHeight: 22,
    marginTop: space.sm,
  },
  cards: { marginTop: space.xl, gap: space.lg },
  // Borderless and porcelain-washed, like a search result card: the fill
  // alone sets each meal's reminder off the page.
  card: {
    backgroundColor: color.porcelainWash,
    borderRadius: 24,
    padding: 20,
    gap: space.lg,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
    fontFamily: font.semibold,
    fontSize: 20,
    lineHeight: 28,
    color: color.ink,
  },
  preview: { gap: space.sm },
  chips: { flexDirection: 'row', gap: space.sm },
  note: {
    fontFamily: font.regular,
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
    fontFamily: font.regular,
    fontSize: 14,
    color: color.ink,
    lineHeight: 20,
  },
  footnote: {
    fontFamily: font.regular,
    fontSize: 13,
    color: color.slate,
    lineHeight: 19,
    marginTop: space.xl,
  },
});
