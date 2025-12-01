import '../core/models.dart';
import 'api_client.dart';

class RoomsRepository {
  RoomsRepository(this._apiClient);

  final ApiClient _apiClient;

  Future<List<Room>> getRooms() async {
    final res = await _apiClient.request<List<dynamic>>('/rooms');
    final data = res.data ?? [];
    return data
        .map(
          (e) => Room.fromJson(e as Map<String, dynamic>),
        )
        .toList();
  }

  Future<Room> createRoom({
    required String name,
    required bool isPrivate,
    String? password,
    String? description,
  }) async {
    final res = await _apiClient.request<Map<String, dynamic>>(
      '/rooms',
      method: 'POST',
      data: {
        'name': name,
        'is_private': isPrivate,
        'password': password,
        'description': description,
      },
    );
    return Room.fromJson(res.data ?? {});
  }

  Future<Room> joinRoom(String roomId, {String? password}) async {
    final res = await _apiClient.request<Map<String, dynamic>>(
      '/rooms/$roomId/join',
      method: 'POST',
      data: {'password': password},
    );
    final roomJson =
        (res.data ?? const {})['room'] as Map<String, dynamic>? ?? {};
    return Room.fromJson(roomJson);
  }

  Future<void> leaveRoom(String roomId) async {
    await _apiClient.request<void>(
      '/rooms/$roomId/leave',
      method: 'POST',
    );
  }

  Future<void> deleteRoom(String roomId) async {
    await _apiClient.request<void>(
      '/rooms/$roomId',
      method: 'DELETE',
    );
  }
}


