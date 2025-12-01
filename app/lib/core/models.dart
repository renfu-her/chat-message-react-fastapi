// Domain models mirroring `frontend/types.ts`.

enum MessageType { text, image }

class User {
  final String id;
  final String name;
  final String email;
  final String avatar;
  final bool isOnline;
  final String? bio;
  final List<String> favorites;
  final List<String> blocked;

  User({
    required this.id,
    required this.name,
    required this.email,
    required this.avatar,
    required this.isOnline,
    this.bio,
    List<String>? favorites,
    List<String>? blocked,
  })  : favorites = favorites ?? const [],
        blocked = blocked ?? const [];

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] as String,
      name: json['name'] as String,
      email: json['email'] as String,
      avatar: json['avatar'] as String? ?? '',
      isOnline: (json['is_online'] as bool?) ??
          (json['isOnline'] as bool?) ??
          false,
      bio: json['bio'] as String?,
      favorites: (json['favorites'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          const [],
      blocked: (json['blocked'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          const [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'email': email,
      'avatar': avatar,
      'is_online': isOnline,
      'bio': bio,
      'favorites': favorites,
      'blocked': blocked,
    };
  }

  User copyWith({
    String? name,
    String? avatar,
    bool? isOnline,
    String? bio,
    List<String>? favorites,
    List<String>? blocked,
  }) {
    return User(
      id: id,
      name: name ?? this.name,
      email: email,
      avatar: avatar ?? this.avatar,
      isOnline: isOnline ?? this.isOnline,
      bio: bio ?? this.bio,
      favorites: favorites ?? this.favorites,
      blocked: blocked ?? this.blocked,
    );
  }
}

class Room {
  final String id;
  final String name;
  final bool isPrivate;
  final String? password;
  final String createdBy;
  final String? description;

  Room({
    required this.id,
    required this.name,
    required this.isPrivate,
    required this.createdBy,
    this.password,
    this.description,
  });

  factory Room.fromJson(Map<String, dynamic> json) {
    return Room(
      id: json['id'] as String,
      name: json['name'] as String,
      isPrivate: (json['is_private'] as bool?) ??
          (json['isPrivate'] as bool?) ??
          false,
      createdBy: (json['created_by'] as String?) ??
          (json['createdBy'] as String?) ??
          '',
      password: json['password'] as String?,
      description: json['description'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'is_private': isPrivate,
      'created_by': createdBy,
      'password': password,
      'description': description,
    };
  }
}

class Message {
  final String id;
  final String roomId;
  final String senderId;
  final String senderName;
  final String senderAvatar;
  final String content;
  final MessageType type;
  final int timestamp;
  final bool isTemp;

  Message({
    required this.id,
    required this.roomId,
    required this.senderId,
    required this.senderName,
    required this.senderAvatar,
    required this.content,
    required this.type,
    required this.timestamp,
    this.isTemp = false,
  });

  factory Message.fromJson(Map<String, dynamic> json) {
    final typeStr = (json['type'] as String?) ?? 'text';
    return Message(
      id: json['id'].toString(),
      roomId: (json['room_id'] as String?) ?? (json['roomId'] as String?) ?? '',
      senderId:
          (json['sender_id'] as String?) ?? (json['senderId'] as String?) ?? '',
      senderName: (json['sender_name'] as String?) ??
          (json['senderName'] as String?) ??
          '',
      senderAvatar: (json['sender_avatar'] as String?) ??
          (json['senderAvatar'] as String?) ??
          '',
      content: json['content'] as String? ?? '',
      type: typeStr == 'image' ? MessageType.image : MessageType.text,
      timestamp: (json['timestamp'] as num?)?.toInt() ??
          DateTime.now().millisecondsSinceEpoch,
      isTemp: json['isTemp'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'room_id': roomId,
      'sender_id': senderId,
      'sender_name': senderName,
      'sender_avatar': senderAvatar,
      'content': content,
      'type': type == MessageType.image ? 'image' : 'text',
      'timestamp': timestamp,
    };
  }

  Message copyWith({
    String? id,
    String? content,
    MessageType? type,
    bool? isTemp,
  }) {
    return Message(
      id: id ?? this.id,
      roomId: roomId,
      senderId: senderId,
      senderName: senderName,
      senderAvatar: senderAvatar,
      content: content ?? this.content,
      type: type ?? this.type,
      timestamp: timestamp,
      isTemp: isTemp ?? this.isTemp,
    );
  }
}


