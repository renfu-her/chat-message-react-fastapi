import 'package:flutter_dotenv/flutter_dotenv.dart';

/// Global configuration for API and WebSocket endpoints.
class AppConfig {
  AppConfig._();

  static String get apiBaseUrl =>
      dotenv.maybeGet('API_BASE_URL') ?? 'http://localhost:8000/api';

  static String get wsBaseUrl =>
      dotenv.maybeGet('WS_BASE_URL') ?? 'ws://localhost:8000';
}


