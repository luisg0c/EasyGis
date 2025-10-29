#!/bin/bash

# Start FastAPI server for remote sensing processing
cd "$(dirname "$0")"

echo "Starting Remote Sensing API..."
echo "Make sure you have installed dependencies: uv sync"
echo ""

cd api
uvicorn main:app --reload --host 0.0.0.0 --port 8000
