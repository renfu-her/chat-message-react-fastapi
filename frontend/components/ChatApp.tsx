import React, { useState, useEffect, useRef, FormEvent } from 'react';
import { 
  LogOut, Send, Image as ImageIcon, Plus, 
  Lock, Hash, X, User as UserIcon, Settings, Menu, MessageSquare, Trash2,
  Sun, Moon, Star, Ban, ChevronDown, ChevronUp, UserRoundX, MessageSquareWarning, Search
} from 'lucide-react';
import { User, Room, Message } from '../types';
import { api } from '../services/api';
// convertImageToWebP 不再需要，後端會自動轉換為 WebP

interface ChatAppProps {
  currentUser: User;
  onLogout: () => void;
  onUserUpdate: (user: User) => void;
}

const ChatApp: React.FC<ChatAppProps> = ({ currentUser, onLogout, onUserUpdate }) => {
  // State
  const [rooms, setRooms] = useState<Room[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [avatarVersion, setAvatarVersion] = useState(0); // 用於強制圖片重新加載
  
  // UI State
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile sidebar
  const [userListOpen, setUserListOpen] = useState(false); // Mobile user list
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  // Password Modal State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingRoom, setPendingRoom] = useState<Room | null>(null);
  const [joinPassword, setJoinPassword] = useState('');
  const [joinError, setJoinError] = useState('');

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeRoomIdRef = useRef<string | null>(null);

  // Form State for Room Creation
  const [newRoomName, setNewRoomName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [roomPassword, setRoomPassword] = useState('');

  // Sync activeRoomId to Ref for socket listeners
  useEffect(() => {
    activeRoomIdRef.current = activeRoomId;
  }, [activeRoomId]);

  // 監聽 currentUser.avatar 的變化，強制重新加載圖片
  const prevAvatarRef = useRef<string | undefined>(currentUser.avatar);
  useEffect(() => {
    if (currentUser.avatar && currentUser.avatar !== prevAvatarRef.current) {
      setAvatarVersion(prev => prev + 1);
      prevAvatarRef.current = currentUser.avatar;
    }
  }, [currentUser.avatar]);

  // 處理瀏覽器關閉或頁面卸載時標記用戶離線
  useEffect(() => {
    const handleBeforeUnload = () => {
      // 嘗試標記用戶離線（使用 fetch with keepalive）
      const token = localStorage.getItem('chat_token');
      if (token) {
        const url = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'}/auth/logout`;
        
        // 使用 fetch with keepalive 確保請求在頁面關閉時也能發送
        // sendBeacon 不支持自定義 headers，所以不能使用
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
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Initialize Theme
  useEffect(() => {
      const savedTheme = localStorage.getItem('chat_theme') as 'light' | 'dark' | null;
      const initialTheme = savedTheme || 'dark';
      setTheme(initialTheme);
      document.documentElement.className = initialTheme;
  }, []);

  const toggleTheme = () => {
      const newTheme = theme === 'dark' ? 'light' : 'dark';
      setTheme(newTheme);
      localStorage.setItem('chat_theme', newTheme);
      document.documentElement.className = newTheme;
  };

  // Initial Data Load & Socket Subscription
  useEffect(() => {
    const loadData = async () => {
      try {
        // 確保用戶已登入
        const token = localStorage.getItem('chat_token');
        if (!token) {
          console.warn('No token found, skipping data load');
          return;
        }
        
        const [loadedRooms, loadedUsers] = await Promise.all([
          api.getRooms(),
          api.getUsers()
        ]);
        
        setRooms(loadedRooms);
        setUsers(loadedUsers);
      } catch (error) {
        console.error('Failed to load data:', error);
        // 如果是認證錯誤，可能需要重新登入
        if (error instanceof Error && error.message.includes('authenticated')) {
          console.warn('Authentication failed, user may need to login again');
        }
      }
    };
    loadData();

    // Socket Subscription
    const unsubscribe = api.subscribeToSocket((event) => {
      const currentRoomId = activeRoomIdRef.current;
      console.log('[ChatApp] WebSocket event received:', event.type, event.payload);
      
      switch (event.type) {
        case 'NEW_MESSAGE':
        case 'IMAGE_UPLOADED': // 處理圖片上傳事件（與 NEW_MESSAGE 相同處理）
          // 確保消息格式正確
          if (!event.payload || !event.payload.id) {
            console.warn('[ChatApp] Invalid NEW_MESSAGE/IMAGE_UPLOADED payload:', event.payload);
            break;
          }
          
          setMessages(prev => {
             // 如果消息屬於當前房間，添加到消息列表
             if (event.payload.roomId === currentRoomId) {
                // 檢查消息是否已存在（避免重複）
                const exists = prev.some(msg => msg.id === event.payload.id);
                if (exists) {
                  console.log('[ChatApp] Message already exists, skipping:', event.payload.id);
                  return prev;
                }
                console.log('[ChatApp] Adding new message to current room:', event.payload.id, 'type:', event.type);
                
                // 確保 timestamp 是數字
                const message = {
                  ...event.payload,
                  timestamp: typeof event.payload.timestamp === 'string' 
                    ? new Date(event.payload.timestamp).getTime() 
                    : event.payload.timestamp || Date.now()
                };
                
                return [...prev, message];
             } else {
               // 即使不是當前房間的消息，也記錄日誌以便調試
               console.log('[ChatApp] Message received for different room:', event.payload.roomId, 'current:', currentRoomId);
             }
             return prev;
          });
          break;
        case 'ROOM_CREATED':
          setRooms(prev => {
            // 檢查是否已存在（避免重複）
            const exists = prev.some(r => r.id === event.payload.id);
            if (exists) {
              // 如果已存在，更新它而不是跳過
              return prev.map(r => 
                r.id === event.payload.id 
                  ? {
                      id: event.payload.id,
                      name: event.payload.name,
                      isPrivate: event.payload.isPrivate ?? event.payload.is_private ?? false,
                      createdBy: event.payload.createdBy ?? event.payload.created_by,
                      description: event.payload.description,
                    }
                  : r
              );
            }
            // 添加新房間
            return [...prev, {
              id: event.payload.id,
              name: event.payload.name,
              isPrivate: event.payload.isPrivate ?? event.payload.is_private ?? false,
              createdBy: event.payload.createdBy ?? event.payload.created_by,
              description: event.payload.description,
            }];
          });
          break;
        case 'ROOM_UPDATED':
          setRooms(prev => prev.map(r => {
            if (r.id === event.payload.id) {
              return {
                ...r,
                name: event.payload.name,
                isPrivate: event.payload.isPrivate ?? event.payload.is_private,
                createdBy: event.payload.createdBy ?? event.payload.created_by,
                description: event.payload.description,
              };
            }
            return r;
          }));
          break;
        case 'ROOM_DELETED':
          setRooms(prev => prev.filter(r => r.id !== event.payload.roomId));
          if (currentRoomId === event.payload.roomId) {
            setActiveRoomId(null);
            alert("The room you were in has been deleted.");
          }
          break;
        case 'USER_UPDATE':
          setUsers(prev => prev.map(u => {
            if (u.id === event.payload.id) {
              return {
                ...u,
                ...event.payload,
                isOnline: event.payload.isOnline ?? event.payload.is_online ?? u.isOnline,
              };
            }
            return u;
          }));
          if (event.payload.id === currentUser.id) {
            onUserUpdate({
              ...event.payload,
              isOnline: event.payload.isOnline ?? event.payload.is_online ?? currentUser.isOnline,
            });
            // 如果頭像更新了，增加版本號以強制重新加載
            if (event.payload.avatar && event.payload.avatar !== currentUser.avatar) {
              setAvatarVersion(prev => prev + 1);
            }
          }
          break;
        case 'USER_JOINED':
          setUsers(prev => {
            // 如果用戶已存在，更新其狀態；否則添加新用戶
            const existingIndex = prev.findIndex(u => u.id === event.payload.id);
            if (existingIndex >= 0) {
              // 更新現有用戶為在線
              const updated = [...prev];
              updated[existingIndex] = {
                ...updated[existingIndex],
                ...event.payload,
                isOnline: event.payload.isOnline ?? event.payload.is_online ?? true,
              };
              return updated;
            }
            // 添加新用戶
            return [...prev, {
              ...event.payload,
              isOnline: event.payload.isOnline ?? event.payload.is_online ?? true,
            }];
          });
          break;
        case 'USER_LEFT':
          setUsers(prev => prev.map(u => 
            u.id === event.payload.userId 
              ? { ...u, isOnline: false } 
              : u
          ));
          // 如果離線的是當前用戶，也更新當前用戶狀態
          if (event.payload.userId === currentUser.id) {
            onUserUpdate({
              ...currentUser,
              isOnline: false,
            });
          }
          break;
      }
    });

    return () => { unsubscribe(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser.id]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleJoinRoom = async (room: Room) => {
    if (room.id === activeRoomId) return;

    // 如果是私有房間且不是創建者，需要密碼
    if (room.isPrivate && room.createdBy !== currentUser.id) {
        setPendingRoom(room);
        setJoinPassword('');
        setJoinError('');
        setShowPasswordModal(true);
        return;
    }

    // 公開房間或創建者，調用 join API 確保後端記錄
    try {
      await api.joinRoom(room.id);
      await enterRoom(room.id);
    } catch (error) {
      console.error('Failed to join room:', error);
    }
  };

  const submitPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!pendingRoom) return;

    try {
        // joinRoom API 會自動記錄用戶加入房間
        await api.joinRoom(pendingRoom.id, joinPassword);
        await enterRoom(pendingRoom.id);
        setShowPasswordModal(false);
        setPendingRoom(null);
    } catch (error: any) {
        setJoinError(error.message || "Incorrect password");
    }
  };

  const enterRoom = async (roomId: string) => {
    // 如果已經在該房間，不需要重新加入
    if (activeRoomId === roomId) return;
    
    // 如果之前在其他房間，先離開
    if (activeRoomId) {
      try {
        await api.leaveRoom(activeRoomId);
      } catch (error) {
        console.error('Failed to leave previous room:', error);
      }
    }
    
    setActiveRoomId(roomId);
    try {
      // 確保用戶已加入房間（公開房間或創建者會自動加入）
      // 如果是私有房間且不是創建者，應該已經通過 joinRoom API 加入
      const msgs = await api.getMessages(roomId);
      setMessages(msgs);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const handleSendMessage = async (e?: FormEvent) => {
    e?.preventDefault();
    if ((!inputMessage.trim() && !fileInputRef.current?.files?.length) || !activeRoomId) return;

    try {
        await api.sendMessage({
          roomId: activeRoomId,
          senderId: currentUser.id,
          senderName: currentUser.name,
          senderAvatar: currentUser.avatar,
          content: inputMessage,
          type: 'text'
        });
        setInputMessage('');
    } catch (err) {
        console.error(err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeRoomId) return;

    // 創建臨時消息 ID（用於樂觀更新）
    const tempMessageId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // 上傳文件到服務器，獲取 URL
      const imageUrl = await api.uploadMessageImage(file);
      
      // 樂觀更新：立即將圖片消息添加到本地狀態
      const tempMessage: Message = {
        id: tempMessageId,
        roomId: activeRoomId,
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderAvatar: currentUser.avatar,
        content: imageUrl,
        type: 'image',
        timestamp: Date.now()
      };
      
      // 立即添加到消息列表（樂觀更新）
      setMessages(prev => {
        // 檢查是否已存在（避免重複）
        const exists = prev.some(msg => msg.id === tempMessageId);
        if (exists) return prev;
        return [...prev, tempMessage];
      });
      
      // 滾動到底部
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      
      // 發送消息到服務器
      const sentMessage = await api.sendMessage({
        roomId: activeRoomId,
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderAvatar: currentUser.avatar,
        content: imageUrl, // 使用圖片 URL 而不是 base64
        type: 'image'
      });
      
      // 用真實消息替換臨時消息
      setMessages(prev => {
        // 移除臨時消息
        const filtered = prev.filter(msg => msg.id !== tempMessageId);
        // 檢查真實消息是否已存在（可能通過 WebSocket 已經收到）
        const exists = filtered.some(msg => msg.id === sentMessage.id);
        if (exists) return filtered;
        // 添加真實消息
        return [...filtered, {
          ...sentMessage,
          timestamp: new Date(sentMessage.timestamp).getTime()
        }];
      });
      
      console.log('[ChatApp] Image message sent successfully:', sentMessage.id);
    } catch (err: any) {
      console.error("Image upload failed", err);
      
      // 移除臨時消息（如果上傳失敗）
      setMessages(prev => prev.filter(msg => msg.id !== tempMessageId));
      
      alert(err.message || "Failed to upload image");
    } finally {
      if(fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const createRoom = async (e: FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    
    try {
      const newRoom = await api.createRoom({
        name: newRoomName,
        isPrivate,
        password: isPrivate ? roomPassword : undefined,
        createdBy: currentUser.id,
        description: isPrivate ? 'Private Room' : 'Public Room'
      });
      
      // 手動添加到列表（WebSocket 事件可能延遲）
      setRooms(prev => {
        const exists = prev.some(r => r.id === newRoom.id);
        if (exists) return prev;
        return [...prev, newRoom];
      });
      
      setShowCreateRoom(false);
      setNewRoomName('');
      setIsPrivate(false);
      setRoomPassword('');
    } catch (err) {
      console.error("Failed to create room:", err);
      alert("Failed to create room");
    }
  };
  
  const handleDeleteRoom = async (roomId: string) => {
    if (!window.confirm("Are you sure you want to delete this room?")) return;
    try {
        await api.deleteRoom(roomId);
        if (activeRoomId === roomId) setActiveRoomId(null);
    } catch (error) {
        console.error("Failed to delete room", error);
        alert("Could not delete room");
    }
  };

  const handleToggleFavorite = async (targetId: string) => {
      try {
        const updatedUser = await api.toggleFavorite(currentUser.id, targetId);
        onUserUpdate(updatedUser);
      } catch (error) {
        console.error("Failed to toggle favorite", error);
      }
  };

  const handleBlockUser = async (targetId: string) => {
      if(window.confirm("Block this user? They will be removed from Members and moved to your Block Members list.")) {
          try {
            const updatedUser = await api.blockUser(currentUser.id, targetId);
            onUserUpdate(updatedUser);
          } catch (error) {
            console.error("Failed to block user", error);
          }
      }
  };

  const maskEmail = (email: string) => {
    const [name] = email.split('@');
    return `${name}@*****`;
  };

  const currentRoom = rooms.find(r => r.id === activeRoomId);

  // Filter and Group Users
  // Note: currentUser.blocked must be fresh from onUserUpdate for immediate removal to work
  // BLOCKED USERS ARE FILTERED OUT HERE, SO THEY DISAPPEAR FROM THE "MEMBERS" SIDEBAR
  const visibleUsers = users.filter(u => !currentUser.blocked?.includes(u.id));
  const favoriteUsers = visibleUsers.filter(u => currentUser.favorites?.includes(u.id) && u.id !== currentUser.id);
  const otherUsers = visibleUsers.filter(u => !currentUser.favorites?.includes(u.id) && u.id !== currentUser.id);

  // Helper component for user list item
  const UserListItem = ({ user, isFav }: { user: User, isFav: boolean }) => (
    <div className="flex items-center gap-3 p-3 mb-1 bg-hover/20 hover:bg-hover rounded-lg transition border border-transparent hover:border-border-base group">
        <div className="relative">
            <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full object-cover bg-slate-700" />
            {user.isOnline && (
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-paper rounded-full"></span>
            )}
        </div>
        <div className="flex flex-col overflow-hidden flex-1">
            <span className="text-sm font-bold text-txt-main truncate flex items-center gap-1">
                {user.name}
            </span>
            <span className="text-[10px] text-txt-muted opacity-60 truncate">{maskEmail(user.email)}</span>
        </div>
        {/* Actions */}
        <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
            <button 
                onClick={(e) => { e.stopPropagation(); handleToggleFavorite(user.id); }}
                className={`p-1.5 rounded-full hover:bg-paper ${isFav ? 'text-yellow-400' : 'text-txt-muted hover:text-yellow-400'}`}
                title={isFav ? "Remove from Favorites" : "Add to Favorites"}
            >
                <Star size={16} fill={isFav ? "currentColor" : "none"} />
            </button>
            <button 
                onClick={(e) => { e.stopPropagation(); handleBlockUser(user.id); }}
                className="p-1.5 rounded-full hover:bg-paper text-txt-muted hover:text-red-500"
                title="Block User"
            >
                <Ban size={16} />
            </button>
        </div>
    </div>
  );

  return (
    <div className="flex h-screen w-full bg-darker justify-center transition-colors duration-300">
      <div className="flex h-full w-full max-w-[1440px] bg-darker overflow-hidden relative shadow-2xl">
      
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 w-full h-14 bg-paper border-b border-border-base flex items-center justify-between px-4 z-20">
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-txt-main">
            <Menu size={24} />
        </button>
        <h1 className="font-bold text-txt-main truncate">
            {currentRoom?.name || 'Chat App'}
        </h1>
        <button onClick={() => setUserListOpen(!userListOpen)} className="text-txt-main">
            <UserIcon size={24} />
        </button>
      </div>

      {/* LEFT: Room List Sidebar */}
      <aside className={`
        fixed md:relative z-30 w-72 h-full bg-paper border-r border-border-base flex flex-col transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-4 border-b border-border-base flex justify-between items-center">
          <h2 className="text-xl font-bold text-primary">Rooms</h2>
          <div className="flex gap-1">
              <button 
                onClick={() => setShowSearch(true)}
                className="p-2 bg-hover hover:bg-opacity-80 rounded-full transition text-txt-main"
                title="Search Users & History"
              >
                <Search size={18} />
              </button>
              <button 
                onClick={() => setShowCreateRoom(true)}
                className="p-2 bg-hover hover:bg-opacity-80 rounded-full transition text-txt-main"
                title="Create Room"
              >
                <Plus size={18} />
              </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scroll p-2 space-y-2">
          {rooms.map(room => (
            <div key={room.id} className="relative group">
                <button
                onClick={() => handleJoinRoom(room)}
                className={`w-full p-3 rounded-lg flex items-center justify-between transition
                    ${activeRoomId === room.id ? 'bg-primary/20 border border-primary/50 text-txt-main' : 'hover:bg-hover text-txt-muted hover:text-txt-main'}
                `}
                >
                <div className="flex items-center gap-3">
                    {room.isPrivate ? <Lock size={16} /> : <Hash size={16} />}
                    <span className="font-medium truncate">{room.name}</span>
                </div>
                </button>
                
                {currentUser.id === room.createdBy && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteRoom(room.id);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-txt-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition"
                        title="Delete Room"
                    >
                        <Trash2 size={16} />
                    </button>
                )}
            </div>
          ))}
        </div>

        {/* Current User footer */}
        <div className="p-4 border-t border-border-base bg-darker/50 flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setShowSettings(true)} title="Settings & Profile">
                <img 
                    src={currentUser.avatar?.startsWith('data:') 
                        ? `${currentUser.avatar}${avatarVersion > 0 ? `#v${avatarVersion}` : ''}`
                        : `${currentUser.avatar}${currentUser.avatar?.includes('?') ? '&' : '?'}_t=${avatarVersion || Date.now()}`
                    }
                    alt="Me" 
                    className="w-8 h-8 rounded-full bg-slate-600 object-cover" 
                    key={`avatar-${currentUser.id}-${avatarVersion}-${currentUser.avatar?.substring(0, 50)}`}
                    onError={(e) => {
                        // 如果圖片加載失敗，使用默認頭像
                        const target = e.target as HTMLImageElement;
                        target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentUser.name)}`;
                    }}
                />
                <div className="flex flex-col">
                    <span className="text-sm font-bold text-txt-main">{currentUser.name}</span>
                    <span className="text-xs text-txt-muted">{maskEmail(currentUser.email)}</span>
                </div>
            </div>
            <div className="flex items-center gap-1">
                <button 
                    onClick={toggleTheme}
                    className="p-2 text-txt-muted hover:text-primary rounded-full hover:bg-hover transition"
                    title="Toggle Theme"
                >
                    {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                </button>
                <button 
                    onClick={onLogout} 
                    className="p-2 text-txt-muted hover:text-red-400 rounded-full hover:bg-hover transition"
                    title="Logout"
                >
                    <LogOut size={18} />
                </button>
            </div>
        </div>
      </aside>

      {/* CENTER: Chat Area */}
      <main className="flex-1 flex flex-col h-full relative pt-14 md:pt-0 bg-dark">
        {!activeRoomId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-txt-muted bg-dark p-8 text-center">
            <div className="w-20 h-20 bg-paper rounded-full flex items-center justify-center mb-6 shadow-sm">
                <MessageSquare size={40} className="text-txt-muted" />
            </div>
            <h3 className="text-2xl font-bold text-txt-main mb-2">Select a Room</h3>
            <p className="max-w-md">Choose a room from the sidebar to start chatting or create your own private space.</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scroll bg-dark">
              {messages.map((msg) => {
                const isMe = msg.senderId === currentUser.id;
                // If the sender is blocked, do not show message
                if (currentUser.blocked?.includes(msg.senderId)) return null;

                return (
                  <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    <img 
                        src={msg.senderAvatar} 
                        alt={msg.senderName} 
                        className="w-8 h-8 rounded-full object-cover mt-1 flex-shrink-0" 
                    />
                    <div className={`max-w-[75%] md:max-w-[60%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-txt-muted">{msg.senderName}</span>
                        <span className="text-xs text-txt-muted opacity-80">
                            {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                      
                      {msg.type === 'text' ? (
                        <div className={`
                            px-4 py-2 rounded-2xl text-sm leading-relaxed
                            ${isMe ? 'bg-primary text-white rounded-tr-sm' : 'bg-msg-received text-txt-main border border-border-base rounded-tl-sm'}
                        `}>
                            {msg.content}
                        </div>
                      ) : (
                        <div className={`
                            p-1 rounded-lg overflow-hidden border border-border-base
                            ${isMe ? 'bg-primary/20' : 'bg-paper'}
                        `}>
                            <img 
                              src={msg.content} 
                              alt="Shared image" 
                              className="max-w-full rounded h-auto max-h-64 object-contain"
                              onLoad={() => {
                                console.log('[ChatApp] Image loaded successfully:', msg.content);
                              }}
                              onError={(e) => {
                                console.error('[ChatApp] Image load failed:', msg.content);
                                const target = e.target as HTMLImageElement;
                                // 顯示錯誤提示
                                target.style.display = 'none';
                                const errorDiv = document.createElement('div');
                                errorDiv.className = 'text-xs text-red-400 p-2 text-center';
                                errorDiv.textContent = 'Failed to load image';
                                target.parentElement?.appendChild(errorDiv);
                              }}
                            />
                            {msg.id.startsWith('temp-') && (
                              <div className="text-[10px] text-center w-full text-txt-muted mt-1 uppercase tracking-wider animate-pulse">
                                Uploading...
                              </div>
                            )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-paper border-t border-border-base">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <div className="relative">
                        <input 
                            type="file" 
                            accept="image/*" 
                            ref={fileInputRef}
                            className="hidden" 
                            onChange={handleFileUpload}
                        />
                        <button 
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="p-3 text-txt-muted hover:text-primary hover:bg-hover rounded-full transition"
                        >
                            <ImageIcon size={20} />
                        </button>
                    </div>
                    <input
                        type="text"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        placeholder={`Message #${currentRoom?.name || '...'}`}
                        className="flex-1 bg-input-bg border border-border-base text-txt-main rounded-full px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition placeholder-txt-muted"
                    />
                    <button 
                        type="submit"
                        className="p-3 bg-primary hover:bg-blue-600 text-white rounded-full transition shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!inputMessage.trim() && !activeRoomId}
                    >
                        <Send size={20} />
                    </button>
                </form>
            </div>
          </>
        )}
      </main>

      {/* RIGHT: User List Sidebar */}
      <aside className={`
        fixed md:relative z-30 right-0 w-72 h-full bg-paper border-l border-border-base flex flex-col transition-transform duration-300
        ${userListOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
      `}>
         <div className="p-4 border-b border-border-base flex justify-between items-center">
            <h2 className="font-bold text-txt-main">Members</h2>
            <button className="md:hidden text-txt-muted" onClick={() => setUserListOpen(false)}>
                <X size={18} />
            </button>
         </div>
         <div className="flex-1 overflow-y-auto custom-scroll p-2">
             {/* Favorites Section */}
             {favoriteUsers.length > 0 && (
                 <div className="mb-4">
                     <div className="px-3 py-1 text-xs font-semibold text-primary uppercase tracking-wider mb-1 flex items-center gap-1">
                         <Star size={12} fill="currentColor" /> My Favorites
                     </div>
                     {favoriteUsers.map(u => <UserListItem key={u.id} user={u} isFav={true} />)}
                 </div>
             )}

             {/* Other Users */}
             <div className="px-3 py-1 text-xs font-semibold text-txt-muted uppercase tracking-wider mb-1">
                All Users
             </div>
             {otherUsers.length === 0 && favoriteUsers.length === 0 && (
                <div className="text-center text-xs text-txt-muted py-4">No other members visible</div>
             )}
             {otherUsers.map(u => <UserListItem key={u.id} user={u} isFav={false} />)}

             {/* Me */}
             <div className="px-3 mt-2 flex items-center gap-2 opacity-50">
                 <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs text-primary font-bold">ME</div>
                 <span className="text-sm text-txt-muted">You</span>
             </div>
         </div>
      </aside>

      {/* Overlay for mobile sidebars */}
      {(sidebarOpen || userListOpen) && (
        <div 
            className="fixed inset-0 bg-black/50 z-20 md:hidden backdrop-blur-sm"
            onClick={() => { setSidebarOpen(false); setUserListOpen(false); }}
        />
      )}

      {/* Create Room Modal */}
      {showCreateRoom && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm p-4">
            <div className="bg-paper border border-border-base p-6 rounded-2xl w-full max-w-md shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-txt-main">Create New Room</h3>
                    <button onClick={() => setShowCreateRoom(false)} className="text-txt-muted hover:text-txt-main">
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={createRoom} className="space-y-4">
                    <div>
                        <label className="block text-sm text-txt-muted mb-1">Room Name</label>
                        <input 
                            required
                            type="text" 
                            className="w-full bg-input-bg border border-border-base rounded-lg p-3 text-txt-main focus:border-primary focus:outline-none"
                            value={newRoomName}
                            onChange={e => setNewRoomName(e.target.value)}
                        />
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <input 
                            type="checkbox" 
                            id="isPrivate"
                            checked={isPrivate}
                            onChange={e => setIsPrivate(e.target.checked)}
                            className="w-4 h-4 rounded border-gray-600 text-primary focus:ring-primary bg-input-bg"
                        />
                        <label htmlFor="isPrivate" className="text-txt-main">Private Room</label>
                    </div>

                    {isPrivate && (
                        <div>
                            <label className="block text-sm text-txt-muted mb-1">Password</label>
                            <input 
                                required
                                type="password" 
                                className="w-full bg-input-bg border border-border-base rounded-lg p-3 text-txt-main focus:border-primary focus:outline-none"
                                value={roomPassword}
                                onChange={e => setRoomPassword(e.target.value)}
                            />
                        </div>
                    )}
                    
                    <button type="submit" className="w-full py-3 bg-primary hover:bg-blue-600 rounded-lg font-bold text-white transition mt-2">
                        Create
                    </button>
                </form>
            </div>
        </div>
      )}

      {/* Password Modal */}
      {showPasswordModal && pendingRoom && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm p-4">
            <div className="bg-paper border border-border-base p-6 rounded-2xl w-full max-w-sm shadow-2xl">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-txt-main">Locked Room</h3>
                    <button onClick={() => setShowPasswordModal(false)} className="text-txt-muted hover:text-txt-main">
                        <X size={20} />
                    </button>
                </div>
                <p className="text-txt-muted mb-4 text-sm">Enter password for <strong>{pendingRoom.name}</strong></p>
                <form onSubmit={submitPassword} className="space-y-4">
                    <input 
                        autoFocus
                        type="password" 
                        placeholder="Password"
                        className="w-full bg-input-bg border border-border-base rounded-lg p-3 text-txt-main focus:border-primary focus:outline-none"
                        value={joinPassword}
                        onChange={e => setJoinPassword(e.target.value)}
                    />
                    {joinError && <p className="text-red-400 text-sm">{joinError}</p>}
                    <button type="submit" className="w-full py-3 bg-primary hover:bg-blue-600 rounded-lg font-bold text-white transition">
                        Enter Room
                    </button>
                </form>
            </div>
        </div>
      )}

      {/* Unified Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm p-4">
            <SettingsModal 
                user={currentUser} 
                allUsers={users}
                onClose={() => setShowSettings(false)} 
            />
        </div>
      )}
      
      {/* Search Modal */}
      {showSearch && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm p-4">
            <SearchModal 
                currentUser={currentUser} 
                allUsers={users}
                onClose={() => setShowSearch(false)}
                onSelectUser={(u) => { handleToggleFavorite(u.id); }} // Simple shortcut add to fav
                onJoinRoom={enterRoom}
            />
        </div>
      )}

      </div>
    </div>
  );
};

// Search Modal Component
const SearchModal: React.FC<{ 
    currentUser: User, 
    allUsers: User[], 
    onClose: () => void,
    onSelectUser: (user: User) => void,
    onJoinRoom: (roomId: string) => void
}> = ({ currentUser, allUsers, onClose, onSelectUser, onJoinRoom }) => {
    const [query, setQuery] = useState('');
    const [tab, setTab] = useState<'USERS' | 'MESSAGES'>('USERS');
    const [foundMessages, setFoundMessages] = useState<(Message & { roomName: string })[]>([]);
    const [searching, setSearching] = useState(false);

    // Search Users Local
    const filteredUsers = allUsers.filter(u => {
        if (u.id === currentUser.id) return false;
        if (currentUser.blocked?.includes(u.id)) return false;
        const lowerQ = query.toLowerCase();
        return u.name.toLowerCase().includes(lowerQ) || u.email.toLowerCase().includes(lowerQ);
    });

    // Search Messages Backend
    useEffect(() => {
        if (tab === 'MESSAGES' && query.length > 2) {
            setSearching(true);
            const timer = setTimeout(async () => {
                try {
                    const results = await api.searchGlobalMessages(query);
                    setFoundMessages(results);
                } catch (error) {
                    console.error("Search failed", error);
                    setFoundMessages([]);
                } finally {
                    setSearching(false);
                }
            }, 500); // Debounce
            return () => clearTimeout(timer);
        } else {
            setFoundMessages([]);
        }
    }, [query, tab]);

    return (
        <div className="bg-paper border border-border-base rounded-2xl w-full max-w-lg shadow-2xl relative flex flex-col max-h-[85vh] overflow-hidden">
             <div className="p-4 border-b border-border-base">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-txt-main flex items-center gap-2">
                        <Search className="text-primary" /> Search
                    </h3>
                    <button onClick={onClose} className="text-txt-muted hover:text-txt-main">
                        <X size={20} />
                    </button>
                </div>
                <input 
                    autoFocus
                    type="text" 
                    placeholder="Search..."
                    className="w-full bg-input-bg border border-border-base rounded-lg p-3 text-txt-main focus:border-primary focus:outline-none"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                />
            </div>

            <div className="flex border-b border-border-base">
                <button 
                    onClick={() => setTab('USERS')}
                    className={`flex-1 py-3 text-sm font-bold transition ${tab === 'USERS' ? 'text-primary border-b-2 border-primary' : 'text-txt-muted hover:text-txt-main'}`}
                >
                    Users
                </button>
                <button 
                    onClick={() => setTab('MESSAGES')}
                    className={`flex-1 py-3 text-sm font-bold transition ${tab === 'MESSAGES' ? 'text-primary border-b-2 border-primary' : 'text-txt-muted hover:text-txt-main'}`}
                >
                    Chat History
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scroll p-4 bg-darker/30">
                {tab === 'USERS' ? (
                    <div className="space-y-2">
                        {query && filteredUsers.length === 0 && <p className="text-center text-txt-muted">No users found.</p>}
                        {filteredUsers.map(u => (
                            <div key={u.id} className="flex items-center gap-3 p-3 bg-paper rounded-lg border border-border-base">
                                <img src={u.avatar} alt={u.name} className="w-10 h-10 rounded-full" />
                                <div className="flex-1">
                                    <div className="text-sm font-bold text-txt-main">{u.name}</div>
                                    <div className="text-xs text-txt-muted">{u.email.split('@')[0]}@*****</div>
                                </div>
                                <button 
                                    onClick={() => { onSelectUser(u); alert(`Added ${u.name} to favorites`); }}
                                    className="p-2 text-txt-muted hover:text-yellow-400"
                                    title="Add to Favorites"
                                >
                                    <Star size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-3">
                         {query.length < 3 && <p className="text-center text-txt-muted text-sm">Enter at least 3 characters to search history.</p>}
                         {searching && <p className="text-center text-primary text-sm">Searching...</p>}
                         {!searching && query.length >= 3 && foundMessages.length === 0 && <p className="text-center text-txt-muted">No messages found.</p>}
                         
                         {foundMessages.map(msg => (
                             <div 
                                key={msg.id} 
                                onClick={() => { onJoinRoom(msg.roomId); onClose(); }}
                                className="bg-paper p-3 rounded-lg border border-border-base cursor-pointer hover:bg-hover transition"
                             >
                                 <div className="flex justify-between items-center mb-1">
                                     <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                                        {msg.roomName}
                                     </span>
                                     <span className="text-[10px] text-txt-muted">
                                        {new Date(msg.timestamp).toLocaleDateString()}
                                     </span>
                                 </div>
                                 <div className="flex items-center gap-2 mb-1">
                                     <img src={msg.senderAvatar} className="w-4 h-4 rounded-full" />
                                     <span className="text-xs font-semibold text-txt-main">{msg.senderName}</span>
                                 </div>
                                 <p className="text-sm text-txt-muted line-clamp-2">{msg.content}</p>
                             </div>
                         ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// Unified Settings Modal
const SettingsModal: React.FC<{ user: User, allUsers: User[], onClose: () => void, onUserUpdate?: (user: User) => void }> = ({ user, allUsers, onClose, onUserUpdate }) => {
    // Accordion State: 'profile', 'blocked', 'feedback'
    const [activeSection, setActiveSection] = useState<string>('profile');

    return (
        <div className="bg-paper border border-border-base rounded-2xl w-full max-w-md shadow-2xl relative flex flex-col max-h-[85vh] overflow-hidden">
             <div className="p-4 border-b border-border-base flex justify-between items-center sticky top-0 bg-paper z-10">
                <h3 className="text-xl font-bold text-txt-main flex items-center gap-2">
                    <Settings className="text-primary" /> Settings
                </h3>
                <button onClick={onClose} className="text-txt-muted hover:text-txt-main">
                    <X size={20} />
                </button>
            </div>
            
            <div className="overflow-y-auto custom-scroll p-2">
                
                {/* Section 1: My Profile */}
                <AccordionSection 
                    title="My Profile" 
                    icon={<UserIcon size={18} />}
                    isActive={activeSection === 'profile'}
                    onToggle={() => setActiveSection(activeSection === 'profile' ? '' : 'profile')}
                >
                    <ProfileForm user={user} onClose={onClose} onUserUpdate={onUserUpdate} />
                </AccordionSection>

                {/* Section 2: Block Members */}
                <AccordionSection 
                    title={`Block Members (${user.blocked?.length || 0})`} 
                    icon={<UserRoundX size={18} />}
                    isActive={activeSection === 'blocked'}
                    onToggle={() => setActiveSection(activeSection === 'blocked' ? '' : 'blocked')}
                >
                    <BlockedList user={user} allUsers={allUsers} />
                </AccordionSection>

                {/* Section 3: Feedback */}
                <AccordionSection 
                    title="Feedback & Support" 
                    icon={<MessageSquareWarning size={18} />}
                    isActive={activeSection === 'feedback'}
                    onToggle={() => setActiveSection(activeSection === 'feedback' ? '' : 'feedback')}
                >
                    <FeedbackForm user={user} onClose={onClose} />
                </AccordionSection>

            </div>
        </div>
    );
};

// Accordion Helper Components
const AccordionSection: React.FC<{ title: string, icon: React.ReactNode, isActive: boolean, onToggle: () => void, children: React.ReactNode }> = 
({ title, icon, isActive, onToggle, children }) => (
    <div className="border border-border-base rounded-lg mb-2 overflow-hidden bg-darker/30">
        <button 
            onClick={onToggle}
            className={`w-full p-4 flex justify-between items-center transition-colors ${isActive ? 'bg-primary/10 text-primary' : 'bg-paper hover:bg-hover text-txt-main'}`}
        >
            <div className="flex items-center gap-3 font-semibold">
                {icon} {title}
            </div>
            {isActive ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {isActive && (
            <div className="p-4 bg-paper border-t border-border-base animate-in fade-in slide-in-from-top-2 duration-200">
                {children}
            </div>
        )}
    </div>
);

// Inner Components for Settings

const ProfileForm: React.FC<{ user: User, onClose: () => void, onUserUpdate?: (user: User) => void }> = ({ user, onClose, onUserUpdate }) => {
    const [name, setName] = useState(user.name);
    const [avatar, setAvatar] = useState(user.avatar);
    const [password, setPassword] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    
    // 當 user prop 更新時，同步更新本地狀態
    useEffect(() => {
        setName(user.name);
        setAvatar(user.avatar);
    }, [user]);
    
    const handleSave = async (e: FormEvent) => {
        e.preventDefault();
        try {
            // 只發送 name 和 password，avatar 已經通過 uploadAvatar 更新
            // 如果 avatar 是 base64，不發送（應該已經通過 uploadAvatar 上傳為文件）
            const updates: Partial<User> = { name };
            // 只有在 avatar 是 URL（不是 base64）時才發送
            if (avatar && !avatar.startsWith('data:image')) {
                updates.avatar = avatar;
            }
            if (password.trim()) {
                updates.password = password;
            }
            const updatedUser = await api.updateProfile(user.id, updates);
            if (onUserUpdate) {
                onUserUpdate(updatedUser);
            }
            onClose();
            
            // 使用 Promise 來處理 alert，確保在 alert 關閉後執行
            await new Promise<void>((resolve) => {
                alert("Profile updated successfully");
                // 給瀏覽器一點時間處理 alert
                setTimeout(resolve, 50);
            });
            
            // 從服務器重新獲取最新的用戶信息，確保圖片是最新的
            try {
                const latestUser = await api.getCurrentUser();
                if (onUserUpdate) {
                    onUserUpdate(latestUser);
                }
                
                // 強制重新加載頁面以確保所有組件都更新
                // 這會重新加載所有用戶數據、房間數據等，確保頭像在所有地方都更新
                window.location.reload();
            } catch (err) {
                console.warn('Failed to refresh user data, using updated user:', err);
                // 即使獲取失敗，也重新加載頁面以確保數據一致性
                window.location.reload();
            }
        } catch (error) {
            alert('Failed to update profile');
        }
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setIsUploading(true);
            try {
                // 上傳文件到服務器，獲取 URL
                const imageUrl = await api.uploadAvatar(file);
                setAvatar(imageUrl); // 立即更新顯示
            } catch(e: any) {
                console.error('Avatar upload error:', e);
                alert(e.message || "Failed to upload avatar image");
            } finally {
                setIsUploading(false);
            }
        }
    };

    return (
        <form onSubmit={handleSave} className="space-y-4">
            <div className="flex flex-col items-center mb-4">
                <div className="relative group cursor-pointer w-20 h-20 mb-2">
                    {isUploading ? (
                        <div className="w-full h-full rounded-full bg-darker flex items-center justify-center border-2 border-primary">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : (
                        <img 
                            src={avatar} 
                            alt="Profile" 
                            className="w-full h-full rounded-full object-cover border-2 border-primary transition-opacity"
                            key={avatar} // 強制重新渲染以確保圖片更新
                        />
                    )}
                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                        <ImageIcon size={20} className="text-white" />
                    </div>
                    <input 
                        type="file" 
                        className="absolute inset-0 opacity-0 cursor-pointer" 
                        accept="image/*" 
                        onChange={handleAvatarUpload}
                        disabled={isUploading}
                    />
                </div>
                <span className="text-xs text-txt-muted">
                    {isUploading ? "Processing image..." : "Click to change (WebP)"}
                </span>
            </div>

            <div>
                <label className="block text-sm text-txt-muted mb-1">Display Name</label>
                <input 
                    required type="text" value={name} onChange={e => setName(e.target.value)}
                    className="w-full bg-input-bg border border-border-base rounded-lg p-3 text-txt-main focus:border-primary focus:outline-none"
                />
            </div>
             <div>
                <label className="block text-sm text-txt-muted mb-1">Email (Read Only)</label>
                <input 
                    readOnly type="email" value={user.email}
                    className="w-full bg-darker border border-border-base rounded-lg p-3 text-txt-muted cursor-not-allowed"
                />
            </div>
             <div>
                <label className="block text-sm text-txt-muted mb-1">New Password</label>
                <input 
                    type="password" 
                    placeholder="Leave blank to keep unchanged"
                    value={password} 
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-input-bg border border-border-base rounded-lg p-3 text-txt-main focus:border-primary focus:outline-none"
                />
            </div>
            <button type="submit" className="w-full py-2 bg-primary hover:bg-blue-600 rounded-lg font-bold text-white transition mt-2">
                Save Changes
            </button>
        </form>
    );
};

const BlockedList: React.FC<{ user: User, allUsers: User[] }> = ({ user, allUsers }) => {
    const blockedUsers = allUsers.filter(u => user.blocked?.includes(u.id));

    const handleUnblock = async (targetId: string, name: string) => {
        try {
            await api.unblockUser(user.id, targetId);
            alert(`${name} has been unblocked.`);
        } catch (error) {
            console.error("Failed to unblock user", error);
            alert("Failed to unblock user");
        }
    };

    if (blockedUsers.length === 0) {
        return <div className="text-center text-txt-muted py-4">No blocked users.</div>;
    }

    return (
        <div className="space-y-2">
            {blockedUsers.map(u => (
                <div key={u.id} className="flex items-center justify-between p-2 bg-darker rounded-lg border border-border-base">
                    <div className="flex items-center gap-2">
                        <img src={u.avatar} alt={u.name} className="w-8 h-8 rounded-full opacity-60" />
                        <span className="text-sm font-medium text-txt-muted decoration-line-through">{u.name}</span>
                    </div>
                    <button 
                        onClick={() => handleUnblock(u.id, u.name)}
                        className="text-xs px-2 py-1 bg-paper border border-border-base text-txt-main hover:text-green-500 rounded transition"
                    >
                        Unblock
                    </button>
                </div>
            ))}
        </div>
    );
};

const FeedbackForm: React.FC<{ user: User, onClose: () => void }> = ({ user, onClose }) => {
    const [type, setType] = useState('General Feedback');
    const [content, setContent] = useState('');

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!content.trim()) return;

        const recipient = 'renfu.her@gmail.com';
        const subject = `[${type}] Feedback from ${user.name}`;
        const body = `User: ${user.name}\nEmail: ${user.email}\nUser ID: ${user.id}\n\n----- ${type} -----\n\n${content}`;
        
        window.open(`mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
        alert("Your email client has been opened.");
        onClose();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm text-txt-muted mb-1">Feedback Type</label>
                <select 
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full bg-input-bg border border-border-base rounded-lg p-3 text-txt-main focus:border-primary focus:outline-none"
                >
                    <option value="General Feedback">General Feedback / Usage</option>
                    <option value="Bug Report">Report a Bug / Issue</option>
                    <option value="User Report">Report a User</option>
                </select>
            </div>

            <div>
                <label className="block text-sm text-txt-muted mb-1">Details</label>
                <textarea 
                    required
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Details..."
                    className="w-full bg-input-bg border border-border-base rounded-lg p-3 text-txt-main focus:border-primary focus:outline-none min-h-[100px]"
                />
            </div>
            <button type="submit" className="w-full py-2 bg-primary hover:bg-blue-600 rounded-lg font-bold text-white transition">
                Create Email
            </button>
        </form>
    );
};

export default ChatApp;