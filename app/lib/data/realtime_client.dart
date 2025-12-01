import 'dart:async';
import 'dart:convert';

import 'package:web_socket_channel/web_socket_channel.dart';

import '../core/config.dart';

typedef RealtimeEvent = Map<String, dynamic>;
typedef RealtimeListener = void Function(RealtimeEvent event);

class RealtimeClient {
  RealtimeClient(this._getToken);

  final Future<String?> Function() _getToken;

  WebSocketChannel? _channel;
  final _listeners = <RealtimeListener>{};
  int _reconnectAttempts = 0;
  bool _manualClose = false;

  static const int _maxReconnectAttempts = 10;

  void addListener(RealtimeListener listener) {
    _listeners.add(listener);
  }

  void removeListener(RealtimeListener listener) {
    _listeners.remove(listener);
  }

  Future<void> connect() async {
    final token = await _getToken();
    if (token == null) {
      return;
    }

    if (_channel != null) {
      return;
    }

    _manualClose = false;
    final uri = Uri.parse('${AppConfig.wsBaseUrl}/ws?token=$token');
    _channel = WebSocketChannel.connect(uri);

    _channel!.stream.listen(
      (message) {
        try {
          final data = jsonDecode(message as String) as Map<String, dynamic>;
          for (final listener in _listeners) {
            try {
              listener(data);
            } catch (_) {}
          }
        } catch (_) {
          // ignore parse errors
        }
      },
      onDone: () {
        _channel = null;
        if (!_manualClose) {
          _tryReconnect();
        }
      },
      onError: (_) {
        _channel = null;
        if (!_manualClose) {
          _tryReconnect();
        }
      },
      cancelOnError: true,
    );
  }

  void _tryReconnect() {
    if (_reconnectAttempts >= _maxReconnectAttempts) {
      return;
    }
    _reconnectAttempts++;
    final delay = Duration(
      milliseconds: (1000 * (1 << (_reconnectAttempts - 1))).clamp(1000, 30000),
    );
    Future.delayed(delay, () {
      if (_manualClose) return;
      connect();
    });
  }

  Future<void> disconnect() async {
    _manualClose = true;
    _reconnectAttempts = 0;
    await _channel?.sink.close();
    _channel = null;
    _listeners.clear();
  }
}


