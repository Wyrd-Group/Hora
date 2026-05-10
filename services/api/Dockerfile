FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y curl && apt-get clean

# Build context is ./services — copy api requirements first for layer caching
COPY api/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy API source
COPY api/ .

# Copy ingestor normalizers to /ingestor so that
# services/api/routers/market_data.py's sys.path.insert resolves correctly:
#   Path("/app/routers/market_data.py").parent.parent.parent / "ingestor" == /ingestor
COPY ingestor/ /ingestor/

EXPOSE 8000

HEALTHCHECK --interval=10s --timeout=5s --retries=5 \
  CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
