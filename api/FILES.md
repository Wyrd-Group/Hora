# Quadratic API Server — File Manifest

Complete listing of all API server files and their purposes.

## Core Server

### server.py (864 lines)
**FastAPI backend with all engine endpoints**

Main components:
- FastAPI app initialization with CORS
- Request logging middleware
- 35+ REST API endpoints covering:
  - Health & status checks
  - Portfolio optimization
  - Forecasting (single/multi)
  - Market data (OHLCV, returns)
  - Anomaly detection
  - Threat ranking
  - Clustering (DBSCAN)
  - Link analysis
  - Kalman filtering
  - Explainability
  - Market intelligence
  - Sentinel configuration & alerts

Error handling:
- Graceful engine import failures
- Consistent JSON response wrapper
- Comprehensive logging
- Exception handlers for HTTP and general errors

Features:
- Optional dependency detection
- Engine availability status
- Request/response logging
- Uvicorn integration

**Usage:** `python server.py`

## Configuration & Dependencies

### requirements.txt
Core dependencies for API server:
- fastapi 0.104.1
- uvicorn[standard] 0.24.0
- pydantic 2.5.0
- python-multipart 0.0.6
- numpy, pandas

**Install:** `pip install -r requirements.txt`

### .env.example
Template environment variables for configuration:
- Server port and logging
- Engine timeouts
- Data feed sources
- Sentinel thresholds
- Optional: External service credentials

**Setup:** Copy to `.env` and customize

### __init__.py
Python module initialization for API package.
Exports FastAPI app for production servers like Gunicorn.

## Documentation

### README.md (7.4 KB)
Complete API documentation including:
- Quick start guide
- Response format specification
- All 35+ endpoints with examples
- Engine integration details
- CORS and security configuration
- Logging setup
- Development guidelines
- Production deployment
- Troubleshooting guide

**Audience:** Developers, DevOps, API clients

### STARTUP.md (4.0 KB)
Quick reference for getting the API running:
- 30-second installation
- Server startup commands
- Verification steps
- Web UI links (Swagger, ReDoc)
- Basic example requests
- Common troubleshooting

**Audience:** First-time users, quick reference

### DEPLOYMENT_CHECKLIST.md
Pre-deployment and deployment procedures:
- Pre-deployment verification steps
- Security configuration checklist
- Performance & monitoring setup
- Three deployment options (Docker, traditional, systemd)
- Database & persistence setup
- Integration testing
- Post-deployment checks
- Rollback procedures
- Documentation requirements

**Audience:** DevOps, system administrators

### FILES.md (this file)
Manifest and description of all files in the api/ directory.

## Testing & Validation

### test_api.py (9.0 KB)
Comprehensive test suite for API endpoints:
- 30+ endpoint tests covering all major functionality
- Connection error detection
- Response format validation
- Test summary and reporting
- Verbose logging option
- Configurable host/port

Tests organized by category:
- Health & status
- Portfolio
- Forecasting
- Market data
- Anomaly detection
- Threat analysis
- Clustering
- Link analysis
- Kalman filtering
- Explainability
- Market intelligence
- Sentinel

**Usage:** `python test_api.py [--host localhost] [--port 8888] [--verbose]`

## File Structure Summary

```
Quadratic/api/
├── server.py                 # Main FastAPI application
├── requirements.txt          # Python dependencies
├── .env.example             # Configuration template
├── __init__.py              # Python module initialization
├── README.md                # Full documentation
├── STARTUP.md               # Quick start guide
├── DEPLOYMENT_CHECKLIST.md  # Deployment procedures
├── FILES.md                 # This file
└── test_api.py              # Test suite
```

## Key Features by File

| Feature | File | Lines |
|---------|------|-------|
| API Server | server.py | 864 |
| Documentation | README.md | 300+ |
| Tests | test_api.py | 280+ |
| Quick Start | STARTUP.md | 150+ |
| Deployment | DEPLOYMENT_CHECKLIST.md | 150+ |

## Engine Integration

### Supported Engines
Each engine is imported in server.py with graceful error handling:

1. **portfolio** — Portfolio optimization
2. **forecasting** — Time-series forecasting
3. **drl_training** — Deep RL training
4. **anomaly** — Anomaly detection
5. **kalman** — Kalman filtering
6. **clustering** — Clustering algorithms
7. **threat** — Threat scoring
8. **link_analysis** — Entity relationships
9. **explain** — Explainability
10. **market_intel** — Market intelligence
11. **intelligence** — Intelligence analysis

### Data Feeds
Connected in server.py:

1. **market_data** — Stock/crypto prices
2. **ais_data** — Vessel tracking
3. **ml_benchmarks** — ML datasets

## Getting Started

1. **First time?** Read STARTUP.md (5 minutes)
2. **Need details?** Read README.md (20 minutes)
3. **Want to test?** Run `python test_api.py` (2 minutes)
4. **Deploying?** Follow DEPLOYMENT_CHECKLIST.md
5. **Questions?** See README.md troubleshooting section

## Maintenance Notes

- Engine status at `/api/status` shows availability
- Logs include timestamps and module names
- All responses follow consistent JSON wrapper
- CORS configured for localhost (update for production)
- Placeholder implementations ready for real engine integration

---

**Version:** 1.0.0
**Created:** April 2026
**Last Updated:** April 2026
