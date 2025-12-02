import React, { useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useChatStore } from '../../store/useChatStore';
import { useAuthStore } from '../../store/useAuthStore';
import { api } from '../../services/api';
import { User } from '../../types';

export default function UsersScreen() {
  const { users, setUsers } = useChatStore();
  const { user: currentUser } = useAuthStore();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const usersData = await api.getUsers();
      setUsers(usersData);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const handleToggleFavorite = async (targetId: string) => {
    if (!currentUser) return;
    try {
      await api.toggleFavorite(currentUser.id, targetId);
      loadUsers();
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const renderUser = ({ item }: { item: User }) => {
    const isFavorite = currentUser?.favorites.includes(item.id);
    const isBlocked = currentUser?.blocked.includes(item.id);

    return (
      <View style={styles.userItem}>
        <Image
          source={{ uri: item.avatar || 'https://via.placeholder.com/50' }}
          style={styles.avatar}
        />
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.name}</Text>
          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, item.isOnline && styles.statusDotOnline]} />
            <Text style={styles.statusText}>{item.isOnline ? 'Online' : 'Offline'}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleToggleFavorite(item.id)}
        >
          <Text style={styles.actionButtonText}>{isFavorite ? '★' : '☆'}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Users</Text>
      </View>
      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={renderUser}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
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
  list: {
    padding: 8,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#999',
    marginRight: 6,
  },
  statusDotOnline: {
    backgroundColor: '#10b981',
  },
  statusText: {
    color: '#999',
    fontSize: 12,
  },
  actionButton: {
    padding: 8,
  },
  actionButtonText: {
    fontSize: 24,
    color: '#3b82f6',
  },
});
