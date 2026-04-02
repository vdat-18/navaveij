#!/usr/bin/env bash
set -e

echo "========================================"
echo "  Navavej ROC — Frontend"
echo "========================================"
echo ""

cd frontend

# Install Node dependencies (skipped if already installed)
npm install

# Start the development server
npm run dev
