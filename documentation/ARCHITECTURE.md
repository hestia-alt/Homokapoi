# Technical Architecture Guide

## Graph Library Recommendation: Cytoscape.js

**Why Cytoscape.js?**
- Designed specifically for network/graph visualization
- Excellent node manipulation (drag, position, select)
- Built-in edge drawing capabilities
- Event system for clicks, hovers, drags
- Automatic layout algorithms
- Good performance for medium-sized graphs
- No framework dependencies (works with vanilla JS)

**Alternative**: React Flow (if you prefer React)

## Frontend Data Structure

```javascript
// In-memory graph state
const graphState = {
  nodes: [
    {
      id: 'node-1',
      type: 'market_segment',  // or 'problem'
      label: 'Total Market',
      value: null,              // null for parent nodes, number for leaf nodes
      calculatedValue: 1000000, // auto-calculated for parents
      position: { x: 100, y: 100 },
      isLeaf: false
    }
  ],
  edges: [
    {
      id: 'edge-1',
      source: 'node-1',
      target: 'node-2',
      type: 'segment_hierarchy',  // or 'value_edge'
      weight: null,                // dollar amount for value edges
      description: ''
    }
  ]
}
```

## Calculation Engine (JavaScript)

```javascript
class MarketCalculator {
  constructor(nodes, edges) {
    this.nodes = nodes;
    this.edges = edges;
  }

  // Get all children of a node
  getChildren(nodeId) {
    return this.edges
      .filter(e => e.source === nodeId && e.type === 'segment_hierarchy')
      .map(e => this.nodes.find(n => n.id === e.target));
  }

  // Check if node is a leaf (no children)
  isLeaf(nodeId) {
    return this.getChildren(nodeId).length === 0;
  }

  // Calculate market segment value (recursive)
  calculateSegmentValue(nodeId) {
    const node = this.nodes.find(n => n.id === nodeId);
    
    if (this.isLeaf(nodeId)) {
      return node.value || 0;  // User-input value or 0
    }
    
    // Parent node: sum of children
    const children = this.getChildren(nodeId);
    return children.reduce((sum, child) => {
      return sum + this.calculateSegmentValue(child.id);
    }, 0);
  }

  // Calculate problem node value
  calculateProblemValue(problemNodeId) {
    // Get all value edges pointing to this problem
    const valueEdges = this.edges.filter(e => 
      e.target === problemNodeId && 
      e.type === 'value_edge'
    );

    // Sum: segment_value × edge_weight
    return valueEdges.reduce((total, edge) => {
      const segmentValue = this.calculateSegmentValue(edge.source);
      const weight = edge.weight || 0;
      return total + (segmentValue * weight);
    }, 0);
  }

  // Recalculate all nodes
  recalculateAll() {
    this.nodes.forEach(node => {
      if (node.type === 'market_segment') {
        node.calculatedValue = this.calculateSegmentValue(node.id);
      } else if (node.type === 'problem') {
        node.calculatedValue = this.calculateProblemValue(node.id);
      }
    });
  }
}
```

## Django API Endpoints

```
GET    /api/graphs/              - List all graphs
POST   /api/graphs/              - Create new graph
GET    /api/graphs/<id>/         - Get graph with nodes & edges
DELETE /api/graphs/<id>/         - Delete graph

POST   /api/nodes/               - Create node
PATCH  /api/nodes/<id>/          - Update node (value, position, label)
DELETE /api/nodes/<id>/          - Delete node

POST   /api/edges/               - Create edge
PATCH  /api/edges/<id>/          - Update edge (weight, description)
DELETE /api/edges/<id>/          - Delete edge
```

## Supabase Schema (SQL)

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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent cycles and ensure valid edge types
    CONSTRAINT valid_edge_type CHECK (
        (type = 'segment_hierarchy' AND weight IS NULL) OR
        (type = 'value_edge' AND weight IS NOT NULL)
    )
);

-- Indexes for performance
CREATE INDEX idx_nodes_graph_id ON nodes(graph_id);
CREATE INDEX idx_edges_graph_id ON edges(graph_id);
CREATE INDEX idx_edges_source ON edges(source_node_id);
CREATE INDEX idx_edges_target ON edges(target_node_id);
```

## Frontend Event Handlers

```javascript
// Node click handler
cy.on('tap', 'node[type="market_segment"]', function(evt) {
  const node = evt.target;
  if (isLeaf(node)) {
    showValueInputModal(node);
  }
});

// Edge click handler
cy.on('tap', 'edge[type="value_edge"]', function(evt) {
  const edge = evt.target;
  showEdgeWeightModal(edge);
});

// Edge creation (drag from node)
let edgeSource = null;

cy.on('mousedown', 'node', function(evt) {
  edgeSource = evt.target;
});

cy.on('mouseup', 'node', function(evt) {
  if (edgeSource && edgeSource.id() !== evt.target.id()) {
    createEdge(edgeSource, evt.target);
  }
  edgeSource = null;
});

// Auto-save on change
function onChange() {
  calculator.recalculateAll();
  updateDisplay();
  debouncedSave();
}
```

## UI Components Needed

1. **Left Toolbar**
   - Button: "New Market Segment"
   - Button: "New Problem"
   - (Optional) Templates dropdown

2. **Graph Canvas**
   - Cytoscape.js container
   - Full width/height
   - Pan and zoom enabled

3. **Node Value Modal**
   - Input field for population number
   - Formatting with commas
   - Save/Cancel buttons

4. **Edge Weight Modal**
   - Input field for dollar amount
   - Textarea for description
   - Save/Cancel buttons

5. **Node Display**
   - Label at top
   - Calculated value at bottom (formatted)
   - Different colors for node types
   - Visual indicator for leaf vs parent

## Styling Recommendations

```css
/* Node styles */
.market-segment-node {
  background-color: #4A90E2;
  border: 2px solid #2E5C8A;
  border-radius: 8px;
}

.market-segment-leaf {
  background-color: #7AB8F5;
}

.problem-node {
  background-color: #E85D75;
  border: 2px solid #C23850;
  border-radius: 50%; /* circular */
}

/* Edge styles */
.segment-hierarchy-edge {
  line-color: #95A5A6;
  width: 2px;
}

.value-edge {
  line-color: #27AE60;
  width: 3px;
  target-arrow-color: #27AE60;
  target-arrow-shape: triangle;
}
```

## Development Order

1. **Basic Graph Display**
   - Set up Cytoscape.js
   - Create/display nodes
   - Position nodes with drag

2. **Hierarchy & Calculation**
   - Draw edges between segments
   - Implement calculation engine
   - Test parent-child sums

3. **Value Input**
   - Click leaf node → input modal
   - Update node value
   - Recalculate on change

4. **Problem Nodes**
   - Create problem nodes
   - Draw value edges
   - Edge weight input
   - Problem value calculation

5. **Persistence**
   - Save to Supabase
   - Load from Supabase
   - Auto-save

6. **Polish**
   - Better layouts
   - Value formatting
   - Undo/redo
   - Export data

