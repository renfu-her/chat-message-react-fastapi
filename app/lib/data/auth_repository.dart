import 'package:dio/dio.dart';

import '../core/models.dart';
import 'api_client.dart';

class AuthRepository {
  AuthRepository(this._apiClient);

  final ApiClient _apiClient;

  Future<(String token, User user)> login(
    String email,
    String password,
  ) async {
    final res = await _apiClient.request<Map<String, dynamic>>(
      '/auth/login',
      method: 'POST',
      data: {'email': email, 'password': password},
    );

    final data = res.data ?? {};
    final user = User.fromJson(data['user'] as Map<String, dynamic>);
    final token = data['access_token'] as String;
    await _apiClient.setToken(token);
    return (token, user);
  }

  Future<(String token, User user)> register(
    String name,
    String email,
    String password,
  ) async {
    final res = await _apiClient.request<Map<String, dynamic>>(
      '/auth/register',
      method: 'POST',
      data: {'name': name, 'email': email, 'password': password},
    );

    final data = res.data ?? {};
    final user = User.fromJson(data['user'] as Map<String, dynamic>);
    final token = data['access_token'] as String;
    await _apiClient.setToken(token);
    return (token, user);
  }

  Future<User> getCurrentUser() async {
    final res = await _apiClient.request<Map<String, dynamic>>(
      '/auth/me',
      method: 'GET',
    );
    final data = res.data ?? {};
    return User.fromJson(data);
  }

  Future<void> logout() async {
    try {
      await _apiClient.request<void>(
        '/auth/logout',
        method: 'POST',
      );
    } on DioException {
      // Ignore network errors on logout.
    }
    await _apiClient.clearToken();
  }

  Future<User> updateProfile(User user) async {
    final res = await _apiClient.request<Map<String, dynamic>>(
      '/users/${user.id}/profile',
      method: 'PUT',
      data: user.toJson(),
    );
    return User.fromJson(res.data ?? {});
  }
}


