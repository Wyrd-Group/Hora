#!/bin/bash
echo "Purging corrupted Postgres volume..."
docker compose down -v

echo "Rebooting full architecture..."
docker compose up -d --build postgres

# ensure network is running
docker compose up -d

# Wait for Postgres to be genuinely ready on port 5432
echo "Waiting for postgres on 5432..."
while ! nc -z localhost 5432; do   
  sleep 1 
done

# Wait for init.sql to finish and the database schemas to successfully route to public
echo "Waiting 10 seconds for schema Initialization..."
sleep 10

source venv/bin/activate
echo "Seeding..."
python scripts/seed_simdata.py --aoi gulf &
