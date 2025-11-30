/**
 * 混合實時連接管理器
 * 優先使用 WebSocket，失敗時自動降級到 Long Polling
 */

import { User } from '../types';

// API 基礎 URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8000';

// 連接狀態
type ConnectionType = 'websocket' | 'longpolling' | 'disconnected';
type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface RealtimeEvent {
  type: string;
  payload: any;
}

type EventListener = (event: RealtimeEvent) => void;

class RealtimeConnectionManager {
  private connectionType: ConnectionType = 'disconnected';
  private status: ConnectionStatus = 'disconnected';
  private ws: WebSocket | null = null;
  private pollTimer: NodeJS.Timeout | null = null;
  private listeners: Set<EventListener> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private lastMessageId: string | null = null;
  private token: string | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private isManualDisconnect = false;

  /**
   * 連接實時服務
   */
  connect(token: string): void {
    this.token = token;
    this.isManualDisconnect = false;
    this.reconnectAttempts = 0;
    this.tryConnectWebSocket();
  }

  /**
   * 嘗試連接 WebSocket
   */
  private tryConnectWebSocket(): void {
    if (!this.token) {
      console.warn('[Realtime] No token available');
      return;
    }

    this.status = 'connecting';
    this.connectionType = 'websocket';

    try {
      this.ws = new WebSocket(`${WS_BASE_URL}/ws?token=${this.token}`);

      this.ws.onopen = () => {
        console.log('[Realtime] WebSocket connected');
        this.status = 'connected';
        this.connectionType = 'websocket';
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        this.stopPolling();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // 忽略心跳響應
          if (data.type === 'pong') {
            return;
          }

          this.handleEvent(data);
        } catch (error) {
          console.error('[Realtime] Error parsing WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('[Realtime] WebSocket error:', error);
        this.status = 'error';
        // 不立即切換，等待 onclose 事件
      };

      this.ws.onclose = (event) => {
        console.log('[Realtime] WebSocket closed', event.code, event.reason);
        this.stopHeartbeat();
        this.ws = null;

        // 如果是手動斷開，不重連
        if (this.isManualDisconnect) {
          this.status = 'disconnected';
          this.connectionType = 'disconnected';
          return;
        }

        // 如果 WebSocket 連接失敗，降級到 Long Polling
        if (this.reconnectAttempts === 0) {
          console.log('[Realtime] Falling back to Long Polling');
          this.fallbackToLongPolling();
        } else {
          // 嘗試重連 WebSocket
          this.attemptReconnect();
        }
      };
    } catch (error) {
      console.error('[Realtime] Failed to create WebSocket:', error);
      this.fallbackToLongPolling();
    }
  }

  /**
   * 降級到 Long Polling
   */
  private fallbackToLongPolling(): void {
    console.log('[Realtime] Switching to Long Polling');
    this.connectionType = 'longpolling';
    this.status = 'connecting';
    this.startLongPolling();
  }

  /**
   * 開始 Long Polling
   */
  private startLongPolling(): void {
    if (!this.token) {
      return;
    }

    this.stopPolling(); // 確保沒有重複的輪詢

    const poll = async () => {
      try {
        const url = `${API_BASE_URL}/realtime/poll?lastMessageId=${this.lastMessageId || ''}`;
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.token}`,
          },
          // 設置較長的超時時間（30秒）
        });

        if (response.ok) {
          const data = await response.json();
          this.status = 'connected';

          if (data.events && Array.isArray(data.events)) {
            data.events.forEach((event: RealtimeEvent) => {
              this.handleEvent(event);
              // 更新最後的消息 ID
              if (event.payload?.id) {
                this.lastMessageId = event.payload.id;
              }
            });
          }

          // 立即開始下一次輪詢
          this.pollTimer = setTimeout(poll, 100);
        } else if (response.status === 401 || response.status === 403) {
          // Token 無效，停止輪詢
          console.error('[Realtime] Authentication failed');
          this.disconnect();
        } else {
          // 其他錯誤，等待後重試
          this.pollTimer = setTimeout(poll, 2000);
        }
      } catch (error) {
        console.error('[Realtime] Long Polling error:', error);
        // 錯誤時等待後重試
        this.pollTimer = setTimeout(poll, 2000);
      }
    };

    poll();
  }

  /**
   * 停止 Long Polling
   */
  private stopPolling(): void {
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  }

  /**
   * 嘗試重連 WebSocket
   */
  private attemptReconnect(): void {
    if (this.isManualDisconnect) {
      return;
    }

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * this.reconnectAttempts, 10000); // 最多 10 秒

      console.log(`[Realtime] Attempting to reconnect WebSocket (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms...`);

      setTimeout(() => {
        if (!this.isManualDisconnect) {
          this.tryConnectWebSocket();
        }
      }, delay);
    } else {
      // 達到最大重連次數，降級到 Long Polling
      console.log('[Realtime] Max reconnection attempts reached, falling back to Long Polling');
      this.fallbackToLongPolling();
    }
  }

  /**
   * 發送消息（僅 WebSocket 支持）
   */
  send(event: RealtimeEvent): void {
    if (this.connectionType === 'websocket' && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(event));
    } else {
      console.warn('[Realtime] Cannot send message: not connected via WebSocket');
    }
  }

  /**
   * 處理接收到的事件
   */
  private handleEvent(event: RealtimeEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('[Realtime] Error in event listener:', error);
      }
    });
  }

  /**
   * 訂閱事件
   */
  subscribe(listener: EventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * 斷開連接
   */
  disconnect(): void {
    this.isManualDisconnect = true;
    this.stopHeartbeat();
    this.stopPolling();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.status = 'disconnected';
    this.connectionType = 'disconnected';
    this.listeners.clear();
    this.reconnectAttempts = 0;
    this.lastMessageId = null;
  }

  /**
   * 獲取連接狀態
   */
  getStatus(): { type: ConnectionType; status: ConnectionStatus } {
    return {
      type: this.connectionType,
      status: this.status,
    };
  }

  /**
   * 啟動心跳檢測（僅 WebSocket）
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000); // 每 30 秒發送一次心跳
  }

  /**
   * 停止心跳檢測
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}

// 導出單例
export const realtimeConnection = new RealtimeConnectionManager();

