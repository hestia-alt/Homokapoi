#!/usr/bin/env python
"""Test Supabase connection"""
import os
from decouple import config
from supabase import create_client

# Load environment variables
try:
    SUPABASE_URL = config('SUPABASE_URL')
    SUPABASE_KEY = config('SUPABASE_KEY')
    
    print("🔍 Testing Supabase Connection...")
    print(f"📍 URL: {SUPABASE_URL}")
    print(f"🔑 Key: {SUPABASE_KEY[:20]}...{SUPABASE_KEY[-10:]}")
    print()
    
    # Create client
    print("🔌 Creating Supabase client...")
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    print("✅ Client created successfully!")
    print()
    
    # Test connection by listing tables
    print("📊 Testing database connection...")
    response = supabase.table('graphs').select('*').limit(1).execute()
    print("✅ Connection successful!")
    print(f"📈 Graphs table exists and is accessible")
    print(f"   Found {len(response.data)} graph(s)")
    print()
    
    # Test nodes table
    response = supabase.table('nodes').select('*').limit(1).execute()
    print(f"📊 Nodes table exists and is accessible")
    print(f"   Found {len(response.data)} node(s)")
    print()
    
    # Test edges table
    response = supabase.table('edges').select('*').limit(1).execute()
    print(f"🔗 Edges table exists and is accessible")
    print(f"   Found {len(response.data)} edge(s)")
    print()
    
    print("🎉 All tests passed! Supabase is configured correctly.")
    
except Exception as e:
    print(f"❌ Error: {e}")
    print()
    print("Troubleshooting:")
    print("1. Check your .env file has SUPABASE_URL and SUPABASE_KEY")
    print("2. Verify the URL format: https://xxxxx.supabase.co")
    print("3. Ensure you've run the SQL schema in Supabase")
    print("4. Check that your API key is correct")