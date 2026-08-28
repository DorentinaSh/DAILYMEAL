/**
 * The persistence seam. Everything above this file speaks in plain objects;
 * only this one knows where they are written. Swapping AsyncStorage for
 * expo-sqlite later means rewriting this file and nothing else.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage } from 'zustand/middleware';

export const STORAGE_KEY = 'dailymeal.state.v1';

export const persistStorage = createJSONStorage(() => ({
  getItem: (name: string) => AsyncStorage.getItem(name),
  setItem: (name: string, value: string) => AsyncStorage.setItem(name, value),
  removeItem: (name: string) => AsyncStorage.removeItem(name),
}));
