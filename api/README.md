# Quadratic API Server

FastAPI backend that exposes all Quadratic analytical engines as REST endpoints. This is the single unified API that OpenClaw and Sentinel call.

## Quick Start

### Install Dependencies

```bash
cd "Quadratic/api"
pip install -r requirements.txt
```

### Run the Server

```bash
python server.py
```

The server starts on `http://localhost:8888` by default.

To use a custom port:

```bash
PORT=9000 python server.py
```

## API Documentation

Once running, visit:
- **Swagger UI:** `http://localhost:8888/docs`
- **ReDoc:** `http://localhost:8888/redoc`

## Response Format

All endpoints return a consistent JSON structure:

```json
{
  "status": "ok",
  "data": { /* payload */ },
  "engine": "engine_name",
  "timestamp": "2026-04-03T12:34:56.789012+00:00"
}
```

Error responses:

```json
{
  "status": "error",
  "message": "Detailed error message",
  "engine": "engine_name",
  "timestamp": "2026-04-03T12:34:56.789012+00:00"
}
```

## Endpoints

### Health & Status

- `GET /` — Basic health check
- `GET /api/status` — Status of all engines

### Portfolio Optimization

- `POST /api/portfolio/optimize` — Optimize portfolio (CVaR, risk parity, etc.)
- `GET /api/portfolio/returns?tickers=AAPL,MSFT&start=2024-01-01` — Get historical returns

**Example:**

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

### Forecasting

- `POST /api/forecast/{symbol}` — Forecast a single symbol
- `POST /api/forecast/multi` — Forecast multiple symbols

**Example:**

```bash
curl -X POST http://localhost:8888/api/forecast/AAPL \
  -H "Content-Type: application/json" \
  -d '{
    "start": "2024-01-01",
    "horizon": 30,
    "model_key": "bolt-small"
  }'
```

### Market Data

- `GET /api/market/ohlcv/{symbol}?start=2024-01-01` — Get OHLCV data

### Anomaly Detection

- `POST /api/anomaly/scan` — Scan for anomalies in entity dataset
- `POST /api/anomaly/analyze` — Analyze specific entities

**Example:**

```bash
curl -X POST http://localhost:8888/api/anomaly/scan \
  -H "Content-Type: application/json" \
  -d '{
    "n": 100,
    "scenario": "default",
    "include_anomalies": true
  }'
```

### Threat Analysis

- `POST /api/threat/rank` — Rank entities by threat score

### Clustering

- `POST /api/clustering/dbscan` — Cluster entities using DBSCAN

### Link Analysis

- `POST /api/links/graph` — Build entity relationship graph

### Kalman Filtering

- `POST /api/kalman/track` — Run Kalman filter on track data

### Explainability

- `POST /api/explain/threat` — Explain threat score attribution

### Market Intelligence

- `GET /api/predictions/scan` — Scan prediction markets
- `GET /api/sports/scores/{league}` — Get live sports scores

### Sentinel Configuration

- `GET /api/sentinel/status` — Get sentinel operational status
- `POST /api/sentinel/config` — Update sentinel thresholds
- `GET /api/sentinel/alerts` — Get recent alerts

**Example:**

```bash
curl -X POST http://localhost:8888/api/sentinel/config \
  -H "Content-Type: application/json" \
  -d '{
    "threat_threshold": 0.75,
    "anomaly_threshold": 0.65,
    "check_interval_sec": 30
  }'
```

## Engine Status

The `/api/status` endpoint shows which engines are available:

```bash
curl http://localhost:8888/api/status
```

Possible engine statuses:
- `available` — Engine loaded successfully
- `import_error: ...` — Missing dependencies or module not found
- `error: ...` — Unexpected error during load

Engines that fail to load gracefully degrade, returning 503 errors with helpful messages.

## Architecture

### Engine Integration

Each engine is wrapped with error handling and graceful fallback. Engines are imported at startup in `server.py`:

```python
portfolio_engine = _import_engine("portfolio", "portfolio")
forecasting_engine = _import_engine("forecasting", "forecasting")
# ... etc
```

If an engine fails to import, the API continues to run; that specific endpoint returns 503.

### Data Feeds

Three main data feed modules provide market, AIS, and ML benchmark data:

- `market_data.py` — Stock/crypto prices, returns, OHLCV
- `ais_data.py` — Vessel tracking, scenarios
- `ml_benchmarks.py` — Classification/regression datasets

These are called by endpoints as needed.

### CORS & Security

CORS is configured for localhost only (ports 5000-65535). In production, restrict `allow_origins` to your frontend domain.

## Logging

Logs are printed to stdout. Configure verbosity:

```bash
LOG_LEVEL=DEBUG python server.py
LOG_LEVEL=WARNING python server.py
```

## Error Handling

- HTTP exceptions (400, 404, 500) return standard error responses with `status: "error"`
- Unhandled exceptions are logged and return 500 with a generic message
- In development, include stack traces with `include_traceback=True`

## Development

### Testing Endpoints

Use `curl` or Postman:

```bash
# Health check
curl http://localhost:8888/

# Engine status
curl http://localhost:8888/api/status

# Portfolio returns (GET with query params)
curl 'http://localhost:8888/api/portfolio/returns?tickers=AAPL,MSFT&start=2024-01-01'
```

### Adding New Endpoints

1. Define request/response models in `server.py` (inherit from `BaseModel`)
2. Create an async endpoint function
3. Use `ok_response()` for success, `error_response()` for errors
4. Return `APIResponse` as the response model

Example:

```python
@app.post("/api/myengine/action", response_model=APIResponse)
async def my_action(req: MyRequest):
    """Description of endpoint."""
    try:
        result = my_engine.do_something(req.param1, req.param2)
        return ok_response(data=result, engine="my_engine")
    except Exception as e:
        log.error(f"Error: {e}")
        raise HTTPException(status_code=500, detail=error_response(str(e), engine="my_engine").dict())
```

## Deployment

### Docker

Create `Dockerfile`:

```dockerfile
FROM python:3.10-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY server.py .
EXPOSE 8888
CMD ["python", "server.py"]
```

Build and run:

```bash
docker build -t quadratic-api .
docker run -p 8888:8888 -e PORT=8888 quadratic-api
```

### Production Considerations

1. Use a production ASGI server (Gunicorn + Uvicorn):
   ```bash
   gunicorn -w 4 -k uvicorn.workers.UvicornWorker server:app --bind 0.0.0.0:8888
   ```

2. Enable HTTPS (reverse proxy with nginx)
3. Add authentication (OAuth2, API keys)
4. Set up monitoring and alerts
5. Use database for state persistence (Sentinel alerts, config)
6. Increase log rotation and archival

## Troubleshooting

### Engine not available

Check `/api/status` to see the error. Common issues:
- Missing dependencies (install from engine's requirements)
- Python path issues (ensure `PYTHONPATH` includes project root)
- Version conflicts (pin versions in `requirements.txt`)

### CORS errors

Ensure your frontend is on `localhost`. Update `allow_origins` in `app.add_middleware()` for other domains.

### Slow responses

- Check engine logs for bottlenecks
- Profile with `cProfile` or flame graphs
- Cache results for frequently-called endpoints
- Scale horizontally with multiple server instances

## Support

For issues, check:
1. Logs (stdout with timestamps)
2. `/api/status` for engine availability
3. Individual engine error messages in the request response

---

**Version:** 1.0.0
**Last Updated:** April 2026
