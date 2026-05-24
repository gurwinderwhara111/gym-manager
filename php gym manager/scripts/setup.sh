#!/bin/bash
echo "Setting up Gym Manager..."

# Ensure we are in the project root
cd "$(dirname "$0")/.."

cp .env.example .env
echo "✅ .env created"

mkdir -p db assets/css assets/js
echo "✅ Directories created"

php db/migrate.php
echo "✅ Database migrated"

php db/seed.php
echo "✅ Test data seeded"

echo "------------------------------------------------"
echo "🚀 Setup complete! Run the app with:"
echo "php -S 0.0.0.0:8000 -t . index.php"
echo "------------------------------------------------"
