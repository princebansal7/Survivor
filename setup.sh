#!/bin/bash
set -e

echo "=== Survivor Game Setup ==="

# Backend setup
echo ""
echo "--- Setting up backend ---"
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
echo "Backend dependencies installed."
echo "Edit backend/.env with your database URL if needed."

cd ..

# Frontend setup
echo ""
echo "--- Setting up frontend ---"
cd frontend
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
echo "Frontend dependencies installed."

cd ..

echo ""
echo "=== Setup complete! ==="
echo ""
echo "Start the backend:"
echo "  cd backend && source venv/bin/activate && uvicorn app.main:app --reload"
echo ""
echo "Start the frontend (new terminal):"
echo "  cd frontend && npm run dev"
echo ""
echo "Or use Docker:"
echo "  docker compose up --build"
echo ""
echo "API docs: http://localhost:8000/docs"
echo "Frontend: http://localhost:3000"
