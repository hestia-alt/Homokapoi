"""
Supabase client singleton for database operations.
"""
from supabase import create_client
from django.conf import settings


class SupabaseClient:
    """Singleton Supabase client."""
    
    _instance = None
    _client = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._client = create_client(
                settings.SUPABASE_URL,
                settings.SUPABASE_SERVICE_KEY
            )
        return cls._instance
    
    @property
    def client(self):
        return self._client


# Global Supabase client instance
supabase = SupabaseClient().client

