# Uvicorn + Gunicorn Backend Deployment Guide

## Overview

This guide explains how to deploy the FastAPI backend using **Gunicorn** with **Uvicorn workers** as a systemd service. This setup provides:

- **Production-ready** process management
- **Multiple worker processes** for better concurrency
- **Automatic restarts** on failure
- **Logging** to system log files
- **Graceful shutdowns** for zero-downtime deployments

---

## Architecture

```
┌─────────────────────────────────────────┐
│         Nginx (Reverse Proxy)           │
│     Listens on: 0.0.0.0:443 (HTTPS)     │
└─────────────────┬───────────────────────┘
                  │
                  │ Proxy to
                  ▼
┌─────────────────────────────────────────┐
│    Gunicorn (Process Manager)           │
│    Listens on: 127.0.0.1:8097          │
│    Workers: 8 × UvicornWorker           │
└─────────────────┬───────────────────────┘
                  │
                  │ Manages
                  ▼
┌─────────────────────────────────────────┐
│    Uvicorn Workers (ASGI Server)        │
│    Each handles async requests          │
└─────────────────────────────────────────┘
```

### Why Gunicorn + Uvicorn?

- **Gunicorn**: Master process manager that:
  - Spawns and manages worker processes
  - Handles process restarts on crashes
  - Provides graceful shutdowns
  - Manages logging and signal handling

- **Uvicorn Workers**: ASGI-compatible workers that:
  - Handle async/await FastAPI code efficiently
  - Support WebSocket connections
  - Provide high performance for I/O-bound operations

---

## Prerequisites

1. **Python 3.12+** installed
2. **uv** package manager installed
3. **Virtual environment** created and dependencies installed
4. **MySQL database** configured and accessible
5. **Systemd** available (Linux system)
6. **Log directory** created: `/var/log/uvicorn/`

---

## Step-by-Step Setup

### 1. Create Log Directory

```bash
sudo mkdir -p /var/log/uvicorn
sudo chown ai-tracks-chat:ai-tracks-chat /var/log/uvicorn
sudo chmod 755 /var/log/uvicorn
```

### 2. Install Gunicorn

Ensure `gunicorn` is installed in your virtual environment:

```bash
cd /home/ai-tracks-chat/htdocs/chat.ai-tracks.com/backend
source .venv/bin/activate  # or use uv venv
uv pip install gunicorn
```

Or if using `pyproject.toml`, it should already be included:

```bash
uv sync
```

### 3. Verify Installation

Test Gunicorn manually:

```bash
cd /home/ai-tracks-chat/htdocs/chat.ai-tracks.com/backend
source .venv/bin/activate

# Test run (foreground)
gunicorn main:app \
    -w 2 \
    -k uvicorn.workers.UvicornWorker \
    -b 127.0.0.1:8097 \
    --log-level debug
```

Press `Ctrl+C` to stop. If it runs without errors, proceed to the next step.

### 4. Install Systemd Service

Copy the service file to systemd directory:

```bash
sudo cp deployment/chat-ai-tracks-com-uvicorn-gunicorn.service /etc/systemd/system/
```

### 5. Reload Systemd

```bash
sudo systemctl daemon-reload
```

### 6. Enable Service (Auto-start on boot)

```bash
sudo systemctl enable chat-ai-tracks-com-uvicorn-gunicorn.service
```

### 7. Start Service

```bash
sudo systemctl start chat-ai-tracks-com-uvicorn-gunicorn.service
```

### 8. Check Status

```bash
sudo systemctl status chat-ai-tracks-com-uvicorn-gunicorn.service
```

Expected output should show `active (running)`.

---

## Service Configuration Explained

### Service File Location

```
/etc/systemd/system/chat-ai-tracks-com-uvicorn-gunicorn.service
```

### Configuration Breakdown

#### [Unit] Section

```ini
[Unit]
Description=chat-ai-tracks: Gunicorn with Uvicorn workers to serve chat-react backend (FastAPI)
After=network.target
```

- **Description**: Human-readable service description
- **After**: Start after network is available

#### [Service] Section

```ini
[Service]
User=ai-tracks-chat
Group=ai-tracks-chat
WorkingDirectory=/home/ai-tracks-chat/htdocs/chat.ai-tracks.com/backend
Environment="PATH=/home/ai-tracks-chat/htdocs/chat.ai-tracks.com/backend/.venv/bin:/usr/local/bin:/usr/bin:/bin"
```

- **User/Group**: Run as non-root user for security
- **WorkingDirectory**: Application root directory
- **Environment**: PATH includes virtual environment's `bin` directory

#### Gunicorn Command

```bash
ExecStart=/home/ai-tracks-chat/htdocs/chat.ai-tracks.com/backend/.venv/bin/gunicorn \
    main:app \
    -w 8 \
    -k uvicorn.workers.UvicornWorker \
    -b 127.0.0.1:8097 \
    --threads 4 \
    --worker-connections 1000 \
    --timeout 120 \
    --graceful-timeout 30 \
    --access-logfile /var/log/uvicorn/chat-ai-tracks-access.log \
    --error-logfile /var/log/uvicorn/chat-ai-tracks-error.log \
    --log-level info \
    --capture-output \
    --enable-stdio-inheritance
```

**Parameters Explained:**

| Parameter | Value | Description |
|-----------|-------|-------------|
| `main:app` | Application entry point | `main.py` file, `app` FastAPI instance |
| `-w 8` | 8 workers | Number of worker processes (adjust based on CPU cores) |
| `-k uvicorn.workers.UvicornWorker` | Worker class | Use Uvicorn ASGI workers |
| `-b 127.0.0.1:8097` | Bind address | Listen on localhost port 8097 (Nginx proxies here) |
| `--threads 4` | 4 threads per worker | Optional, uvicorn workers are async by default |
| `--worker-connections 1000` | Max connections | Maximum concurrent connections per worker |
| `--timeout 120` | 120 seconds | Worker timeout (kill unresponsive workers) |
| `--graceful-timeout 30` | 30 seconds | Graceful shutdown timeout |
| `--access-logfile` | Access log path | HTTP request logs |
| `--error-logfile` | Error log path | Error and exception logs |
| `--log-level info` | Logging level | `debug`, `info`, `warning`, `error`, `critical` |
| `--capture-output` | Capture stdout/stderr | Redirect to log files |
| `--enable-stdio-inheritance` | Inherit file descriptors | For systemd integration |

#### Service Management

```ini
Restart=always
RestartSec=3
KillSignal=SIGTERM
Type=notify
NotifyAccess=all
```

- **Restart=always**: Auto-restart on failure
- **RestartSec=3**: Wait 3 seconds before restart
- **KillSignal=SIGTERM**: Graceful shutdown signal
- **Type=notify**: Use systemd notification protocol
- **NotifyAccess=all**: Allow notifications

---

## Worker Count Calculation

### Recommended Formula

```
Workers = (2 × CPU Cores) + 1
```

### Examples

| CPU Cores | Recommended Workers | Our Config |
|-----------|---------------------|------------|
| 2 | 5 | 8 (higher for I/O-bound) |
| 4 | 9 | 8 |
| 8 | 17 | 8 (conservative) |

### For I/O-Bound Applications (Like Chat Apps)

Since chat applications are I/O-bound (waiting for database, WebSocket messages), you can use more workers:

```
Workers = 4 × CPU Cores
```

**Our configuration uses 8 workers**, which is suitable for:
- 2-4 CPU cores
- High I/O load (WebSocket, database queries)
- Many concurrent connections

### Adjusting Worker Count

Edit the service file:

```bash
sudo nano /etc/systemd/system/chat-ai-tracks-com-uvicorn-gunicorn.service
```

Change `-w 8` to your desired number, then:

```bash
sudo systemctl daemon-reload
sudo systemctl restart chat-ai-tracks-com-uvicorn-gunicorn.service
```

---

## Service Management Commands

### Start Service

```bash
sudo systemctl start chat-ai-tracks-com-uvicorn-gunicorn.service
```

### Stop Service

```bash
sudo systemctl stop chat-ai-tracks-com-uvicorn-gunicorn.service
```

### Restart Service

```bash
sudo systemctl restart chat-ai-tracks-com-uvicorn-gunicorn.service
```

### Reload Service (Graceful)

```bash
sudo systemctl reload chat-ai-tracks-com-uvicorn-gunicorn.service
```

**Note**: `reload` sends `HUP` signal to Gunicorn, which gracefully restarts workers without dropping connections. Use this for code updates.

### Check Status

```bash
sudo systemctl status chat-ai-tracks-com-uvicorn-gunicorn.service
```

### View Logs

**Real-time logs (journald):**

```bash
sudo journalctl -u chat-ai-tracks-com-uvicorn-gunicorn.service -f
```

**Access logs:**

```bash
tail -f /var/log/uvicorn/chat-ai-tracks-access.log
```

**Error logs:**

```bash
tail -f /var/log/uvicorn/chat-ai-tracks-error.log
```

### Enable/Disable Auto-start

```bash
# Enable auto-start on boot
sudo systemctl enable chat-ai-tracks-com-uvicorn-gunicorn.service

# Disable auto-start
sudo systemctl disable chat-ai-tracks-com-uvicorn-gunicorn.service
```

---

## Monitoring & Troubleshooting

### Check Process Status

```bash
# View all Gunicorn processes
ps aux | grep gunicorn

# Should show:
# - 1 master process
# - 8 worker processes (if -w 8)
```

### Check Port Binding

```bash
# Verify service is listening on port 8097
sudo netstat -tlnp | grep 8097
# or
sudo ss -tlnp | grep 8097
```

Expected output:
```
tcp  0  0  127.0.0.1:8097  0.0.0.0:*  LISTEN  12345/gunicorn
```

### Test HTTP Endpoint

```bash
# From the server
curl http://127.0.0.1:8097/health

# Expected response:
# {"status":"healthy"}
```

### Common Issues

#### 1. Service Fails to Start

**Check logs:**
```bash
sudo journalctl -u chat-ai-tracks-com-uvicorn-gunicorn.service -n 50
```

**Common causes:**
- Virtual environment path incorrect
- Missing dependencies
- Port 8097 already in use
- Database connection failed
- Permission issues on log directory

#### 2. Workers Keep Restarting

**Check error logs:**
```bash
tail -f /var/log/uvicorn/chat-ai-tracks-error.log
```

**Common causes:**
- Application code errors
- Database connection timeout
- Memory issues (too many workers)
- Import errors

#### 3. High Memory Usage

**Reduce worker count:**
```bash
# Edit service file, change -w 8 to -w 4
sudo systemctl daemon-reload
sudo systemctl restart chat-ai-tracks-com-uvicorn-gunicorn.service
```

#### 4. WebSocket Connections Failing

**Check Nginx configuration:**
- Ensure WebSocket proxy settings are correct
- Verify `Upgrade` and `Connection` headers

**Check Gunicorn logs:**
```bash
tail -f /var/log/uvicorn/chat-ai-tracks-error.log | grep -i websocket
```

#### 5. Timeout Errors

**Increase timeout:**
```bash
# Edit service file, change --timeout 120 to --timeout 300
sudo systemctl daemon-reload
sudo systemctl restart chat-ai-tracks-com-uvicorn-gunicorn.service
```

---

## Performance Tuning

### 1. Worker Connections

For high-traffic applications, increase `--worker-connections`:

```bash
--worker-connections 2000  # Default is 1000
```

### 2. Threads (Optional)

Uvicorn workers are async, but you can add threads for CPU-bound tasks:

```bash
--threads 4  # Current setting
```

**Note**: For pure async FastAPI apps, threads may not be necessary.

### 3. Timeout Settings

Adjust based on your application's response times:

```bash
--timeout 120          # Worker timeout (current)
--graceful-timeout 30  # Shutdown timeout (current)
```

### 4. Logging Level

For production, use `info` or `warning`:

```bash
--log-level info  # Current setting
```

For debugging, temporarily use `debug`:

```bash
--log-level debug
```

---

## Deployment Workflow

### Initial Deployment

1. **Deploy code:**
   ```bash
   cd /home/ai-tracks-chat/htdocs/chat.ai-tracks.com/backend
   git pull  # or your deployment method
   ```

2. **Update dependencies:**
   ```bash
   uv sync
   ```

3. **Run migrations** (if any):
   ```bash
   python init_db.py  # or your migration tool
   ```

4. **Reload service:**
   ```bash
   sudo systemctl reload chat-ai-tracks-com-uvicorn-gunicorn.service
   ```

### Zero-Downtime Deployment

1. **Deploy new code**
2. **Reload service** (graceful restart):
   ```bash
   sudo systemctl reload chat-ai-tracks-com-uvicorn-gunicorn.service
   ```
   
   Gunicorn will:
   - Start new workers with new code
   - Wait for old workers to finish current requests
   - Terminate old workers
   - No dropped connections!

### Full Restart (If Needed)

```bash
sudo systemctl restart chat-ai-tracks-com-uvicorn-gunicorn.service
```

**Warning**: This will drop active connections. Use `reload` when possible.

---

## Integration with Nginx

### Nginx Configuration

Ensure Nginx proxies to `127.0.0.1:8097`:

```nginx
location / {
    proxy_pass http://127.0.0.1:8097;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location /ws {
    proxy_pass http://127.0.0.1:8097;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 86400;
}
```

### Test Nginx Configuration

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## Security Considerations

### 1. Run as Non-Root User

The service runs as `ai-tracks-chat` user (non-root), which is secure.

### 2. Bind to Localhost

Gunicorn binds to `127.0.0.1:8097` (localhost only), not `0.0.0.0`. This means:
- Only local processes can connect
- Nginx (on the same server) can proxy to it
- External connections are blocked (Nginx handles them)

### 3. Firewall

Ensure firewall allows:
- **Port 443** (HTTPS) - for Nginx
- **Port 80** (HTTP) - for Nginx (redirects to 443)
- **Port 8097** should NOT be exposed (localhost only)

### 4. Log Permissions

Log files are owned by `ai-tracks-chat:ai-tracks-chat` with appropriate permissions.

---

## Backup & Recovery

### Backup Service File

```bash
sudo cp /etc/systemd/system/chat-ai-tracks-com-uvicorn-gunicorn.service \
       /home/ai-tracks-chat/backups/
```

### Restore Service File

```bash
sudo cp /home/ai-tracks-chat/backups/chat-ai-tracks-com-uvicorn-gunicorn.service \
       /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl restart chat-ai-tracks-com-uvicorn-gunicorn.service
```

---

## Comparison: Gunicorn vs Direct Uvicorn

### Gunicorn + Uvicorn Workers (Recommended for Production)

✅ **Pros:**
- Process management (auto-restart workers)
- Multiple workers (better concurrency)
- Production-ready logging
- Graceful shutdowns
- Systemd integration

❌ **Cons:**
- Slightly more complex setup
- More memory usage (multiple processes)

### Direct Uvicorn (Development/Simple Deployments)

✅ **Pros:**
- Simpler setup
- Single process (less memory)
- Good for development

❌ **Cons:**
- No automatic worker management
- Single point of failure
- Manual restart required

**Recommendation**: Use Gunicorn + Uvicorn for production.

---

## Additional Resources

- [Gunicorn Documentation](https://docs.gunicorn.org/)
- [Uvicorn Documentation](https://www.uvicorn.org/)
- [FastAPI Deployment Guide](https://fastapi.tiangolo.com/deployment/)
- [Systemd Service Documentation](https://www.freedesktop.org/software/systemd/man/systemd.service.html)

---

## Summary

This setup provides a robust, production-ready deployment for your FastAPI chat application:

- ✅ **8 worker processes** for high concurrency
- ✅ **Automatic restarts** on failure
- ✅ **Graceful shutdowns** for zero-downtime
- ✅ **Comprehensive logging** for monitoring
- ✅ **Systemd integration** for service management
- ✅ **Secure configuration** (non-root, localhost binding)

For questions or issues, check the logs first:

```bash
sudo journalctl -u chat-ai-tracks-com-uvicorn-gunicorn.service -f
tail -f /var/log/uvicorn/chat-ai-tracks-error.log
```

---

**Last Updated**: November 2025

