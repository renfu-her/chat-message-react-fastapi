// API Configuration
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';
export const WS_BASE_URL = process.env.EXPO_PUBLIC_WS_BASE_URL || 'ws://localhost:8000';

// Storage Keys
export const STORAGE_KEYS = {
  TOKEN: 'chat_token',
  USER: 'chat_current_user',
} as const;

