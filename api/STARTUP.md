# Quadratic API Server — Startup Guide

Quick reference for getting the API up and running.

## Prerequisites

- Python 3.8+
- pip (Python package manager)

## Installation (30 seconds)

```bash
cd "Quadratic/api"
pip install -r requirements.txt
```

## Starting the Server

### Default (port 8888)

```bash
python server.py
```

Expected output:
```
[timestamp] INFO     ================================================================================
[timestamp] INFO     Quadratic API Server Starting
[timestamp] INFO     Port: 8888
[timestamp] INFO     Log Level: INFO
[timestamp] INFO     Engines Available: 9/11
[timestamp] INFO     Engine Status: {'portfolio': 'available', 'forecasting': 'available', ...}
[timestamp] INFO     ================================================================================
[timestamp] INFO     Uvicorn running on http://0.0.0.0:8888
```

### Custom Port

```bash
PORT=9000 python server.py
```

### Development Mode (Verbose Logging)

```bash
LOG_LEVEL=DEBUG python server.py
```

## Verify Server is Running

In a new terminal:

```bash
# Option 1: Quick health check
curl http://localhost:8888/

# Option 2: Check all engines
curl http://localhost:8888/api/status

# Option 3: Use the test suite
python test_api.py
```

Expected response:
```json
{
  "status": "ok",
  "data": {
    "message": "Quadratic API is running",
    "engines": 11
  },
  "engine": "system",
  "timestamp": "2026-04-03T12:34:56.789012+00:00"
}
```

## Web UI

Once running, open your browser to:

- **API Documentation (Swagger):** http://localhost:8888/docs
- **Alternative Docs (ReDoc):** http://localhost:8888/redoc

## Integration with OpenClaw & Sentinel

The API is ready for:
- **OpenClaw** to call portfolio and market intelligence endpoints
- **Sentinel** to call threat ranking, anomaly detection, and alert endpoints

No additional configuration needed if running on `localhost:8888`.

To use a different host/port:

1. Update the client configuration to point to your API URL
2. Ensure CORS is configured (currently allows localhost only)

## Stopping the Server

Press `Ctrl+C` in the terminal running `python server.py`.

## Troubleshooting

### "Connection refused" or "Port already in use"

The port is already in use. Either:
1. Stop other services using that port
2. Use a different port: `PORT=9000 python server.py`

### "ModuleNotFoundError: No module named 'fastapi'"

Install dependencies:
```bash
pip install -r requirements.txt
```

### Some engines show "not available" in `/api/status`

This is normal if optional dependencies are missing. The API still works; those specific endpoints will return 503 errors with helpful messages.

To fully enable all engines, install their dependencies:
```bash
pip install riskfolio-lib scikit-learn tensorflow torch
```

### "Permission denied" when running

Make the script executable:
```bash
chmod +x server.py
python server.py
```

## Example Requests

### Portfolio Optimization

```bash
curl -X POST http://localhost:8888/api/portfolio/optimize \
  -H "Content-Type: application/json" \
  -d '{
    "tickers": ["AAPL", "MSFT", "GOOGL"],
    "start": "2024-01-01",
    "method": "CVaR",
    "objective": "MinRisk"
  }'
```

### Anomaly Detection

```bash
curl -X POST http://localhost:8888/api/anomaly/scan \
  -H "Content-Type: application/json" \
  -d '{
    "n": 100,
    "scenario": "default",
    "include_anomalies": true
  }'
```

### Sentinel Configuration

```bash
curl -X POST http://localhost:8888/api/sentinel/config \
  -H "Content-Type: application/json" \
  -d '{
    "threat_threshold": 0.75,
    "anomaly_threshold": 0.65,
    "check_interval_sec": 30,
    "enabled": true
  }'
```

## Next Steps

- Review full API documentation: `README.md`
- Run integration tests: `python test_api.py`
- Configure for production: See `README.md` Deployment section
- Set up monitoring and logging
- Connect OpenClaw and Sentinel clients

---

**Server Ready!** The API is now available at `http://localhost:8888`

For detailed documentation and advanced configuration, see `README.md`.
