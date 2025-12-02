import React, { useEffect, useState } from 'react';
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
import { useChatStore } from '../../store/useChatStore';
import { api } from '../../services/api';
import RoomItem from '../../components/RoomItem';
import { Room } from '../../types';
import { router } from 'expo-router';

export default function RoomsScreen() {
  const { rooms, setRooms, addRoom, removeRoom } = useChatStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [roomPassword, setRoomPassword] = useState('');

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    try {
      const roomsData = await api.getRooms();
      setRooms(roomsData);
    } catch (error) {
      console.error('Failed to load rooms:', error);
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
        createdBy: '', // Will be set by backend
      });
      addRoom(room);
      setShowCreateModal(false);
      setNewRoomName('');
      setRoomPassword('');
      setIsPrivate(false);
      Alert.alert('Success', 'Room created successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create room');
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    Alert.alert('Delete Room', 'Are you sure you want to delete this room?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteRoom(roomId);
            removeRoom(roomId);
            Alert.alert('Success', 'Room deleted successfully');
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to delete room');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Rooms</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Text style={styles.createButtonText}>+ New</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={rooms}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <RoomItem
            room={item}
            onPress={() => router.push('/(tabs)/chat')}
            isActive={false}
          />
        )}
        contentContainerStyle={styles.list}
      />

      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCreateModal(false)}
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
                onPress={() => setShowCreateModal(false)}
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
  title: {
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
  list: {
    padding: 8,
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
