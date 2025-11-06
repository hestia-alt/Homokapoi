# Homokapoi Setup Guide

## Prerequisites

- Python 3.8+
- Supabase account with API keys
- pip (Python package manager)

## Step 1: Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Go to Project Settings → API
3. Copy your:
   - Project URL
   - `anon` public key
   - `service_role` key (keep this secret!)

4. Go to SQL Editor and run the following schema:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Graphs table
CREATE TABLE graphs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Nodes table
CREATE TABLE nodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    graph_id UUID REFERENCES graphs(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('market_segment', 'problem')),
    label TEXT NOT NULL,
    value NUMERIC,
    x_position NUMERIC NOT NULL DEFAULT 0,
    y_position NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Edges table
CREATE TABLE edges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    graph_id UUID REFERENCES graphs(id) ON DELETE CASCADE,
    source_node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
    target_node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('segment_hierarchy', 'value_edge')),
    weight NUMERIC,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_nodes_graph_id ON nodes(graph_id);
CREATE INDEX idx_edges_graph_id ON edges(graph_id);
CREATE INDEX idx_edges_source ON edges(source_node_id);
CREATE INDEX idx_edges_target ON edges(target_node_id);
```

## Step 2: Python Environment Setup

```bash
# Create virtual environment
python -m venv venv

# Activate it
source venv/bin/activate  # macOS/Linux
# OR
venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt
```

## Step 3: Environment Variables

Create a `.env` file in the project root (copy from .env.example):

```bash
# Create .env file manually
touch .env
```

Add the following content to `.env`:

```bash
# Django Configuration
SECRET_KEY=your-secret-key-here-generate-with-django
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-public-key-here
SUPABASE_SERVICE_KEY=your-service-role-key-here

# CORS Configuration
CORS_ALLOWED_ORIGINS=http://localhost:8000,http://127.0.0.1:8000
```

**Generate a Django SECRET_KEY:**

```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

## Step 4: Django Setup

```bash
# Run migrations (for Django's internal tables)
python manage.py migrate

# Create a superuser (optional, for admin access)
python manage.py createsuperuser

# Collect static files
python manage.py collectstatic --noinput
```

## Step 5: Run the Development Server

```bash
python manage.py runserver
```

Visit http://localhost:8000 in your browser!

## Project Structure

```
Homokapoi/
├── config/              # Django project settings
│   ├── settings.py      # Main configuration
│   ├── urls.py          # Root URL routing
│   └── wsgi.py          # WSGI entry point
├── app/                 # Main application
│   ├── supabase_client.py  # Supabase connection
│   ├── views.py         # API endpoints
│   └── urls.py          # App URL routing
├── static/              # Frontend assets
│   ├── css/style.css    # Styling
│   └── js/main.js       # Graph logic
├── templates/           # HTML templates
│   ├── base.html
│   └── index.html
├── manage.py            # Django management
└── requirements.txt     # Python dependencies
```

## API Endpoints

### Graphs
- `GET /api/graphs/` - List all graphs
- `POST /api/graphs/` - Create new graph
- `GET /api/graphs/<id>/` - Get graph with nodes & edges
- `DELETE /api/graphs/<id>/` - Delete graph

### Nodes
- `POST /api/nodes/` - Create node
- `PATCH /api/nodes/<id>/` - Update node
- `DELETE /api/nodes/<id>/` - Delete node

### Edges
- `POST /api/edges/` - Create edge
- `PATCH /api/edges/<id>/` - Update edge
- `DELETE /api/edges/<id>/` - Delete edge

## Troubleshooting

### "No module named 'supabase'"
```bash
pip install -r requirements.txt
```

### "Connection refused" or Supabase errors
- Check your `.env` file has correct Supabase credentials
- Verify your Supabase project is running
- Check the URL format: `https://xxxxx.supabase.co`

### Static files not loading
```bash
python manage.py collectstatic --noinput
```

### Port already in use
```bash
python manage.py runserver 8080  # Use different port
```

## Next Steps

1. **Test the API**: Use the browser's developer console to test API calls
2. **Create your first graph**: Click "Market Segment" button
3. **Add nodes**: Create market segments and problems
4. **Draw edges**: (Coming soon - edge drawing UI)
5. **Set values**: Click on nodes to input values

## Development Workflow

1. Make changes to Python files
2. Django auto-reloads (no restart needed)
3. Make changes to JS/CSS in `static/`
4. Refresh browser to see changes
5. For template changes, just refresh

## Production Deployment

See `ARCHITECTURE.md` for production deployment considerations including:
- Setting `DEBUG=False`
- Configuring proper `ALLOWED_HOSTS`
- Using a production server (gunicorn)
- Setting up HTTPS
- Environment variable security

