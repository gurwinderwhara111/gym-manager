#!/bin/bash
echo "Setting up Gym Manager..."

cp .env.example .env
echo "✅ .env created — edit DB_DRIVER and credentials"

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
