import { User, Room, Message } from '../types';

// API 基礎 URL - 從環境變量讀取
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8000';

// Token 管理
const getToken = (): string | null => {
  return localStorage.getItem('chat_token');
};

const setToken = (token: string) => {
  localStorage.setItem('chat_token', token);
};

const removeToken = () => {
  localStorage.removeItem('chat_token');
};

// HTTP 請求輔助函數
const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // 創建帶超時的 fetch 請求
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 秒超時

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorDetail = response.statusText;
      try {
        const errorData = await response.json();
        errorDetail = errorData.detail || errorData.message || errorDetail;
      } catch {
        // 如果響應不是 JSON，使用 statusText
      }
      
      // 如果是認證錯誤，清除 token
      if (response.status === 401 || response.status === 403) {
        removeToken();
        localStorage.removeItem('chat_current_user');
        disconnectWebSocket();
      }
      
      throw new Error(errorDetail || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout. Please check your connection and try again.');
    }
    throw error;
  }
};

// WebSocket 連接管理
let ws: WebSocket | null = null;
let wsListeners: Set<(event: { type: string; payload: any }) => void> = new Set();
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

const connectWebSocket = () => {
  const token = getToken();
  if (!token) {
    console.warn('No token available for WebSocket connection');
    return;
  }

  if (ws && ws.readyState === WebSocket.OPEN) {
    return; // Already connected
  }

  try {
    ws = new WebSocket(`${WS_BASE_URL}/ws?token=${token}`);

    ws.onopen = () => {
      console.log('WebSocket connected');
      reconnectAttempts = 0;
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[WebSocket] Received event:', data.type, data.payload);
        wsListeners.forEach(listener => listener(data));
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      ws = null;
      
      // 嘗試重連
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        setTimeout(() => {
          console.log(`Attempting to reconnect WebSocket (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
          connectWebSocket();
        }, 1000 * reconnectAttempts);
      }
    };
  } catch (error) {
    console.error('Failed to create WebSocket connection:', error);
  }
};

const disconnectWebSocket = () => {
  if (ws) {
    ws.close();
    ws = null;
  }
  wsListeners.clear();
};

// 標記用戶離線（用於關閉瀏覽器時）
const markUserOffline = async () => {
  const token = getToken();
  if (!token) return;
  
  try {
    // 使用 sendBeacon 確保請求能夠發送（即使頁面正在關閉）
    const url = `${API_BASE_URL}/auth/logout`;
    const blob = new Blob([JSON.stringify({})], { type: 'application/json' });
    
    if (navigator.sendBeacon) {
      // 使用 sendBeacon（最可靠，但需要後端支持）
      navigator.sendBeacon(url, blob);
    } else {
      // 降級方案：使用 fetch with keepalive
      fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
        keepalive: true, // 確保請求在頁面關閉時也能發送
      }).catch(() => {
        // 忽略錯誤，因為頁面可能已經關閉
      });
    }
  } catch (error) {
    // 忽略錯誤
    console.error('Failed to mark user offline:', error);
  }
};

// 導出 API 服務
export const api = {
  // 認證
  async login(email: string, password: string): Promise<{ access_token: string; user: User }> {
    const response = await apiRequest<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    // 轉換後端格式到前端格式
    const user: User = {
      id: response.user.id,
      name: response.user.name,
      email: response.user.email,
      avatar: response.user.avatar,
      isOnline: response.user.is_online ?? response.user.isOnline ?? false,
      bio: response.user.bio,
      favorites: response.user.favorites || [],
      blocked: response.user.blocked || [],
    };
    
    setToken(response.access_token);
    localStorage.setItem('chat_current_user', JSON.stringify(user));
    connectWebSocket();
    
    return { access_token: response.access_token, user };
  },

  async register(name: string, email: string, password: string): Promise<{ access_token: string; user: User }> {
    const response = await apiRequest<any>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    
    // 轉換後端格式到前端格式
    const user: User = {
      id: response.user.id,
      name: response.user.name,
      email: response.user.email,
      avatar: response.user.avatar,
      isOnline: response.user.is_online ?? response.user.isOnline ?? false,
      bio: response.user.bio,
      favorites: response.user.favorites || [],
      blocked: response.user.blocked || [],
    };
    
    setToken(response.access_token);
    localStorage.setItem('chat_current_user', JSON.stringify(user));
    connectWebSocket();
    
    return { access_token: response.access_token, user };
  },

  async logout(): Promise<void> {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      removeToken();
      localStorage.removeItem('chat_current_user');
      disconnectWebSocket();
    }
  },

  async getCurrentUser(): Promise<User> {
    const response = await apiRequest<any>('/auth/me');
    // 轉換後端格式到前端格式
    const user: User = {
      id: response.id,
      name: response.name,
      email: response.email,
      avatar: response.avatar,
      isOnline: response.is_online ?? response.isOnline ?? false,
      bio: response.bio,
      favorites: response.favorites || [],
      blocked: response.blocked || [],
    };
    localStorage.setItem('chat_current_user', JSON.stringify(user));
    return user;
  },

  // 用戶
  async getUsers(): Promise<User[]> {
    const users = await apiRequest<any[]>('/users');
    // 轉換後端格式到前端格式
    return users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      isOnline: user.is_online ?? user.isOnline ?? false,
      bio: user.bio,
      favorites: user.favorites || [],
      blocked: user.blocked || [],
    }));
  },

  async updateProfile(userId: string, updates: Partial<User>): Promise<User> {
    const response = await apiRequest<any>(`/users/${userId}/profile`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    // 轉換後端格式到前端格式
    const user: User = {
      id: response.id,
      name: response.name,
      email: response.email,
      avatar: response.avatar,
      isOnline: response.is_online ?? response.isOnline ?? false,
      bio: response.bio,
      favorites: response.favorites || [],
      blocked: response.blocked || [],
    };
    localStorage.setItem('chat_current_user', JSON.stringify(user));
    return user;
  },

  async toggleFavorite(userId: string, targetId: string): Promise<User> {
    await apiRequest(`/users/${userId}/favorites/${targetId}`, {
      method: 'POST',
    });
    // 重新獲取用戶信息以獲取更新的收藏列表
    return api.getCurrentUser();
  },

  async blockUser(userId: string, targetId: string): Promise<User> {
    await apiRequest(`/users/${userId}/block/${targetId}`, {
      method: 'POST',
    });
    return api.getCurrentUser();
  },

  async unblockUser(userId: string, targetId: string): Promise<User> {
    await apiRequest(`/users/${userId}/unblock/${targetId}`, {
      method: 'POST',
    });
    return api.getCurrentUser();
  },

  // 房間
  async getRooms(): Promise<Room[]> {
    const rooms = await apiRequest<any[]>('/rooms');
    // 轉換後端格式到前端格式
    return rooms.map(room => ({
      id: room.id,
      name: room.name,
      isPrivate: room.is_private,
      createdBy: room.created_by,
      description: room.description,
    }));
  },

  async createRoom(room: Omit<Room, 'id'>): Promise<Room> {
    const response = await apiRequest<any>('/rooms', {
      method: 'POST',
      body: JSON.stringify({
        name: room.name,
        is_private: room.isPrivate,
        password: room.password,
        description: room.description,
      }),
    });
    
    return {
      id: response.id,
      name: response.name,
      isPrivate: response.is_private,
      createdBy: response.created_by,
      description: response.description,
    };
  },

  async joinRoom(roomId: string, password?: string): Promise<Room> {
    const response = await apiRequest<{ room: any }>(`/rooms/${roomId}/join`, {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
    
    return {
      id: response.room.id,
      name: response.room.name,
      isPrivate: response.room.is_private,
      createdBy: response.room.created_by,
      description: response.room.description,
    };
  },

      async deleteRoom(roomId: string): Promise<void> {
        await apiRequest(`/rooms/${roomId}`, {
          method: 'DELETE',
        });
      },

      async updateRoom(roomId: string, updates: Partial<Room>): Promise<Room> {
        const response = await apiRequest<any>(`/rooms/${roomId}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: updates.name,
            description: updates.description,
            password: updates.password,
          }),
        });
        
        return {
          id: response.id,
          name: response.name,
          isPrivate: response.isPrivate ?? response.is_private,
          createdBy: response.createdBy ?? response.created_by,
          description: response.description,
        };
      },

  // 消息
  async getMessages(roomId: string): Promise<Message[]> {
    const messages = await apiRequest<any[]>(`/messages/rooms/${roomId}`);
    return messages.map(msg => ({
      id: msg.id,
      roomId: msg.room_id,
      senderId: msg.sender_id,
      senderName: msg.sender_name,
      senderAvatar: msg.sender_avatar,
      content: msg.content,
      type: msg.type,
      timestamp: new Date(msg.timestamp).getTime(),
    }));
  },

  async sendMessage(message: Omit<Message, 'id' | 'timestamp'>): Promise<Message> {
    const response = await apiRequest<any>('/messages', {
      method: 'POST',
      body: JSON.stringify({
        room_id: message.roomId,
        content: message.content,
        type: message.type,
      }),
    });
    
    return {
      id: response.id,
      roomId: response.room_id,
      senderId: response.sender_id,
      senderName: response.sender_name,
      senderAvatar: response.sender_avatar,
      content: response.content,
      type: response.type,
      timestamp: new Date(response.timestamp).getTime(),
    };
  },

  async searchGlobalMessages(query: string): Promise<(Message & { roomName: string })[]> {
    const messages = await apiRequest<any[]>(`/messages/search?query=${encodeURIComponent(query)}`);
    return messages.map(msg => ({
      id: msg.id,
      roomId: msg.room_id,
      roomName: msg.room_name,
      senderId: msg.sender_id,
      senderName: msg.sender_name,
      senderAvatar: msg.sender_avatar,
      content: msg.content,
      type: msg.type,
      timestamp: new Date(msg.timestamp).getTime(),
    }));
  },

  // WebSocket (舊版，保留向後兼容)
  subscribeToSocket(callback: (event: { type: string; payload: any }) => void): () => void {
    wsListeners.add(callback);
    
    // 如果 WebSocket 未連接，嘗試連接
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      connectWebSocket();
    }
    
    // 返回取消訂閱函數
    return () => {
      wsListeners.delete(callback);
    };
  },

  // 混合實時連接（推薦使用）
  subscribeToRealtime(callback: (event: { type: string; payload: any }) => void): () => void {
    // 動態導入混合連接管理器
    import('./realtimeConnection').then(({ realtimeConnection }) => {
      const token = getToken();
      if (token) {
        realtimeConnection.connect(token);
      }
      
      // 訂閱事件
      return realtimeConnection.subscribe(callback);
    }).catch((error) => {
      console.error('[API] Failed to load realtime connection:', error);
      // 降級到舊版 WebSocket
      return this.subscribeToSocket(callback);
    });
    
    // 返回取消訂閱函數（簡化處理，實際應該從 realtimeConnection 返回）
    return () => {
      wsListeners.delete(callback);
    };
  },

  // 獲取實時連接狀態
  async getRealtimeStatus(): Promise<{ type: string; status: string }> {
    try {
      const { realtimeConnection } = await import('./realtimeConnection');
      return realtimeConnection.getStatus();
    } catch {
      return { type: 'websocket', status: ws?.readyState === WebSocket.OPEN ? 'connected' : 'disconnected' };
    }
  },
};

// 不在模塊加載時自動連接 WebSocket
// WebSocket 將在登入/註冊成功後由 api.login 或 api.register 調用 connectWebSocket()

