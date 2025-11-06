"""
Views for the Homokapoi market sizing tool.
"""
from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.conf import settings
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
import json
import traceback
import logging

from .supabase_client import supabase

# Set up logging
logger = logging.getLogger(__name__)


def get_user_from_token(request):
    """
    Extract user_id from Supabase JWT token in Authorization header.
    Returns user_id or None if not authenticated.
    """
    auth_header = request.headers.get('Authorization', '')
    
    if not auth_header.startswith('Bearer '):
        return None
    
    token = auth_header.replace('Bearer ', '')
    
    try:
        # Verify token with Supabase
        response = supabase.auth.get_user(token)
        if response and response.user:
            return response.user.id
    except Exception as e:
        logger.error(f'Error verifying token: {e}')
        return None
    
    return None


def index(request):
    """Render the main application page."""
    context = {
        'SUPABASE_URL': settings.SUPABASE_URL,
        'SUPABASE_KEY': settings.SUPABASE_KEY,
    }
    return render(request, 'index.html', context)


# Graph endpoints

@api_view(['GET', 'POST'])
def graphs_list(request):
    """
    GET: List all graphs for the authenticated user
    POST: Create a new graph for the authenticated user
    """
    # Get user_id from auth token
    user_id = get_user_from_token(request)
    
    if request.method == 'GET':
        try:
            logger.info("📊 Fetching graphs...")
            
            # If no user_id, return empty list (RLS will handle this in Supabase too)
            if not user_id:
                logger.info("⚠️ No authenticated user, returning empty list")
                return Response([])
            
            # Filter by user_id
            response = supabase.table('graphs').select('*').eq('user_id', user_id).execute()
            logger.info(f"✅ Successfully fetched {len(response.data)} graphs for user {user_id}")
            return Response(response.data)
        except Exception as e:
            logger.error(f"❌ Error fetching graphs: {type(e).__name__}: {str(e)}")
            logger.error(traceback.format_exc())
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    elif request.method == 'POST':
        try:
            logger.info("=" * 60)
            logger.info("🆕 Creating new graph...")
            logger.info(f"📥 Request data: {request.data}")
            
            # Require authentication to create graphs
            if not user_id:
                logger.error("❌ Authentication required to create graph")
                return Response(
                    {'error': 'Authentication required'}, 
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            data = {
                'name': request.data.get('name', 'Untitled Graph'),
                'description': request.data.get('description', ''),
                'user_id': user_id
            }
            logger.info(f"📤 Prepared data for insert: {data}")
            
            logger.info("🔌 Calling Supabase insert...")
            response = supabase.table('graphs').insert(data).execute()
            
            logger.info(f"✅ Graph created successfully!")
            logger.info(f"📊 Response data: {response.data}")
            logger.info(f"🆔 Graph ID: {response.data[0].get('id') if response.data else 'N/A'}")
            logger.info("=" * 60)
            
            return Response(response.data[0], status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error("=" * 60)
            logger.error(f"❌ ERROR creating graph")
            logger.error(f"🔴 Exception type: {type(e).__name__}")
            logger.error(f"🔴 Exception message: {str(e)}")
            logger.error(f"🔴 Exception args: {e.args}")
            
            # Try to get more details from Supabase error
            if hasattr(e, '__dict__'):
                logger.error(f"🔴 Exception attributes: {e.__dict__}")
            
            logger.error("🔴 Full traceback:")
            logger.error(traceback.format_exc())
            logger.error("=" * 60)
            
            return Response({
                'error': str(e),
                'error_type': type(e).__name__,
                'details': 'Check server logs for full traceback'
            }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'DELETE'])
def graph_detail(request, graph_id):
    """
    GET: Get a specific graph with all its nodes and edges
    DELETE: Delete a graph
    """
    if request.method == 'GET':
        try:
            logger.info(f"📊 Fetching graph: {graph_id}")
            
            # Get graph
            graph = supabase.table('graphs').select('*').eq('id', graph_id).execute()
            if not graph.data:
                logger.warning(f"⚠️ Graph not found: {graph_id}")
                return Response({'error': 'Graph not found'}, status=status.HTTP_404_NOT_FOUND)
            
            # Get nodes
            nodes = supabase.table('nodes').select('*').eq('graph_id', graph_id).execute()
            logger.info(f"📍 Found {len(nodes.data)} nodes")
            
            # Get edges
            edges = supabase.table('edges').select('*').eq('graph_id', graph_id).execute()
            logger.info(f"🔗 Found {len(edges.data)} edges")
            
            return Response({
                'graph': graph.data[0],
                'nodes': nodes.data,
                'edges': edges.data
            })
        except Exception as e:
            logger.error(f"❌ Error fetching graph {graph_id}: {str(e)}")
            logger.error(traceback.format_exc())
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    elif request.method == 'DELETE':
        try:
            logger.info(f"🗑️ Deleting graph: {graph_id}")
            supabase.table('graphs').delete().eq('id', graph_id).execute()
            logger.info(f"✅ Graph deleted: {graph_id}")
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            logger.error(f"❌ Error deleting graph {graph_id}: {str(e)}")
            logger.error(traceback.format_exc())
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


# Node endpoints

@api_view(['POST'])
def nodes_create(request):
    """Create a new node."""
    try:
        logger.info("=" * 60)
        logger.info("🔵 Creating new node...")
        logger.info(f"📥 Request data: {request.data}")
        
        data = {
            'graph_id': request.data.get('graph_id'),
            'type': request.data.get('type'),
            'label': request.data.get('label', 'Untitled'),
            'value': request.data.get('value'),
            'x_position': request.data.get('x_position', 0),
            'y_position': request.data.get('y_position', 0)
        }
        logger.info(f"📤 Prepared data: {data}")
        
        response = supabase.table('nodes').insert(data).execute()
        logger.info(f"✅ Node created: {response.data[0].get('id')}")
        logger.info("=" * 60)
        
        return Response(response.data[0], status=status.HTTP_201_CREATED)
    except Exception as e:
        logger.error("=" * 60)
        logger.error(f"❌ Error creating node")
        logger.error(f"🔴 Error: {type(e).__name__}: {str(e)}")
        logger.error(traceback.format_exc())
        logger.error("=" * 60)
        return Response({
            'error': str(e),
            'error_type': type(e).__name__
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PATCH', 'DELETE'])
def nodes_detail(request, node_id):
    """
    PATCH: Update a node
    DELETE: Delete a node
    """
    if request.method == 'PATCH':
        try:
            logger.info(f"✏️ Updating node: {node_id}")
            logger.info(f"📥 Update data: {request.data}")
            
            data = {}
            if 'label' in request.data:
                data['label'] = request.data['label']
            if 'value' in request.data:
                data['value'] = request.data['value']
            if 'x_position' in request.data:
                data['x_position'] = request.data['x_position']
            if 'y_position' in request.data:
                data['y_position'] = request.data['y_position']
            
            response = supabase.table('nodes').update(data).eq('id', node_id).execute()
            logger.info(f"✅ Node updated: {node_id}")
            return Response(response.data[0])
        except Exception as e:
            logger.error(f"❌ Error updating node {node_id}: {str(e)}")
            logger.error(traceback.format_exc())
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        try:
            logger.info(f"🗑️ Deleting node: {node_id}")
            supabase.table('nodes').delete().eq('id', node_id).execute()
            logger.info(f"✅ Node deleted: {node_id}")
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            logger.error(f"❌ Error deleting node {node_id}: {str(e)}")
            logger.error(traceback.format_exc())
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


# Edge endpoints

@api_view(['POST'])
def edges_create(request):
    """Create a new edge."""
    try:
        logger.info("=" * 60)
        logger.info("🔗 Creating new edge...")
        logger.info(f"📥 Request data: {request.data}")
        
        graph_id = request.data.get('graph_id')
        source_node_id = request.data.get('source_node_id')
        target_node_id = request.data.get('target_node_id')
        edge_type = request.data.get('type')
        
        # Validate required fields
        if not all([graph_id, source_node_id, target_node_id, edge_type]):
            missing = []
            if not graph_id: missing.append('graph_id')
            if not source_node_id: missing.append('source_node_id')
            if not target_node_id: missing.append('target_node_id')
            if not edge_type: missing.append('type')
            logger.error(f"❌ Missing required fields: {missing}")
            return Response({
                'error': f'Missing required fields: {", ".join(missing)}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Verify nodes exist
        logger.info(f"🔍 Verifying source node exists: {source_node_id}")
        source_check = supabase.table('nodes').select('id').eq('id', source_node_id).execute()
        
        if not source_check.data:
            logger.error(f"❌ Source node not found: {source_node_id}")
            return Response({
                'error': f'Source node {source_node_id} does not exist'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        logger.info(f"🔍 Verifying target node exists: {target_node_id}")
        target_check = supabase.table('nodes').select('id').eq('id', target_node_id).execute()
        
        if not target_check.data:
            logger.error(f"❌ Target node not found: {target_node_id}")
            return Response({
                'error': f'Target node {target_node_id} does not exist'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        data = {
            'graph_id': graph_id,
            'source_node_id': source_node_id,
            'target_node_id': target_node_id,
            'type': edge_type,
            'weight': request.data.get('weight'),
            'description': request.data.get('description', '')
        }
        
        logger.info(f"📤 Creating edge with data: {data}")
        response = supabase.table('edges').insert(data).execute()
        logger.info(f"✅ Edge created: {response.data[0].get('id')}")
        logger.info("=" * 60)
        
        return Response(response.data[0], status=status.HTTP_201_CREATED)
    except Exception as e:
        logger.error("=" * 60)
        logger.error(f"❌ Error creating edge")
        logger.error(f"🔴 Error: {type(e).__name__}: {str(e)}")
        logger.error(traceback.format_exc())
        logger.error("=" * 60)
        return Response({
            'error': str(e),
            'error_type': type(e).__name__
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PATCH', 'DELETE'])
def edges_detail(request, edge_id):
    """
    PATCH: Update an edge
    DELETE: Delete an edge
    """
    if request.method == 'PATCH':
        try:
            logger.info(f"✏️ Updating edge: {edge_id}")
            logger.info(f"📥 Update data: {request.data}")
            
            data = {}
            if 'weight' in request.data:
                data['weight'] = request.data['weight']
            if 'description' in request.data:
                data['description'] = request.data['description']
            
            response = supabase.table('edges').update(data).eq('id', edge_id).execute()
            logger.info(f"✅ Edge updated: {edge_id}")
            return Response(response.data[0])
        except Exception as e:
            logger.error(f"❌ Error updating edge {edge_id}: {str(e)}")
            logger.error(traceback.format_exc())
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        try:
            logger.info(f"🗑️ Deleting edge: {edge_id}")
            supabase.table('edges').delete().eq('id', edge_id).execute()
            logger.info(f"✅ Edge deleted: {edge_id}")
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            logger.error(f"❌ Error deleting edge {edge_id}: {str(e)}")
            logger.error(traceback.format_exc())
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)