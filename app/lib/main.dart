import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:provider/provider.dart';

import 'core/models.dart';
import 'data/api_client.dart';
import 'data/auth_repository.dart';
import 'presentation/login/login_screen.dart';
import 'presentation/chat/chat_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  try {
    await dotenv.load(fileName: '.env');
  } catch (e) {
    // .env file not found, use default values from AppConfig
    print('Warning: .env file not found, using default configuration');
  }
  runApp(const ChatApp());
}

class AuthState extends ChangeNotifier {
  User? user;

  bool get isAuthenticated => user != null;

  void setUser(User? value) {
    user = value;
    notifyListeners();
  }

  Future<void> bootstrap() async {
    final repo = AuthRepository(ApiClient.instance);
    try {
      user = await repo.getCurrentUser();
    } catch (_) {
      user = null;
    }
    notifyListeners();
  }
}

class ChatApp extends StatelessWidget {
  const ChatApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthState()),
      ],
      child: const _RootNavigator(),
    );
  }
}

class _RootNavigator extends StatefulWidget {
  const _RootNavigator();

  @override
  State<_RootNavigator> createState() => _RootNavigatorState();
}

class _RootNavigatorState extends State<_RootNavigator> {
  bool _bootstrapped = false;

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    final auth = context.read<AuthState>();
    await auth.bootstrap();
    if (mounted) {
      setState(() {
        _bootstrapped = true;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthState>();
    final isAuthenticated = auth.isAuthenticated;

    return MaterialApp(
      title: 'Chat App',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: Colors.indigo,
          brightness: Brightness.dark,
        ),
        useMaterial3: true,
      ),
      home: !_bootstrapped
          ? const Scaffold(
              body: Center(child: CircularProgressIndicator()),
            )
          : isAuthenticated
              ? const ChatScreen()
              : const LoginScreen(),
    );
  }
}



