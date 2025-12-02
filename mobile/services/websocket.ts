import { WS_BASE_URL } from '../constants/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/config';

// WebSocket 連接管理
let ws: WebSocket | null = null;
let wsListeners: Set<(event: { type: string; payload: any }) => void> = new Set();
let reconnectAttempts = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let isManualDisconnect = false;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY = 1000; // 初始重連延遲 1 秒
const MAX_RECONNECT_DELAY = 30000; // 最大重連延遲 30 秒

export const connectWebSocket = async () => {
  const token = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
  if (!token) {
    console.warn('No token available for WebSocket connection');
    return;
  }

  // 如果已經連接，不重複連接
  if (ws && ws.readyState === WebSocket.OPEN) {
    console.log('[WebSocket] Already connected');
    return;
  }

  // 如果正在連接中，不重複連接
  if (ws && ws.readyState === WebSocket.CONNECTING) {
    console.log('[WebSocket] Connection in progress');
    return;
  }

  // 清理舊連接
  if (ws) {
    try {
      ws.close();
    } catch (e) {
      // 忽略關閉錯誤
    }
    ws = null;
  }

  try {
    console.log('[WebSocket] Attempting to connect...');
    ws = new WebSocket(`${WS_BASE_URL}/ws?token=${token}`);

    ws.onopen = () => {
      console.log('[WebSocket] Connected successfully');
      reconnectAttempts = 0;
      isManualDisconnect = false;
      // 清理重連定時器
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string);
        console.log('[WebSocket] Received event:', data.type, data.payload);
        // 確保所有監聽器都能收到事件
        wsListeners.forEach(listener => {
          try {
            listener(data);
          } catch (error) {
            console.error('[WebSocket] Error in listener:', error);
          }
        });
      } catch (error) {
        console.error('[WebSocket] Error parsing message:', error, event.data);
      }
    };

    ws.onerror = (error) => {
      console.error('[WebSocket] Connection error:', error);
    };

    ws.onclose = (event) => {
      console.log('[WebSocket] Disconnected', event.code, event.reason);
      ws = null;
      
      // 如果是手動斷開，不重連
      if (isManualDisconnect) {
        console.log('[WebSocket] Manual disconnect, not reconnecting');
        return;
      }
      
      // 嘗試重連
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        // 指數退避：1s, 2s, 4s, 8s... 最多 30s
        const delay = Math.min(RECONNECT_DELAY * Math.pow(2, reconnectAttempts - 1), MAX_RECONNECT_DELAY);
        console.log(`[WebSocket] Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}) in ${delay}ms...`);
        
        reconnectTimer = setTimeout(() => {
          connectWebSocket();
        }, delay);
      } else {
        console.error('[WebSocket] Max reconnection attempts reached');
      }
    };
  } catch (error) {
    console.error('[WebSocket] Failed to create connection:', error);
    ws = null;
  }
};

export const disconnectWebSocket = () => {
  isManualDisconnect = true;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (ws) {
    try {
      ws.close();
    } catch (e) {
      // 忽略關閉錯誤
    }
    ws = null;
  }
  wsListeners.clear();
  reconnectAttempts = 0;
};

export const subscribeToWebSocket = (
  callback: (event: { type: string; payload: any }) => void
): (() => void) => {
  wsListeners.add(callback);
  
  // 如果 WebSocket 未連接，嘗試連接
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    connectWebSocket();
  }
  
  // 返回取消訂閱函數
  return () => {
    wsListeners.delete(callback);
  };
};

export const getWebSocketStatus = (): 'connected' | 'connecting' | 'disconnected' => {
  if (!ws) return 'disconnected';
  if (ws.readyState === WebSocket.OPEN) return 'connected';
  if (ws.readyState === WebSocket.CONNECTING) return 'connecting';
  return 'disconnected';
};

