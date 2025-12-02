import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useAuthStore } from '../../store/useAuthStore';
import { useChatStore } from '../../store/useChatStore';
import { api } from '../../services/api';
import { subscribeToWebSocket } from '../../services/websocket';
import MessageItem from '../../components/MessageItem';
import RoomItem from '../../components/RoomItem';
import ChatInput from '../../components/ChatInput';
import { Message, Room } from '../../types';
import { router } from 'expo-router';

export default function ChatScreen() {
  const { user } = useAuthStore();
  const {
    rooms,
    messages,
    activeRoomId,
    setRooms,
    setMessages,
    addMessage,
    setActiveRoom,
    addRoom,
  } = useChatStore();
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [roomPassword, setRoomPassword] = useState('');
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadRooms();
    const unsubscribe = subscribeToWebSocket((event) => {
      handleWebSocketEvent(event);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (activeRoomId) {
      loadMessages(activeRoomId);
    }
  }, [activeRoomId]);

  const loadRooms = async () => {
    try {
      const roomsData = await api.getRooms();
      setRooms(roomsData);
      if (roomsData.length > 0 && !activeRoomId) {
        setActiveRoom(roomsData[0].id);
      }
    } catch (error) {
      console.error('Failed to load rooms:', error);
    }
  };

  const loadMessages = async (roomId: string) => {
    try {
      const messagesData = await api.getMessages(roomId);
      setMessages(roomId, messagesData);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const handleWebSocketEvent = (event: { type: string; payload: any }) => {
    switch (event.type) {
      case 'NEW_MESSAGE':
        const message = event.payload as Message;
        addMessage(message.roomId, message);
        if (flatListRef.current) {
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
        break;
      case 'ROOM_CREATED':
        const newRoom = event.payload as Room;
        addRoom(newRoom);
        break;
      case 'ROOM_DELETED':
        // Handle room deletion
        break;
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!activeRoomId || !user) return;

    try {
      const message = await api.sendMessage({
        roomId: activeRoomId,
        senderId: user.id,
        senderName: user.name,
        senderAvatar: user.avatar,
        content: text,
        type: 'text',
      });
      addMessage(activeRoomId, message);
    } catch (error) {
      Alert.alert('Error', 'Failed to send message');
    }
  };

  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) {
      Alert.alert('Error', 'Room name is required');
      return;
    }

    try {
      const room = await api.createRoom({
        name: newRoomName,
        isPrivate: isPrivate,
        password: isPrivate ? roomPassword : undefined,
        createdBy: user?.id || '',
      });
      addRoom(room);
      setActiveRoom(room.id);
      setShowRoomModal(false);
      setNewRoomName('');
      setRoomPassword('');
      setIsPrivate(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create room');
    }
  };

  const currentMessages = activeRoomId ? messages[activeRoomId] || [] : [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chat</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowRoomModal(true)}
        >
          <Text style={styles.createButtonText}>+ New Room</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.roomsList}>
          <FlatList
            data={rooms}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <RoomItem
                room={item}
                onPress={() => setActiveRoom(item.id)}
                isActive={item.id === activeRoomId}
              />
            )}
          />
        </View>

        <View style={styles.chatArea}>
          {activeRoomId ? (
            <>
              <FlatList
                ref={flatListRef}
                data={currentMessages}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <MessageItem message={item} isOwn={item.senderId === user?.id} />
                )}
                onContentSizeChange={() => {
                  flatListRef.current?.scrollToEnd({ animated: true });
                }}
              />
              <ChatInput onSend={handleSendMessage} />
            </>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Select a room to start chatting</Text>
            </View>
          )}
        </View>
      </View>

      <Modal
        visible={showRoomModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowRoomModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New Room</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Room Name"
              placeholderTextColor="#999"
              value={newRoomName}
              onChangeText={setNewRoomName}
            />
            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => setIsPrivate(!isPrivate)}
            >
              <Text style={styles.checkboxText}>
                {isPrivate ? '✓' : ' '} Private Room
              </Text>
            </TouchableOpacity>
            {isPrivate && (
              <TextInput
                style={styles.modalInput}
                placeholder="Password"
                placeholderTextColor="#999"
                value={roomPassword}
                onChangeText={setRoomPassword}
                secureTextEntry
              />
            )}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowRoomModal(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.createButton]}
                onPress={handleCreateRoom}
              >
                <Text style={[styles.modalButtonText, styles.createButtonText]}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#2a2a2a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  createButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
  },
  roomsList: {
    width: 200,
    backgroundColor: '#1a1a1a',
    borderRightWidth: 1,
    borderRightColor: '#333',
    padding: 8,
  },
  chatArea: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#999',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    marginBottom: 12,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkboxText: {
    color: '#fff',
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
  modalButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  cancelButton: {
    backgroundColor: '#333',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
