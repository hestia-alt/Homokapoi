# Homokapoi - Market Sizing Graph Tool

## Problem Statement
Market sizing calculations break the flow of strategic thinking. Individuals get stuck on math when they should focus on assumptions and world-building. This tool makes market sizing visual and automatic.

## Product Vision
A graph-based tool where users map markets as connected nodes, allowing them to explore market size through visual segmentation and automatic calculation.

## Core Concepts

### Node Types

#### 1. Market Segment Nodes
- Represent buyer populations in the market
- **Leaf nodes**: User inputs actual population numbers
- **Parent nodes**: Automatically sum all child nodes
- Default value: 0 (not displayed until set)
- Click to edit population value

#### 2. Problem Nodes
- Represent problems that market segments are willing to pay to solve
- Calculate total addressable value automatically
- Formula: `SUM(connected_leaf_segment_value × edge_weight)`

### Edge Types

#### 1. Segment-to-Segment Edges
- Create hierarchical market segmentation
- No weight or value
- Used to build parent-child relationships

#### 2. Value Edges (Segment-to-Problem)
- Connect leaf market segments to problems
- Properties:
  - **Weight**: Dollar amount per user willing to pay
  - **Description**: Context about why this segment values this problem
- Click edge to edit weight and description

## User Experience

### Workflow
1. Start with root market segment node
2. Create child segments to break down the market
3. Input population numbers at leaf nodes
4. Create problem nodes for monetization opportunities
5. Draw edges from leaf segments to problems
6. Define willingness-to-pay on each edge
7. See automatic calculations throughout

### Interactions
- **Left Toolbar**: Create market segment or problem nodes
- **Drag from Node**: Draw edge to another node
- **Click Leaf Node**: Input population number
- **Click Value Edge**: Input dollar amount and description
- **Hover**: See calculated values and connections

### Auto-Calculation Rules
- Parent market segments = sum of children
- Problem value = sum of (leaf_segment_value × edge_weight)
- All calculations update in real-time

## Technical Architecture

### Frontend
- **Graph Library**: Cytoscape.js or React Flow
- **Rendering**: Canvas-based node/edge visualization
- **Interactions**: Drag, click, hover states
- **State Management**: Real-time calculation engine

### Backend (Django)
- **API Endpoints**: CRUD for nodes and edges
- **Validation**: Ensure data integrity
- **Calculation Engine**: Server-side validation of calculations

### Database (Supabase)
- **Tables**: 
  - `graphs`: User projects
  - `nodes`: Market segments and problems
  - `edges`: Connections with optional weights
  - `user_inputs`: Historical data and assumptions

### Data Model
```
graphs
- id (uuid)
- name (text)
- description (text)
- created_at (timestamp)
- updated_at (timestamp)

nodes
- id (uuid)
- graph_id (uuid, FK)
- type (enum: 'market_segment', 'problem')
- label (text)
- value (numeric, nullable) - for leaf nodes
- x_position (numeric)
- y_position (numeric)
- created_at (timestamp)

edges
- id (uuid)
- graph_id (uuid, FK)
- source_node_id (uuid, FK)
- target_node_id (uuid, FK)
- type (enum: 'segment_hierarchy', 'value_edge')
- weight (numeric, nullable) - dollar amount for value edges
- description (text, nullable)
- created_at (timestamp)
```

## Development Roadmap

### Phase 1: Core Functionality
- [ ] Basic node creation (market segments)
- [ ] Node positioning and drag
- [ ] Leaf node value input
- [ ] Parent node auto-calculation
- [ ] Problem node creation
- [ ] Edge drawing between nodes

### Phase 2: Value Edges
- [ ] Value edge creation (segment → problem)
- [ ] Edge weight input (dollar amount)
- [ ] Edge description
- [ ] Problem node calculation

### Phase 3: Persistence
- [ ] Save graph to Supabase
- [ ] Load existing graphs
- [ ] Real-time sync

### Phase 4: Enhanced UX
- [ ] Undo/redo
- [ ] Graph layouts (auto-arrange)
- [ ] Export calculations
- [ ] Templates

## Getting Started

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Add your Supabase credentials

# Run migrations
python manage.py migrate

# Start development server
python manage.py runserver
```

## Tech Stack
- **Backend**: Django 4.2+
- **Frontend**: Vanilla JS + Cytoscape.js
- **Database**: Supabase (PostgreSQL)
- **Deployment**: TBD

