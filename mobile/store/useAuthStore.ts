import { create } from 'zustand';
import { User } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/config';

interface AuthState {
  user: User | null;
  setUser: (user: User | null) => Promise<void>;
  clearUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: async (user: User | null) => {
    if (user) {
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    }
    set({ user });
  },
  clearUser: async () => {
    await AsyncStorage.removeItem(STORAGE_KEYS.USER);
    set({ user: null });
  },
}));

