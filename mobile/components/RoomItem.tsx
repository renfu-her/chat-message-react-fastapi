import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Room } from '../types';

interface RoomItemProps {
  room: Room;
  onPress: () => void;
  isActive?: boolean;
}

export default function RoomItem({ room, onPress, isActive }: RoomItemProps) {
  return (
    <TouchableOpacity
      style={[styles.container, isActive && styles.activeContainer]}
      onPress={onPress}
    >
      <View style={styles.iconContainer}>
        {room.isPrivate ? (
          <Ionicons name="lock-closed" size={20} color="#999" />
        ) : (
          <Ionicons name="people" size={20} color="#999" />
        )}
      </View>
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {room.name}
        </Text>
        {room.description && (
          <Text style={styles.description} numberOfLines={1}>
            {room.description}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  activeContainer: {
    backgroundColor: '#3b82f6',
  },
  iconContainer: {
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  name: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  description: {
    color: '#999',
    fontSize: 14,
    marginTop: 2,
  },
});

