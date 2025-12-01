import 'dart:math';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/models.dart';
import '../../data/api_client.dart';
import '../../data/auth_repository.dart';
import '../../main.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _captchaController = TextEditingController();

  bool _isLogin = true;
  bool _loading = false;
  String? _error;

  late int _num1;
  late int _num2;
  late String _operator;

  @override
  void initState() {
    super.initState();
    _generateCaptcha();
  }

  void _generateCaptcha() {
    final rnd = Random();
    final operators = ['+', '-', '*', '/'];
    _num1 = rnd.nextInt(9) + 1;
    _num2 = rnd.nextInt(9) + 1;
    _operator = operators[rnd.nextInt(operators.length)];
    setState(() {
      _captchaController.clear();
    });
  }

  int _expectedResult() {
    switch (_operator) {
      case '+':
        return _num1 + _num2;
      case '-':
        return _num1 - _num2;
      case '*':
        return _num1 * _num2;
      case '/':
        return _num1 ~/ _num2;
      default:
        return 0;
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    final expected = _expectedResult();
    if (int.tryParse(_captchaController.text) != expected) {
      setState(() {
        _error = 'Incorrect verification code';
      });
      _generateCaptcha();
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });

    final authRepo = AuthRepository(ApiClient.instance);
    try {
      (String, User) result;
      if (_isLogin) {
        result = await authRepo.login(
          _emailController.text.trim(),
          _passwordController.text,
        );
      } else {
        result = await authRepo.register(
          _emailController.text.trim(),
          _emailController.text.trim(),
          _passwordController.text,
        );
      }

      final (_, user) = result;
      if (!mounted) return;
      context.read<AuthState>().setUser(user);
    } catch (e) {
      setState(() {
        _error = e.toString();
      });
      _generateCaptcha();
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: Card(
            margin: const EdgeInsets.all(16),
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Form(
                key: _formKey,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      _isLogin ? 'Login' : 'Register',
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _emailController,
                      decoration: const InputDecoration(
                        labelText: 'Email',
                      ),
                      validator: (v) =>
                          (v == null || v.isEmpty) ? 'Required' : null,
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _passwordController,
                      decoration: const InputDecoration(
                        labelText: 'Password',
                      ),
                      obscureText: true,
                      validator: (v) =>
                          (v == null || v.isEmpty) ? 'Required' : null,
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Text('$_num1 $_operator $_num2 = ?'),
                        const SizedBox(width: 8),
                        IconButton(
                          icon: const Icon(Icons.refresh),
                          onPressed: _generateCaptcha,
                        ),
                      ],
                    ),
                    TextFormField(
                      controller: _captchaController,
                      decoration: const InputDecoration(
                        labelText: 'Verification',
                      ),
                      keyboardType: TextInputType.number,
                    ),
                    const SizedBox(height: 16),
                    if (_error != null)
                      Text(
                        _error!,
                        style: const TextStyle(color: Colors.red),
                      ),
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: _loading ? null : _submit,
                        child: _loading
                            ? const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              )
                            : Text(_isLogin ? 'Login' : 'Register'),
                      ),
                    ),
                    const SizedBox(height: 8),
                    TextButton(
                      onPressed: _loading
                          ? null
                          : () {
                              setState(() {
                                _isLogin = !_isLogin;
                              });
                              _generateCaptcha();
                            },
                      child: Text(
                        _isLogin
                            ? 'No account? Register'
                            : 'Already have an account? Login',
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}


