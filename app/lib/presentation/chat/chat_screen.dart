import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/models.dart';
import '../../data/api_client.dart';
import '../../data/messages_repository.dart';
import '../../data/realtime_client.dart';
import '../../data/rooms_repository.dart';
import '../profile/profile_screen.dart';
import '../../main.dart';

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  late final RoomsRepository _roomsRepo;
  late final MessagesRepository _messagesRepo;
  late final RealtimeClient _realtime;

  final _messageController = TextEditingController();

  List<Room> _rooms = [];
  Room? _activeRoom;
  List<Message> _messages = [];
  bool _loadingRooms = true;
  bool _loadingMessages = false;

  @override
  void initState() {
    super.initState();
    _roomsRepo = RoomsRepository(ApiClient.instance);
    _messagesRepo = MessagesRepository(ApiClient.instance);
    _realtime = RealtimeClient(ApiClient.instance.getToken);
    _init();
  }

  Future<void> _init() async {
    await _loadRooms();
    await _realtime.connect();
    _realtime.addListener(_handleRealtime);
  }

  Future<void> _loadRooms() async {
    setState(() {
      _loadingRooms = true;
    });
    try {
      final rooms = await _roomsRepo.getRooms();
      setState(() {
        _rooms = rooms;
        if (_activeRoom == null && rooms.isNotEmpty) {
          _activeRoom = rooms.first;
        }
      });
      if (_activeRoom != null) {
        await _loadMessages(_activeRoom!.id);
      }
    } finally {
      if (mounted) {
        setState(() {
          _loadingRooms = false;
        });
      }
    }
  }

  Future<void> _loadMessages(String roomId) async {
    setState(() {
      _loadingMessages = true;
    });
    try {
      final msgs = await _messagesRepo.getMessages(roomId);
      setState(() {
        _messages = msgs;
      });
    } finally {
      if (mounted) {
        setState(() {
          _loadingMessages = false;
        });
      }
    }
  }

  void _handleRealtime(Map<String, dynamic> event) {
    final type = event['type'] as String?;
    final payload = event['payload'] as Map<String, dynamic>?;
    if (type == null || payload == null) return;

    switch (type) {
      case 'NEW_MESSAGE':
        final msg = Message.fromJson(payload);
        if (_activeRoom != null && msg.roomId == _activeRoom!.id) {
          setState(() {
            _messages = [..._messages, msg];
          });
        }
        break;
      case 'ROOM_CREATED':
      case 'ROOM_UPDATED':
        final room = Room.fromJson(payload);
        setState(() {
          final idx = _rooms.indexWhere((r) => r.id == room.id);
          if (idx >= 0) {
            _rooms[idx] = room;
          } else {
            _rooms = [..._rooms, room];
          }
        });
        break;
      case 'ROOM_DELETED':
        final roomId = payload['id']?.toString();
        if (roomId == null) return;
        setState(() {
          _rooms = _rooms.where((r) => r.id != roomId).toList();
          if (_activeRoom?.id == roomId) {
            _activeRoom = _rooms.isNotEmpty ? _rooms.first : null;
            _messages = [];
          }
        });
        break;
      default:
        break;
    }
  }

  Future<void> _sendText() async {
    final room = _activeRoom;
    if (room == null) return;
    final text = _messageController.text.trim();
    if (text.isEmpty) return;

    _messageController.clear();
    final currentUser = context.read<AuthState>().user!;
    final tempId = 'temp-${DateTime.now().millisecondsSinceEpoch}';
    final tempMessage = Message(
      id: tempId,
      roomId: room.id,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar,
      content: text,
      type: MessageType.text,
      timestamp: DateTime.now().millisecondsSinceEpoch,
      isTemp: true,
    );
    setState(() {
      _messages = [..._messages, tempMessage];
    });

    try {
      final real = await _messagesRepo.sendTextMessage(
        roomId: room.id,
        content: text,
      );
      setState(() {
        _messages = _messages
            .map((m) => m.id == tempId ? real : m)
            .toList();
      });
    } catch (_) {
      // keep temp message for now; could add error state
    }
  }

  @override
  void dispose() {
    _messageController.dispose();
    _realtime.removeListener(_handleRealtime);
    _realtime.disconnect();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthState>().user!;

    return Scaffold(
      appBar: AppBar(
        title: Text('Chat - ${user.name}'),
        actions: [
          IconButton(
            icon: const Icon(Icons.person),
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => const ProfileScreen(),
                ),
              );
            },
          ),
        ],
      ),
      body: Row(
        children: [
          SizedBox(
            width: 260,
            child: Column(
              children: [
                const SizedBox(height: 8),
                const Text('Rooms'),
                const Divider(),
                if (_loadingRooms)
                  const Padding(
                    padding: EdgeInsets.all(8),
                    child: CircularProgressIndicator(),
                  ),
                Expanded(
                  child: ListView.builder(
                    itemCount: _rooms.length,
                    itemBuilder: (context, index) {
                      final room = _rooms[index];
                      final selected = _activeRoom?.id == room.id;
                      return ListTile(
                        selected: selected,
                        title: Text(room.name),
                        subtitle: room.description != null
                            ? Text(room.description!)
                            : null,
                        leading: room.isPrivate
                            ? const Icon(Icons.lock)
                            : const Icon(Icons.chat_bubble_outline),
                        onTap: () async {
                          setState(() {
                            _activeRoom = room;
                          });
                          await _loadMessages(room.id);
                        },
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
          const VerticalDivider(width: 1),
          Expanded(
            child: Column(
              children: [
                if (_activeRoom == null)
                  const Expanded(
                    child: Center(
                      child: Text('Select a room'),
                    ),
                  )
                else ...[
                  Padding(
                    padding: const EdgeInsets.all(8),
                    child: Align(
                      alignment: Alignment.centerLeft,
                      child: Text(
                        _activeRoom!.name,
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                    ),
                  ),
                  const Divider(height: 1),
                  Expanded(
                    child: _loadingMessages
                        ? const Center(
                            child: CircularProgressIndicator(),
                          )
                        : ListView.builder(
                            padding: const EdgeInsets.all(8),
                            itemCount: _messages.length,
                            itemBuilder: (context, index) {
                              final msg = _messages[index];
                              final isMe = msg.senderId == user.id;
                              return Align(
                                alignment: isMe
                                    ? Alignment.centerRight
                                    : Alignment.centerLeft,
                                child: Container(
                                  margin:
                                      const EdgeInsets.symmetric(vertical: 4),
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 12,
                                    vertical: 8,
                                  ),
                                  decoration: BoxDecoration(
                                    color: isMe
                                        ? Colors.blueAccent
                                        : Colors.grey.shade800,
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        msg.senderName,
                                        style: const TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        msg.content,
                                      ),
                                      if (msg.isTemp)
                                        const Padding(
                                          padding: EdgeInsets.only(top: 4),
                                          child: Text(
                                            'Sending...',
                                            style: TextStyle(
                                              fontSize: 10,
                                              color: Colors.white70,
                                            ),
                                          ),
                                        ),
                                    ],
                                  ),
                                ),
                              );
                            },
                          ),
                  ),
                  const Divider(height: 1),
                  Padding(
                    padding: const EdgeInsets.all(8),
                    child: Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _messageController,
                            onSubmitted: (_) => _sendText(),
                            decoration: const InputDecoration(
                              hintText: 'Type a message...',
                              border: OutlineInputBorder(),
                              isDense: true,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        IconButton(
                          icon: const Icon(Icons.send),
                          onPressed: _sendText,
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}


