#!/bin/bash

echo "🚀 Homokapoi Quick Start Script"
echo "================================"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "Please create a .env file with your Supabase credentials."
    echo ""
    echo "Copy .env.example to .env and fill in your values:"
    echo "  1. Django SECRET_KEY"
    echo "  2. SUPABASE_URL"
    echo "  3. SUPABASE_KEY"
    echo ""
    echo "Generate a SECRET_KEY with:"
    echo "  python -c \"from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())\""
    exit 1
fi

echo "✅ .env file found"
echo ""

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
    echo "✅ Virtual environment created"
else
    echo "✅ Virtual environment already exists"
fi

echo ""
echo "🔌 Activating virtual environment..."
source venv/bin/activate

echo ""
echo "📥 Installing dependencies..."
pip install -r requirements.txt

echo ""
echo "🗄️  Running Django migrations..."
python manage.py migrate

echo ""
echo "📁 Collecting static files..."
python manage.py collectstatic --noinput

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start the development server, run:"
echo "  source venv/bin/activate"
echo "  python manage.py runserver"
echo ""
echo "Then visit: http://localhost:8000"

