FROM pgvector/pgvector:pg16

RUN apt-get update && apt-get install -y \
    build-essential \
    git \
    flex \
    bison \
    postgresql-server-dev-16 \
    postgresql-16-postgis-3 \
    postgresql-16-postgis-3-scripts \
    && git clone -b PG16 --depth 1 https://github.com/apache/age /tmp/age \
    && cd /tmp/age && make PG_CONFIG=/usr/bin/pg_config install \
    && apt-get clean \
    && rm -rf /tmp/age
