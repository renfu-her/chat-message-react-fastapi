import { User, Room, Message } from '../types';

// API 基礎 URL
const API_BASE_URL = 'http://localhost:8000/api';
const WS_BASE_URL = 'ws://localhost:8000';

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

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || `HTTP error! status: ${response.status}`);
  }

  return response.json();
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

// 導出 API 服務
export const api = {
  // 認證
  async login(email: string, password: string): Promise<{ access_token: string; user: User }> {
    const response = await apiRequest<{ access_token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    setToken(response.access_token);
    localStorage.setItem('chat_current_user', JSON.stringify(response.user));
    connectWebSocket();
    
    return response;
  },

  async register(name: string, email: string, password: string): Promise<{ access_token: string; user: User }> {
    const response = await apiRequest<{ access_token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    
    setToken(response.access_token);
    localStorage.setItem('chat_current_user', JSON.stringify(response.user));
    connectWebSocket();
    
    return response;
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
    const response = await apiRequest<User>('/auth/me');
    localStorage.setItem('chat_current_user', JSON.stringify(response));
    return response;
  },

  // 用戶
  async getUsers(): Promise<User[]> {
    return apiRequest<User[]>('/users');
  },

  async updateProfile(userId: string, updates: Partial<User>): Promise<User> {
    const response = await apiRequest<User>(`/users/${userId}/profile`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    localStorage.setItem('chat_current_user', JSON.stringify(response));
    return response;
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

  // WebSocket
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
};

// 如果已有 token，自動連接 WebSocket
if (getToken()) {
  connectWebSocket();
}

