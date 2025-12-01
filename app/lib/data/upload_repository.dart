import 'dart:io';

import 'package:dio/dio.dart';

import 'api_client.dart';

class UploadRepository {
  UploadRepository(this._apiClient);

  final ApiClient _apiClient;

  Future<String> uploadAvatar(File file) async {
    final formData = FormData.fromMap({
      'file': await MultipartFile.fromFile(file.path),
    });

    final res = await _apiClient.request<Map<String, dynamic>>(
      '/upload/avatar',
      method: 'POST',
      data: formData,
      options: Options(
        headers: {'Content-Type': 'multipart/form-data'},
      ),
    );
    final data = res.data ?? {};
    return data['url'] as String;
  }

  Future<String> uploadMessageImage(File file) async {
    final formData = FormData.fromMap({
      'file': await MultipartFile.fromFile(file.path),
    });

    final res = await _apiClient.request<Map<String, dynamic>>(
      '/upload/message-image',
      method: 'POST',
      data: formData,
      options: Options(
        headers: {'Content-Type': 'multipart/form-data'},
      ),
    );
    final data = res.data ?? {};
    return data['url'] as String;
  }
}


