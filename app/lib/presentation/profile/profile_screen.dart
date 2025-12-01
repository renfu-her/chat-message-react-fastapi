import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import '../../data/api_client.dart';
import '../../data/auth_repository.dart';
import '../../data/upload_repository.dart';
import '../../main.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  late final AuthRepository _authRepo;
  late final UploadRepository _uploadRepo;
  final _nameController = TextEditingController();
  bool _loading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _authRepo = AuthRepository(ApiClient.instance);
    _uploadRepo = UploadRepository(ApiClient.instance);
    final auth = context.read<AuthState>();
    _nameController.text = auth.user?.name ?? '';
  }

  Future<void> _pickAvatar() async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(source: ImageSource.gallery);
    if (picked == null) return;

    setState(() {
      _loading = true;
      _error = null;
    });

    final auth = context.read<AuthState>();
    final user = auth.user;
    if (user == null) return;
    try {
      final url = await _uploadRepo.uploadAvatar(File(picked.path));
      final updated = user.copyWith(avatar: url);
      // backend expects /users/{id}/profile
      await _authRepo.updateProfile(updated);
      if (!mounted) return;
      auth.setUser(updated);
    } catch (e) {
      setState(() {
        _error = e.toString();
      });
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  Future<void> _saveName() async {
    final auth = context.read<AuthState>();
    final user = auth.user;
    if (user == null) return;
    final newName = _nameController.text.trim();
    if (newName.isEmpty || newName == user.name) return;

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final updated = user.copyWith(name: newName);
      await _authRepo.updateProfile(updated);
      if (!mounted) return;
      auth.setUser(updated);
    } catch (e) {
      setState(() {
        _error = e.toString();
      });
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
    final user = context.watch<AuthState>().user!;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Profile'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  radius: 32,
                  backgroundImage:
                      user.avatar.isNotEmpty ? NetworkImage(user.avatar) : null,
                  child: user.avatar.isEmpty ? const Icon(Icons.person) : null,
                ),
                const SizedBox(width: 16),
                ElevatedButton(
                  onPressed: _loading ? null : _pickAvatar,
                  child: const Text('Change avatar'),
                ),
              ],
            ),
            const SizedBox(height: 24),
            TextField(
              controller: _nameController,
              decoration: const InputDecoration(
                labelText: 'Display name',
              ),
            ),
            const SizedBox(height: 12),
            ElevatedButton(
              onPressed: _loading ? null : _saveName,
              child: _loading
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Save'),
            ),
            if (_error != null) ...[
              const SizedBox(height: 8),
              Text(
                _error!,
                style: const TextStyle(color: Colors.red),
              ),
            ],
          ],
        ),
      ),
    );
  }
}


