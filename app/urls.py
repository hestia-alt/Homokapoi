"""
URL configuration for the app.
"""
from django.urls import path
from . import views

urlpatterns = [
    # Main page
    path('', views.index, name='index'),
    
    # Graph endpoints
    path('api/graphs/', views.graphs_list, name='graphs_list'),
    path('api/graphs/<str:graph_id>/', views.graph_detail, name='graph_detail'),
    
    # Node endpoints
    path('api/nodes/', views.nodes_create, name='nodes_create'),
    path('api/nodes/<str:node_id>/', views.nodes_detail, name='nodes_detail'),
    
    # Edge endpoints
    path('api/edges/', views.edges_create, name='edges_create'),
    path('api/edges/<str:edge_id>/', views.edges_detail, name='edges_detail'),
]

