#!/bin/bash
echo "🚀 Starting Gym Manager Server..."
cd "$(dirname "$0")/.."
php -S 0.0.0.0:8000 index.php
