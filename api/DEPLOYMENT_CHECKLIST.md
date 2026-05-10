# Quadratic API Server — Deployment Checklist

Complete this checklist before deploying to production.

## Pre-Deployment

- [ ] Run local tests: `python test_api.py`
- [ ] Verify all critical engines are available in `/api/status`
- [ ] Test each endpoint with sample data
- [ ] Review logs for warnings or errors
- [ ] Check Python version compatibility (3.8+)

## Security Configuration

- [ ] Update CORS `allow_origins` to restrict to your domain(s)
- [ ] Consider adding API key authentication to sensitive endpoints
- [ ] Disable detailed error messages in production (`include_traceback=False`)
- [ ] Use HTTPS (reverse proxy with nginx/Apache)
- [ ] Implement rate limiting
- [ ] Validate all user inputs server-side
- [ ] Store sensitive config in environment variables (not hardcoded)

## Performance & Monitoring

- [ ] Set up centralized logging (Sentry, Datadog, ELK, etc.)
- [ ] Configure monitoring/alerting for engine failures
- [ ] Set up health check endpoint monitoring
- [ ] Test load capacity with expected traffic volume
- [ ] Use production ASGI server (Gunicorn + Uvicorn)
- [ ] Consider caching for frequently-called endpoints
- [ ] Set appropriate timeouts for long-running operations

## Deployment Methods

### Option 1: Docker (Recommended)

```bash
# Build
docker build -t quadratic-api:1.0.0 .

# Push to registry
docker push your-registry/quadratic-api:1.0.0

# Deploy with container orchestration
# (Kubernetes, Docker Compose, etc.)
```

### Option 2: Traditional Server

```bash
# Install
pip install gunicorn uvicorn fastapi pydantic

# Run with Gunicorn (4 workers)
gunicorn -w 4 -k uvicorn.workers.UvicornWorker \
  api.server:app \
  --bind 0.0.0.0:8888 \
  --access-logfile - \
  --error-logfile -
```

### Option 3: Systemd Service (Linux)

Create `/etc/systemd/system/quadratic-api.service`:

```ini
[Unit]
Description=Quadratic API Server
After=network.target

[Service]
Type=simple
User=quadratic
WorkingDirectory=/opt/quadratic/api
Environment="PORT=8888"
Environment="LOG_LEVEL=INFO"
ExecStart=/usr/bin/python3 /opt/quadratic/api/server.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl daemon-reload
sudo systemctl enable quadratic-api
sudo systemctl start quadratic-api
sudo systemctl status quadratic-api
```

## Database & Persistence

If using Sentinel with persistent state:

- [ ] Set up PostgreSQL or compatible database
- [ ] Create tables for alerts, config, audit logs
- [ ] Implement database connection pooling
- [ ] Set up automated backups
- [ ] Test disaster recovery procedures

## Integration Testing

- [ ] Test with OpenClaw client
- [ ] Test with Sentinel client
- [ ] Verify all real-time data feeds are working
- [ ] Test failover scenarios
- [ ] Load test with expected concurrent users

## Post-Deployment

- [ ] Monitor server logs continuously
- [ ] Verify all endpoints are responding
- [ ] Check engine status regularly
- [ ] Test automated alerts
- [ ] Document any customizations or patches
- [ ] Set up on-call rotation for alerts

## Rollback Plan

- [ ] Document current production configuration
- [ ] Keep previous Docker image tags available
- [ ] Have database rollback scripts ready
- [ ] Test rollback procedure in staging
- [ ] Define rollback trigger criteria

## Documentation

- [ ] Update API documentation with production URL
- [ ] Document any environment-specific configuration
- [ ] Create runbooks for common issues
- [ ] Document incident response procedures
- [ ] Maintain change log

---

**Template Version:** 1.0
**Last Updated:** April 2026
