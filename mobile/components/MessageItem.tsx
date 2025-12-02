import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Message } from '../types';

interface MessageItemProps {
  message: Message;
  isOwn: boolean;
}

export default function MessageItem({ message, isOwn }: MessageItemProps) {
  return (
    <View style={[styles.container, isOwn && styles.ownContainer]}>
      {!isOwn && (
        <Image
          source={{ uri: message.senderAvatar || 'https://via.placeholder.com/40' }}
          style={styles.avatar}
        />
      )}
      <View style={[styles.messageContent, isOwn && styles.ownMessageContent]}>
        {!isOwn && <Text style={styles.senderName}>{message.senderName}</Text>}
        {message.type === 'image' ? (
          <Image source={{ uri: message.content }} style={styles.image} />
        ) : (
          <Text style={[styles.text, isOwn && styles.ownText]}>{message.content}</Text>
        )}
        <Text style={[styles.timestamp, isOwn && styles.ownTimestamp]}>
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: 4,
    paddingHorizontal: 12,
    alignItems: 'flex-end',
  },
  ownContainer: {
    flexDirection: 'row-reverse',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  messageContent: {
    maxWidth: '70%',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 10,
  },
  ownMessageContent: {
    backgroundColor: '#3b82f6',
  },
  senderName: {
    color: '#999',
    fontSize: 12,
    marginBottom: 4,
  },
  text: {
    color: '#fff',
    fontSize: 16,
  },
  ownText: {
    color: '#fff',
  },
  image: {
    width: 200,
    height: 200,
    borderRadius: 8,
    marginBottom: 4,
  },
  timestamp: {
    color: '#999',
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  ownTimestamp: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
});

