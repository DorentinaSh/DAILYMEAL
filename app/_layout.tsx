// Imported per weight, not from the package root: the root module requires
// every weight it ships, which would bundle megabytes of unused fonts.
import { Archivo_400Regular } from '@expo-google-fonts/archivo/400Regular';
import { Archivo_500Medium } from '@expo-google-fonts/archivo/500Medium';
import { Archivo_600SemiBold } from '@expo-google-fonts/archivo/600SemiBold';
import { DMMono_400Regular } from '@expo-google-fonts/dm-mono/400Regular';
import { DMMono_500Medium } from '@expo-google-fonts/dm-mono/500Medium';
import { Fraunces_600SemiBold } from '@expo-google-fonts/fraunces/600SemiBold';
import { Fraunces_700Bold } from '@expo-google-fonts/fraunces/700Bold';
import * as Notifications from 'expo-notifications';
import { Stack, router } from 'expo-router';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState as RNAppState, View } from 'react-native';

import { MEAL_NOTIFICATION, syncNotifications } from '@/notifications/client';
import { useAppStore } from '@/store/useAppStore';
import { color, font } from '@/ui/theme';

export default function RootLayout() {
  const [fontsReady] = useFonts({
    Fraunces_600SemiBold,
    Fraunces_700Bold,
    Archivo_400Regular,
    Archivo_500Medium,
    Archivo_600SemiBold,
    DMMono_400Regular,
    DMMono_500Medium,
  });

  const hydrated = useAppStore((s) => s.hydrated);
  const refresh = useAppStore((s) => s.refresh);

  // Returning to the app after midnight should show the new day, not the old.
  useEffect(() => {
    const sub = RNAppState.addEventListener('change', (status) => {
      if (status === 'active') refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  // The notification window is rebuilt whenever anything it depends on moves.
  useEffect(() => {
    if (!hydrated) return;
    const run = () => void syncNotifications(useAppStore.getState());
    run();
    return useAppStore.subscribe(run);
  }, [hydrated]);

  // Tapping a reminder opens that meal.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as {
        kind?: string;
        mealId?: string | null;
      };
      if (data?.kind === MEAL_NOTIFICATION && data.mealId) {
        router.push(`/meal/${data.mealId}`);
      }
    });
    return () => sub.remove();
  }, []);

  if (!fontsReady) {
    return <View style={{ flex: 1, backgroundColor: color.porcelain }} />;
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: color.porcelain },
          headerStyle: { backgroundColor: color.porcelain },
          headerShadowVisible: false,
          headerTintColor: color.ink,
          headerTitleStyle: { fontFamily: font.bodyBold, fontSize: 17 },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="meal/[id]" options={{ title: '' }} />
        <Stack.Screen
          name="meal/edit"
          options={{ title: '', presentation: 'modal' }}
        />
      </Stack>
    </>
  );
}
