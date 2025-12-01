import '../core/models.dart';
import 'api_client.dart';

class MessagesRepository {
  MessagesRepository(this._apiClient);

  final ApiClient _apiClient;

  Future<List<Message>> getMessages(String roomId) async {
    final res = await _apiClient.request<List<dynamic>>(
      '/messages',
      queryParameters: {'room_id': roomId},
    );
    final data = res.data ?? [];
    return data
        .map(
          (e) => Message.fromJson(e as Map<String, dynamic>),
        )
        .toList();
  }

  Future<Message> sendTextMessage({
    required String roomId,
    required String content,
  }) async {
    final res = await _apiClient.request<Map<String, dynamic>>(
      '/messages',
      method: 'POST',
      data: {
        'room_id': roomId,
        'content': content,
        'type': 'text',
      },
    );
    return Message.fromJson(res.data ?? {});
  }

  Future<Message> sendImageMessage({
    required String roomId,
    required String imageUrl,
  }) async {
    final res = await _apiClient.request<Map<String, dynamic>>(
      '/messages',
      method: 'POST',
      data: {
        'room_id': roomId,
        'content': imageUrl,
        'type': 'image',
      },
    );
    return Message.fromJson(res.data ?? {});
  }
}


