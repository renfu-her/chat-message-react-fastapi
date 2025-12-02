import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Room, Message } from '../types';
import { API_BASE_URL, WS_BASE_URL, STORAGE_KEYS } from '../constants/config';

// Token 管理
const getToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
  } catch (error) {
    console.error('Error getting token:', error);
    return null;
  }
};

const setToken = async (token: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, token);
  } catch (error) {
    console.error('Error setting token:', error);
  }
};

const removeToken = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.TOKEN);
    await AsyncStorage.removeItem(STORAGE_KEYS.USER);
  } catch (error) {
    console.error('Error removing token:', error);
  }
};

// HTTP 請求輔助函數
const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const token = await getToken();
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
        await removeToken();
        // WebSocket 斷開會在 websocket.ts 中處理
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
    
    await setToken(response.access_token);
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    
    // WebSocket 連接會在 websocket.ts 中處理
    
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
    
    await setToken(response.access_token);
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    
    return { access_token: response.access_token, user };
  },

  async logout(): Promise<void> {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await removeToken();
      // WebSocket 斷開會在 websocket.ts 中處理
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
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
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

  async uploadAvatar(uri: string, type: string = 'image/jpeg'): Promise<string> {
    const token = await getToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const formData = new FormData();
    formData.append('file', {
      uri,
      type,
      name: 'avatar.jpg',
    } as any);

    const response = await fetch(`${API_BASE_URL}/upload/avatar`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    // 返回完整的 URL（data.url 已經是 /api/uploads/... 格式）
    const baseUrl = API_BASE_URL.replace('/api', '');
    return data.url.startsWith('http') ? data.url : `${baseUrl}${data.url}`;
  },

  async uploadMessageImage(uri: string, type: string = 'image/jpeg'): Promise<string> {
    const token = await getToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const formData = new FormData();
    formData.append('file', {
      uri,
      type,
      name: 'message-image.jpg',
    } as any);

    const response = await fetch(`${API_BASE_URL}/upload/message-image`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    // 返回完整的 URL（data.url 已經是 /api/uploads/... 格式）
    const baseUrl = API_BASE_URL.replace('/api', '');
    return data.url.startsWith('http') ? data.url : `${baseUrl}${data.url}`;
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
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
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

  async leaveRoom(roomId: string): Promise<void> {
    await apiRequest(`/rooms/${roomId}/leave`, {
      method: 'POST',
    });
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
};

