# Supabase Authentication Setup

## Overview
This guide shows how to set up user authentication for Homokapoi using Supabase Auth. Users can sign up, log in, and have their graphs automatically saved to their account.

## ✅ What's Already Implemented

The authentication system is already built into the application:

1. **Frontend UI**: Login and signup modals with validation
2. **JavaScript Integration**: Supabase Auth client for session management
3. **Backend Authentication**: Token verification and user_id extraction
4. **API Security**: All graph operations require authentication
5. **Session Persistence**: Auto-login on page reload if session exists
6. **Visual State Management**: Color-coded nodes (red→orange→green) work per-user

## Quick Start

## Step 1: Update Supabase Schema

Run this SQL in your Supabase SQL Editor to add authentication support:

```sql
-- Add user_id column to graphs table
ALTER TABLE graphs 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for user_id lookups
CREATE INDEX idx_graphs_user_id ON graphs(user_id);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE graphs ENABLE ROW LEVEL SECURITY;
ALTER TABLE nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE edges ENABLE ROW LEVEL SECURITY;

-- RLS Policies for graphs table
-- Users can only see their own graphs
CREATE POLICY "Users can view their own graphs"
ON graphs FOR SELECT
USING (auth.uid() = user_id);

-- Users can create graphs for themselves
CREATE POLICY "Users can create their own graphs"
ON graphs FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own graphs
CREATE POLICY "Users can update their own graphs"
ON graphs FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own graphs
CREATE POLICY "Users can delete their own graphs"
ON graphs FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for nodes table
-- Users can view nodes in their own graphs
CREATE POLICY "Users can view nodes in their graphs"
ON nodes FOR SELECT
USING (
    graph_id IN (
        SELECT id FROM graphs WHERE user_id = auth.uid()
    )
);

-- Users can create nodes in their own graphs
CREATE POLICY "Users can create nodes in their graphs"
ON nodes FOR INSERT
WITH CHECK (
    graph_id IN (
        SELECT id FROM graphs WHERE user_id = auth.uid()
    )
);

-- Users can update nodes in their own graphs
CREATE POLICY "Users can update nodes in their graphs"
ON nodes FOR UPDATE
USING (
    graph_id IN (
        SELECT id FROM graphs WHERE user_id = auth.uid()
    )
);

-- Users can delete nodes in their own graphs
CREATE POLICY "Users can delete nodes in their graphs"
ON nodes FOR DELETE
USING (
    graph_id IN (
        SELECT id FROM graphs WHERE user_id = auth.uid()
    )
);

-- RLS Policies for edges table
-- Users can view edges in their own graphs
CREATE POLICY "Users can view edges in their graphs"
ON edges FOR SELECT
USING (
    graph_id IN (
        SELECT id FROM graphs WHERE user_id = auth.uid()
    )
);

-- Users can create edges in their own graphs
CREATE POLICY "Users can create edges in their graphs"
ON edges FOR INSERT
WITH CHECK (
    graph_id IN (
        SELECT id FROM graphs WHERE user_id = auth.uid()
    )
);

-- Users can update edges in their own graphs
CREATE POLICY "Users can update edges in their graphs"
ON edges FOR UPDATE
USING (
    graph_id IN (
        SELECT id FROM graphs WHERE user_id = auth.uid()
    )
);

-- Users can delete edges in their own graphs
CREATE POLICY "Users can delete edges in their graphs"
ON edges FOR DELETE
USING (
    graph_id IN (
        SELECT id FROM graphs WHERE user_id = auth.uid()
    )
);
```

## Step 2: Enable Email Auth in Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Providers**
3. Enable **Email** provider
4. Configure email templates (optional)
5. Set **Site URL** to `http://localhost:8000`
6. Add `http://localhost:8000` to **Redirect URLs**

## Step 3: Get Supabase URL and Anon Key

Your `.env` file should already have these values:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_KEY` - Your Supabase anon/public key

The anon key is safe to use in the frontend because Row Level Security protects the data.

## Step 4: Test Authentication

After implementing the frontend auth UI:

1. **Sign Up**: Create a new account
2. **Log In**: Log in with your credentials
3. **Create Graph**: Create a graph (automatically saved to your user_id)
4. **Log Out**: Log out
5. **Log In Again**: Log back in and verify your graph is still there

## Security Features

### Row Level Security (RLS)
- Users can only see, create, update, and delete their own data
- All queries automatically filter by `user_id`
- No way to access another user's graphs, even with direct API calls

### Authentication Flow
1. User signs up or logs in
2. Supabase returns a JWT token
3. Token is stored in localStorage
4. All API calls include the token in the Authorization header
5. Backend validates token with Supabase
6. Queries filter by the authenticated user's ID

## Migration from Non-Auth Setup

If you have existing graphs without user_id:

```sql
-- Option 1: Delete all existing data (clean slate)
DELETE FROM edges;
DELETE FROM nodes;
DELETE FROM graphs;

-- Option 2: Assign to a test user (replace with your user's UUID)
UPDATE graphs SET user_id = 'your-user-uuid-here' WHERE user_id IS NULL;
```

## Troubleshooting

### Error: "new row violates row-level security policy"
- Make sure you're logged in
- Check that the JWT token is being sent with requests
- Verify RLS policies are correctly set up

### Error: "JWT token is expired"
- Token has expired (default is 1 hour)
- Frontend should automatically refresh the token
- If not, log out and log back in

### Can't see my graphs after logging in
- Check that graphs have the correct user_id
- Verify RLS policies are enabled
- Check browser console for auth errors

## What You Need to Do

### 1. Run the SQL Schema Updates

Copy and run the SQL from **Step 1** in your Supabase SQL Editor. This adds:
- `user_id` column to graphs table
- Row Level Security (RLS) policies
- Proper access controls

### 2. Enable Email Auth in Supabase

Follow **Step 2** to enable email authentication in your Supabase dashboard.

### 3. Restart Your Django Server

```bash
python manage.py runserver
```

### 4. Test the Flow

1. Open `http://localhost:8000`
2. Click **"Sign Up"** in the top right
3. Create an account with your email
4. Check your email for verification (if required)
5. Click **"Log In"** and enter your credentials
6. Create a graph - it will be automatically saved to your account
7. Log out and log back in - your graph should still be there!

## How It Works

### User Workflow

1. **First Visit**: User sees "Log In" and "Sign Up" buttons
2. **Sign Up**: User creates account → receives verification email
3. **Log In**: User enters credentials → auto-loads their graph
4. **Create Nodes**: All nodes are saved to their user_id
5. **Log Out**: Session cleared, graph hidden
6. **Log In Again**: Previous graph automatically loads

### Technical Flow

```
User Action → Frontend (Supabase JS) → JWT Token → Backend (Django)
                                              ↓
                                        Verify Token
                                              ↓
                                        Extract user_id
                                              ↓
                                    Supabase (RLS filters by user_id)
```

### Color States (Per-User)

Each user has their own color-coded graph:
- **Red circles**: Leaf nodes without values
- **Orange circles**: Leaf nodes with values  
- **Green circles**: Leaf nodes connected to problems
- **Deep blue squares**: Parent nodes (auto-calculated)

## Benefits

1. **Data Privacy**: Each user's graphs are completely separate
2. **No Manual Save**: Graphs auto-save to user accounts
3. **Session Persistence**: Users stay logged in across page reloads
4. **Secure by Default**: RLS ensures no unauthorized access
5. **Simple UX**: Clear visual states for logged in/out

## API Changes

All API endpoints now:
- Accept `Authorization: Bearer <token>` header
- Return 401 if authentication required
- Filter data by authenticated user's ID
- Return empty arrays for non-authenticated requests

## Files Modified

- `templates/index.html`: Added nav bar and auth modals
- `templates/base.html`: Added Supabase meta tags
- `static/js/main.js`: Added full auth integration
- `static/css/style.css`: Added nav and modal styles
- `app/views.py`: Added token validation and user filtering
- `documentation/AUTHENTICATION_SETUP.md`: This guide!

