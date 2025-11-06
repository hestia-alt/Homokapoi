// Main JavaScript for Homokapoi Market Sizing Tool

// Initialize Supabase client (will be initialized after DOM loads)
let supabase = null;
let currentUser = null;

// Global state
let cy = null;
let currentGraphId = null;
let selectedNode = null;
let selectedEdge = null;
let edgeDrawingMode = false;
let edgeSourceNode = null;
let temporaryEdge = null;
let calculator = null;
let pendingNodeData = null;
let isRenamingNode = false;
let contextMenuNode = null;
let contextMenuEdge = null;
let canvasMenuPosition = null;

// Initialize Supabase client
function initializeSupabase() {
    // Get Supabase URL and Key from Django template context or env
    // For now, we'll get them from the Django settings via a meta tag
    const supabaseUrl = document.querySelector('meta[name="supabase-url"]')?.content;
    const supabaseKey = document.querySelector('meta[name="supabase-key"]')?.content;
    
    if (!supabaseUrl || !supabaseKey) {
        console.error('Supabase credentials not found');
        return;
    }
    
    supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
    console.log('Supabase client initialized');
}

// API helper with authentication
async function api(endpoint, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    // Add auth token if user is logged in
    if (supabase && currentUser) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            headers['Authorization'] = `Bearer ${session.access_token}`;
        }
    }
    
    const response = await fetch(endpoint, {
        headers,
        ...options
    });
    
    // Check if response has content before trying to parse JSON
    // 204 No Content responses (like DELETE) have no body
    if (response.status === 204) {
        return null;
    }
    
    const data = await response.json();
    
    // If response is not ok, throw an error with the server message
    if (!response.ok) {
        throw data;
    }
    
    return data;
}

// ============================================================
// AUTHENTICATION FUNCTIONS
// ============================================================

// Check authentication status and update UI
async function checkAuthStatus() {
    if (!supabase) return;
    
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
        currentUser = session.user;
        updateAuthUI(true);
        // Load user's graph
        await loadUserGraph();
    } else {
        currentUser = null;
        updateAuthUI(false);
    }
}

// Update authentication UI
function updateAuthUI(isLoggedIn) {
    const loggedIn = document.getElementById('auth-logged-in');
    const loggedOut = document.getElementById('auth-logged-out');
    const userEmail = document.getElementById('user-email');
    
    if (isLoggedIn && currentUser) {
        loggedOut.style.display = 'none';
        loggedIn.style.display = 'flex';
        userEmail.textContent = currentUser.email;
    } else {
        loggedOut.style.display = 'flex';
        loggedIn.style.display = 'none';
    }
}

// Show login modal
function showLoginModal() {
    document.getElementById('login-modal').classList.add('active');
    document.getElementById('login-email').focus();
    document.getElementById('login-error').style.display = 'none';
}

// Show signup modal
function showSignupModal() {
    document.getElementById('signup-modal').classList.add('active');
    document.getElementById('signup-email').focus();
    document.getElementById('signup-error').style.display = 'none';
    document.getElementById('signup-success').style.display = 'none';
}

// Close modals
function closeLoginModal() {
    document.getElementById('login-modal').classList.remove('active');
    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';
}

function closeSignupModal() {
    document.getElementById('signup-modal').classList.remove('active');
    document.getElementById('signup-email').value = '';
    document.getElementById('signup-password').value = '';
    document.getElementById('signup-password-confirm').value = '';
}

// Handle login
async function handleLogin() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errorDiv = document.getElementById('login-error');
    
    if (!email || !password) {
        errorDiv.textContent = 'Please enter both email and password';
        errorDiv.style.display = 'block';
        return;
    }
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        
        if (error) throw error;
        
        currentUser = data.user;
        closeLoginModal();
        updateAuthUI(true);
        
        // Reload the page to load user's graph
        location.reload();
        
    } catch (error) {
        errorDiv.textContent = error.message || 'Login failed. Please try again.';
        errorDiv.style.display = 'block';
    }
}

// Handle signup
async function handleSignup() {
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-password-confirm').value;
    const errorDiv = document.getElementById('signup-error');
    const successDiv = document.getElementById('signup-success');
    
    errorDiv.style.display = 'none';
    successDiv.style.display = 'none';
    
    if (!email || !password || !confirmPassword) {
        errorDiv.textContent = 'Please fill in all fields';
        errorDiv.style.display = 'block';
        return;
    }
    
    if (password !== confirmPassword) {
        errorDiv.textContent = 'Passwords do not match';
        errorDiv.style.display = 'block';
        return;
    }
    
    if (password.length < 6) {
        errorDiv.textContent = 'Password must be at least 6 characters';
        errorDiv.style.display = 'block';
        return;
    }
    
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password
        });
        
        if (error) throw error;
        
        successDiv.textContent = 'Account created! Please check your email to verify your account, then log in.';
        successDiv.style.display = 'block';
        
        // Clear form
        document.getElementById('signup-email').value = '';
        document.getElementById('signup-password').value = '';
        document.getElementById('signup-password-confirm').value = '';
        
        // Auto-switch to login modal after 3 seconds
        setTimeout(() => {
            closeSignupModal();
            showLoginModal();
        }, 3000);
        
    } catch (error) {
        errorDiv.textContent = error.message || 'Signup failed. Please try again.';
        errorDiv.style.display = 'block';
    }
}

// Handle logout
async function handleLogout() {
    if (!supabase) return;
    
    try {
        await supabase.auth.signOut();
        currentUser = null;
        currentGraphId = null;
        updateAuthUI(false);
        
        // Clear the graph
        if (cy) {
            cy.elements().remove();
        }
        
    } catch (error) {
        console.error('Logout error:', error);
        alert('Error logging out. Please try again.');
    }
}

// Load user's most recent graph
async function loadUserGraph() {
    if (!currentUser) return;
    
    try {
        // Get user's graphs from Supabase
        const response = await api('/api/graphs/');
        const graphs = response.graphs || response || [];
        
        if (graphs && graphs.length > 0) {
            // Load the most recent graph
            const mostRecent = graphs.sort((a, b) => 
                new Date(b.updated_at) - new Date(a.updated_at)
            )[0];
            
            // Fetch the complete graph data with nodes and edges
            const graphData = await api(`/api/graphs/${mostRecent.id}/`);
            loadGraphData(graphData);
        }
    } catch (error) {
        console.error('Error loading user graph:', error);
        // Continue anyway - user can create a new graph
    }
}

// ============================================================
// CALCULATION ENGINE
// ============================================================

class MarketCalculator {
    constructor(cy) {
        this.cy = cy;
    }

    // Get all children of a node (nodes connected as targets from this source)
    getChildren(nodeId) {
        const childEdges = this.cy.edges(`[source="${nodeId}"][type="segment_hierarchy"]`);
        return childEdges.map(edge => this.cy.getElementById(edge.data('target')));
    }

    // Check if node is a leaf (has no children)
    isLeaf(nodeId) {
        return this.getChildren(nodeId).length === 0;
    }

    // Calculate market segment value (recursive)
    calculateSegmentValue(nodeId) {
        const node = this.cy.getElementById(nodeId);
        
        if (!node || node.length === 0) {
            return 0;
        }

        // If it's a leaf node, return its user-input value
        if (this.isLeaf(nodeId)) {
            const value = node.data('value');
            return value ? parseFloat(value) : 0;
        }

        // If it's a parent node, sum all children
        const children = this.getChildren(nodeId);
        let total = 0;
        
        children.forEach(child => {
            total += this.calculateSegmentValue(child.id());
        });

        return total;
    }

    // Calculate problem node value (sum of incoming value edges)
    calculateProblemValue(problemNodeId) {
        // Get all value edges pointing to this problem
        const incomingEdges = this.cy.edges(`[target="${problemNodeId}"][type="value_edge"]`);

        let total = 0;
        incomingEdges.forEach(edge => {
            const sourceNodeId = edge.data('source');
            const segmentValue = this.calculateSegmentValue(sourceNodeId);
            
            // Get edge weight (dollar amount per user)
            const weightStr = edge.data('weight');
            let weight = 0;
            
            if (weightStr) {
                // Remove $ and parse
                weight = parseFloat(weightStr.toString().replace('$', '').replace(',', ''));
            }
            
            total += segmentValue * weight;
        });

        return total;
    }

    // Recalculate and update all nodes
    recalculateAll() {
        console.log('🔢 Recalculating all values...');
        
        // Calculate all market segments
        const segmentNodes = this.cy.nodes('[type="market_segment"]');
        segmentNodes.forEach(node => {
            const calculatedValue = this.calculateSegmentValue(node.id());
            node.data('calculatedValue', calculatedValue);
        });

        // Calculate all problems
        const problemNodes = this.cy.nodes('[type="problem"]');
        problemNodes.forEach(node => {
            const calculatedValue = this.calculateProblemValue(node.id());
            node.data('calculatedValue', calculatedValue);
        });

        console.log('✅ Recalculation complete');
        this.updateDisplayedValues();
    }

    // Update the displayed labels with calculated values
    updateDisplayedValues() {
        this.cy.nodes().forEach(node => {
            const label = node.data('label');
            const calculatedValue = node.data('calculatedValue') || 0;
            const type = node.data('type');
            
            let displayLabel = label;
            
            if (calculatedValue > 0) {
                if (type === 'market_segment') {
                    // Format as number with commas
                    displayLabel = `${label}\n${this.formatNumber(calculatedValue)}`;
                } else if (type === 'problem') {
                    // Format as currency
                    displayLabel = `${label}\n${this.formatCurrency(calculatedValue)}`;
                }
            }
            
            node.data('displayLabel', displayLabel);
            
            // Add visual classes to nodes based on their state
            if (type === 'market_segment') {
                const isLeaf = this.isLeaf(node.id());
                const hasValue = node.data('value') > 0;
                
                // Check if connected to a problem node
                const connectedToProblem = this.cy.edges(`[source="${node.id()}"][type="value_edge"]`).length > 0;
                
                if (isLeaf) {
                    node.removeClass('parent-node');
                    
                    // Priority: Connected to problem (GREEN) > Has value (ORANGE) > Default (RED)
                    if (connectedToProblem) {
                        node.addClass('connected-to-problem');
                        node.removeClass('valued-leaf');
                    } else if (hasValue) {
                        node.addClass('valued-leaf');
                        node.removeClass('connected-to-problem');
                    } else {
                        node.removeClass('valued-leaf');
                        node.removeClass('connected-to-problem');
                    }
                } else {
                    // Parent node - deep blue square
                    node.addClass('parent-node');
                    node.removeClass('valued-leaf');
                    node.removeClass('connected-to-problem');
                }
            }
        });
    }

    // Format number with commas
    formatNumber(num) {
        return Math.round(num).toLocaleString('en-US');
    }

    // Format as currency
    formatCurrency(num) {
        return '$' + Math.round(num).toLocaleString('en-US');
    }
}

// Initialize Cytoscape
function initializeCytoscape() {
    cy = cytoscape({
        container: document.getElementById('cy'),
        
        style: [
            // Market Segment Nodes - Default (Leaf without value) - RED
            {
                selector: 'node[type="market_segment"]',
                style: {
                    'background-color': '#E74C3C',
                    'label': 'data(displayLabel)',
                    'text-valign': 'center',
                    'text-halign': 'center',
                    'text-wrap': 'wrap',
                    'text-max-width': '85px',
                    'color': '#fff',
                    'font-size': '11px',
                    'width': '100px',
                    'height': '100px',
                    'border-width': 2,
                    'border-color': '#C0392B',
                }
            },
            // Leaf with value - ORANGE
            {
                selector: 'node[type="market_segment"].valued-leaf',
                style: {
                    'background-color': '#E67E22',
                    'border-color': '#D35400',
                }
            },
            // Leaf connected to problem - GREEN
            {
                selector: 'node[type="market_segment"].connected-to-problem',
                style: {
                    'background-color': '#27AE60',
                    'border-color': '#1E8449',
                }
            },
            // Parent nodes - DEEP BLUE square
            {
                selector: 'node[type="market_segment"].parent-node',
                style: {
                    'background-color': '#2C3E50',
                    'border-color': '#1A252F',
                    'border-width': 3,
                    'shape': 'round-rectangle'
                }
            },
            // Problem Nodes - square shape
            {
                selector: 'node[type="problem"]',
                style: {
                    'background-color': '#E85D75',
                    'label': 'data(displayLabel)',
                    'text-valign': 'center',
                    'text-halign': 'center',
                    'text-wrap': 'wrap',
                    'text-max-width': '85px',
                    'color': '#fff',
                    'font-size': '11px',
                    'width': '100px',
                    'height': '100px',
                    'border-width': 2,
                    'border-color': '#C23850',
                    'shape': 'round-rectangle'
                }
            },
            // Segment Hierarchy Edges
            {
                selector: 'edge[type="segment_hierarchy"]',
                style: {
                    'width': 2,
                    'line-color': '#95A5A6',
                    'target-arrow-color': '#95A5A6',
                    'target-arrow-shape': 'triangle',
                    'curve-style': 'bezier'
                }
            },
            // Value Edges
            {
                selector: 'edge[type="value_edge"]',
                style: {
                    'width': 3,
                    'line-color': '#27AE60',
                    'target-arrow-color': '#27AE60',
                    'target-arrow-shape': 'triangle',
                    'curve-style': 'bezier',
                    'label': 'data(weight)',
                    'font-size': '10px',
                    'color': '#27AE60'
                }
            },
            // Temporary edge (while drawing)
            {
                selector: 'edge.temporary-edge',
                style: {
                    'width': 2,
                    'line-color': '#3498db',
                    'line-style': 'dashed',
                    'target-arrow-color': '#3498db',
                    'target-arrow-shape': 'triangle',
                    'curve-style': 'bezier',
                    'opacity': 0.6
                }
            },
            // Temporary target node (invisible)
            {
                selector: 'node.temp-target-node',
                style: {
                    'width': 1,
                    'height': 1,
                    'opacity': 0,
                    'events': 'no'
                }
            }
        ],
        
        layout: {
            name: 'preset'
        }
    });
    
    // Initialize calculator
    calculator = new MarketCalculator(cy);
    
    setupEventHandlers();
}

// Setup event handlers
function setupEventHandlers() {
    // Left-click on node - start/complete edge drawing
    cy.on('tap', 'node', function(evt) {
        evt.preventDefault();
        
        // Left-click starts or completes edge drawing
        if (!edgeDrawingMode) {
            startEdgeDrawing(evt.target);
        } else {
            completeEdgeDrawing(evt.target);
        }
    });
    
    // Right-click on node - show context menu
    cy.on('cxttap', 'node', function(evt) {
        evt.preventDefault();
        const node = evt.target;
        const renderedPosition = evt.renderedPosition || evt.position;
        showContextMenu(node, renderedPosition.x, renderedPosition.y);
    });
    
    // Edge right-click - open edge context menu
    cy.on('cxttap', 'edge', function(evt) {
        evt.preventDefault();
        const edge = evt.target;
        const renderedPosition = evt.renderedPosition || evt.position;
        showEdgeContextMenu(edge, renderedPosition.x, renderedPosition.y);
    });
    
    // Canvas click - cancel edge drawing and hide menus
    cy.on('tap', function(evt) {
        if (evt.target === cy) {
            if (edgeDrawingMode) {
                cancelEdgeDrawing();
            }
            hideContextMenu();
            hideCanvasContextMenu();
        }
    });
    
    // Canvas right-click - show canvas context menu
    cy.on('cxttap', function(evt) {
        if (evt.target === cy) {
            const renderedPosition = evt.renderedPosition || evt.position;
            const graphPosition = evt.position;
            showCanvasContextMenu(renderedPosition.x, renderedPosition.y, graphPosition);
        }
    });
    
    // Mouse move - update temporary edge position
    cy.on('mousemove', function(evt) {
        if (edgeDrawingMode && temporaryEdge) {
            const pos = evt.position;
            
            // Create or update a temporary target node at mouse position
            let tempTarget = cy.getElementById('temp-target');
            if (!tempTarget.length) {
                tempTarget = cy.add({
                    group: 'nodes',
                    data: { id: 'temp-target' },
                    position: pos,
                    classes: 'temp-target-node'
                });
            } else {
                tempTarget.position(pos);
            }
            
            // Update the temporary edge to point to the temp target
            temporaryEdge.move({ target: 'temp-target' });
        }
    });
    
    // Node drag - update position
    cy.on('dragfree', 'node', function(evt) {
        const node = evt.target;
        updateNodePosition(node);
    });
    
    // Toolbar buttons
    document.getElementById('create-market-segment').addEventListener('click', createMarketSegmentNode);
    document.getElementById('create-problem').addEventListener('click', createProblemNode);
    document.getElementById('save-graph').addEventListener('click', saveGraph);
    document.getElementById('load-graph').addEventListener('click', loadGraph);
    
    // Modal buttons
    document.getElementById('save-value').addEventListener('click', saveNodeValue);
    document.getElementById('cancel-value').addEventListener('click', closeValueModal);
    document.getElementById('save-edge').addEventListener('click', saveEdgeWeight);
    document.getElementById('cancel-edge').addEventListener('click', closeEdgeModal);
    document.getElementById('save-name').addEventListener('click', saveNodeName);
    document.getElementById('cancel-name').addEventListener('click', closeNameModal);
    
    // Context menu items
    document.getElementById('menu-rename').addEventListener('click', function() {
        if (contextMenuNode) {
            selectedNode = contextMenuNode;
            hideContextMenu();
            openRenameModal();
        }
    });
    
    document.getElementById('menu-set-value').addEventListener('click', function() {
        if (contextMenuNode) {
            selectedNode = contextMenuNode;
            hideContextMenu();
            openValueModal();
        }
    });
    
    document.getElementById('menu-delete').addEventListener('click', async function() {
        if (contextMenuNode) {
            const node = contextMenuNode;
            hideContextMenu();
            
            // Confirm deletion
            if (confirm(`Are you sure you want to delete "${node.data('label')}"?\n\nThis will also delete all connected edges.`)) {
                await deleteNode(node);
            }
        }
    });
    
    // Canvas context menu items
    document.getElementById('menu-create-segment').addEventListener('click', function() {
        hideCanvasContextMenu();
        createMarketSegmentNode();
    });
    
    document.getElementById('menu-create-problem').addEventListener('click', function() {
        hideCanvasContextMenu();
        createProblemNode();
    });
    
    // Edge context menu items
    document.getElementById('menu-modify-edge').addEventListener('click', function() {
        if (contextMenuEdge) {
            selectedEdge = contextMenuEdge;
            hideEdgeContextMenu();
            openEdgeModal();
        }
    });
    
    document.getElementById('menu-delete-edge').addEventListener('click', async function() {
        if (contextMenuEdge) {
            const edge = contextMenuEdge;
            hideEdgeContextMenu();
            
            // Confirm deletion
            if (confirm('Are you sure you want to delete this edge?')) {
                await deleteEdge(edge);
            }
        }
    });
    
    // Keyboard support for name modal
    document.getElementById('node-name').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveNodeName();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            closeNameModal();
        }
    });
    
    // Close menus when clicking outside
    document.addEventListener('click', function(e) {
        const nodeMenu = document.getElementById('node-context-menu');
        const canvasMenu = document.getElementById('canvas-context-menu');
        const edgeMenu = document.getElementById('edge-context-menu');
        
        // Check if click is outside node menu
        if (nodeMenu.style.display !== 'none' && !nodeMenu.contains(e.target)) {
            hideContextMenu();
        }
        
        // Check if click is outside canvas menu
        if (canvasMenu.style.display !== 'none' && !canvasMenu.contains(e.target)) {
            hideCanvasContextMenu();
        }
        
        // Check if click is outside edge menu
        if (edgeMenu.style.display !== 'none' && !edgeMenu.contains(e.target)) {
            hideEdgeContextMenu();
        }
    });
}

// Create market segment node
async function createMarketSegmentNode() {
    if (!currentGraphId) {
        // Create a default graph first
        const graphData = await api('/api/graphs/', {
            method: 'POST',
            body: JSON.stringify({ name: 'New Market Analysis' })
        });
        currentGraphId = graphData.id;
    }
    
    // Store pending node data and open name modal
    pendingNodeData = {
        type: 'market_segment',
        x_position: Math.random() * 500 + 100,
        y_position: Math.random() * 400 + 100
    };
    
    openNameModal('Name Market Segment');
}

// Actually create the node after naming
async function finishCreateNode(name) {
    const nodeData = await api('/api/nodes/', {
        method: 'POST',
        body: JSON.stringify({
            graph_id: currentGraphId,
            type: pendingNodeData.type,
            label: name,
            x_position: pendingNodeData.x_position,
            y_position: pendingNodeData.y_position
        })
    });
    
    cy.add({
        group: 'nodes',
        data: {
            id: nodeData.id,
            type: nodeData.type,
            label: nodeData.label,
            value: nodeData.value,
            displayLabel: nodeData.label
        },
        position: {
            x: nodeData.x_position,
            y: nodeData.y_position
        }
    });
    
    calculator.recalculateAll();
    pendingNodeData = null;
}

// Create problem node
async function createProblemNode() {
    if (!currentGraphId) {
        const graphData = await api('/api/graphs/', {
            method: 'POST',
            body: JSON.stringify({ name: 'New Market Analysis' })
        });
        currentGraphId = graphData.id;
    }
    
    // Store pending node data and open name modal
    pendingNodeData = {
        type: 'problem',
        x_position: Math.random() * 500 + 100,
        y_position: Math.random() * 400 + 100
    };
    
    openNameModal('Name Problem');
}

// Modal functions
function openValueModal() {
    document.getElementById('value-modal').classList.add('active');
    const currentValue = selectedNode.data('value');
    document.getElementById('segment-value').value = currentValue || '';
}

function closeValueModal() {
    document.getElementById('value-modal').classList.remove('active');
    selectedNode = null;
}

async function saveNodeValue() {
    const value = parseFloat(document.getElementById('segment-value').value);
    
    await api(`/api/nodes/${selectedNode.id()}/`, {
        method: 'PATCH',
        body: JSON.stringify({ value })
    });
    
    selectedNode.data('value', value);
    calculator.recalculateAll();
    closeValueModal();
}

function openEdgeModal() {
    document.getElementById('edge-modal').classList.add('active');
    document.getElementById('edge-weight').value = selectedEdge.data('weight') || '';
    document.getElementById('edge-description').value = selectedEdge.data('description') || '';
}

function closeEdgeModal() {
    document.getElementById('edge-modal').classList.remove('active');
    selectedEdge = null;
}

async function saveEdgeWeight() {
    const weight = parseFloat(document.getElementById('edge-weight').value);
    const description = document.getElementById('edge-description').value;
    
    await api(`/api/edges/${selectedEdge.id()}/`, {
        method: 'PATCH',
        body: JSON.stringify({ weight, description })
    });
    
    selectedEdge.data('weight', `$${weight}`);
    selectedEdge.data('description', description);
    calculator.recalculateAll();
    closeEdgeModal();
}

// Name modal functions
function openNameModal(title) {
    document.getElementById('name-modal').classList.add('active');
    document.getElementById('name-modal-title').textContent = title;
    document.getElementById('node-name').value = '';
    document.getElementById('node-name').focus();
    isRenamingNode = false;
}

function openRenameModal() {
    document.getElementById('name-modal').classList.add('active');
    document.getElementById('name-modal-title').textContent = 'Rename Node';
    document.getElementById('node-name').value = selectedNode.data('label');
    document.getElementById('node-name').focus();
    document.getElementById('node-name').select();
    isRenamingNode = true;
}

function closeNameModal() {
    document.getElementById('name-modal').classList.remove('active');
    document.getElementById('node-name').value = '';
    pendingNodeData = null;
    selectedNode = null;
    isRenamingNode = false;
}

async function saveNodeName() {
    const name = document.getElementById('node-name').value.trim();
    
    if (!name) {
        alert('Please enter a name for the node');
        return;
    }
    
    if (isRenamingNode && selectedNode) {
        // Renaming existing node
        await api(`/api/nodes/${selectedNode.id()}/`, {
            method: 'PATCH',
            body: JSON.stringify({ label: name })
        });
        
        selectedNode.data('label', name);
        calculator.recalculateAll();
        closeNameModal();
    } else if (pendingNodeData) {
        // Creating new node
        await finishCreateNode(name);
        closeNameModal();
    }
}

// Update node position after drag
async function updateNodePosition(node) {
    const pos = node.position();
    await api(`/api/nodes/${node.id()}/`, {
        method: 'PATCH',
        body: JSON.stringify({
            x_position: pos.x,
            y_position: pos.y
        })
    });
}

// Delete node and its connected edges
async function deleteNode(node) {
    try {
        const nodeId = node.id();
        
        // Get all connected edges
        const connectedEdges = node.connectedEdges();
        
        // Delete all connected edges from backend
        for (const edge of connectedEdges) {
            try {
                await api(`/api/edges/${edge.id()}/`, {
                    method: 'DELETE'
                });
            } catch (error) {
                console.error(`Error deleting edge ${edge.id()}:`, error);
            }
        }
        
        // Delete the node from backend
        await api(`/api/nodes/${nodeId}/`, {
            method: 'DELETE'
        });
        
        // Remove from graph
        cy.remove(node);
        
        // Recalculate values
        calculator.recalculateAll();
        
        console.log(`Node ${nodeId} deleted successfully`);
    } catch (error) {
        console.error('Error deleting node:', error);
        alert('Failed to delete node. Please try again.');
    }
}

// Delete edge
async function deleteEdge(edge) {
    try {
        const edgeId = edge.id();
        
        // Delete the edge from backend
        await api(`/api/edges/${edgeId}/`, {
            method: 'DELETE'
        });
        
        // Remove from graph
        cy.remove(edge);
        
        // Recalculate values
        calculator.recalculateAll();
        
        console.log(`Edge ${edgeId} deleted successfully`);
    } catch (error) {
        console.error('Error deleting edge:', error);
        alert('Failed to delete edge. Please try again.');
    }
}

// Context Menu Functions

function showContextMenu(node, x, y) {
    hideCanvasContextMenu(); // Hide canvas menu if open
    contextMenuNode = node;
    const menu = document.getElementById('node-context-menu');
    const renameItem = document.getElementById('menu-rename');
    const setValueItem = document.getElementById('menu-set-value');
    const deleteItem = document.getElementById('menu-delete');
    
    // Determine which menu items to show based on node type
    const nodeType = node.data('type');
    const isLeaf = cy.edges(`[source="${node.id()}"][type="segment_hierarchy"]`).length === 0;
    
    // Show rename and delete for all nodes
    renameItem.style.display = 'block';
    deleteItem.style.display = 'block';
    
    // Show set value only for leaf market segment nodes
    if (nodeType === 'market_segment' && isLeaf) {
        setValueItem.style.display = 'block';
    } else {
        setValueItem.style.display = 'none';
    }
    
    // Position the menu near the click position
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    menu.style.display = 'block';
}

function hideContextMenu() {
    const menu = document.getElementById('node-context-menu');
    menu.style.display = 'none';
    contextMenuNode = null;
}

function showCanvasContextMenu(x, y, position) {
    hideContextMenu(); // Hide node menu if open
    canvasMenuPosition = position;
    const menu = document.getElementById('canvas-context-menu');
    
    // Position the menu near the click position
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    menu.style.display = 'block';
}

function hideCanvasContextMenu() {
    const menu = document.getElementById('canvas-context-menu');
    menu.style.display = 'none';
    canvasMenuPosition = null;
}

function showEdgeContextMenu(edge, x, y) {
    hideContextMenu(); // Hide node menu if open
    hideCanvasContextMenu(); // Hide canvas menu if open
    contextMenuEdge = edge;
    const menu = document.getElementById('edge-context-menu');
    const modifyItem = document.getElementById('menu-modify-edge');
    
    // Show modify option only for value edges
    if (edge.data('type') === 'value_edge') {
        modifyItem.style.display = 'block';
    } else {
        modifyItem.style.display = 'none';
    }
    
    // Position the menu near the click position
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    menu.style.display = 'block';
}

function hideEdgeContextMenu() {
    const menu = document.getElementById('edge-context-menu');
    menu.style.display = 'none';
    contextMenuEdge = null;
}

// Edge drawing functions

// Start edge drawing
function startEdgeDrawing(sourceNode) {
    edgeDrawingMode = true;
    edgeSourceNode = sourceNode;
    
    // Visual feedback - highlight source node
    sourceNode.addClass('edge-source');
    
    // Change cursor
    document.getElementById('cy').style.cursor = 'crosshair';
    
    // Create a temporary edge that will follow the mouse
    temporaryEdge = cy.add({
        group: 'edges',
        data: {
            id: 'temp-edge',
            source: sourceNode.id(),
            target: sourceNode.id(),
            isTemporary: true
        },
        classes: 'temporary-edge'
    });
    
    console.log('Edge drawing started from:', sourceNode.data('label'));
    console.log('Click on another node to create an edge, or click canvas to cancel');
}

// Complete edge drawing
async function completeEdgeDrawing(targetNode) {
    if (!edgeSourceNode || edgeSourceNode === targetNode) {
        cancelEdgeDrawing();
        return;
    }
    
    // Check if we have a graph ID
    if (!currentGraphId) {
        alert('Error: No active graph. Please create nodes first to initialize a graph.');
        cancelEdgeDrawing();
        return;
    }
    
    let sourceNode = edgeSourceNode;
    const sourceType = sourceNode.data('type');
    const targetType = targetNode.data('type');
    
    // Determine edge type based on node types
    let edgeType;
    let finalSourceId, finalTargetId;
    
    if (sourceType === 'market_segment' && targetType === 'market_segment') {
        edgeType = 'segment_hierarchy';
        finalSourceId = sourceNode.id();
        finalTargetId = targetNode.id();
    } else if (sourceType === 'market_segment' && targetType === 'problem') {
        edgeType = 'value_edge';
        finalSourceId = sourceNode.id();
        finalTargetId = targetNode.id();
    } else if (sourceType === 'problem' && targetType === 'market_segment') {
        // Reverse direction for value edges - always segment -> problem
        edgeType = 'value_edge';
        finalSourceId = targetNode.id();  // Market segment is now source
        finalTargetId = sourceNode.id();  // Problem is now target
    } else {
        alert('Invalid edge connection!\n\nValid connections:\n- Market Segment → Market Segment (hierarchy)\n- Market Segment → Problem (value edge)');
        cancelEdgeDrawing();
        return;
    }
    
    // Check if an edge already exists between these nodes
    const existingEdge = cy.edges(`[source="${finalSourceId}"][target="${finalTargetId}"]`);
    if (existingEdge.length > 0) {
        alert('An edge already exists between these nodes.');
        cancelEdgeDrawing();
        return;
    }
    
    // Log for debugging
    console.log('Creating edge:', {
        graph_id: currentGraphId,
        source_node_id: finalSourceId,
        target_node_id: finalTargetId,
        type: edgeType
    });
    
    try {
        // Create edge in backend
        const edgeData = await api('/api/edges/', {
            method: 'POST',
            body: JSON.stringify({
                graph_id: currentGraphId,
                source_node_id: finalSourceId,
                target_node_id: finalTargetId,
                type: edgeType,
                weight: edgeType === 'value_edge' ? 0 : null,
                description: ''
            })
        });
        
        console.log('Edge created successfully:', edgeData);
        
        // Add edge to graph
        cy.add({
            group: 'edges',
            data: {
                id: edgeData.id,
                source: edgeData.source_node_id,
                target: edgeData.target_node_id,
                type: edgeType,
                weight: edgeType === 'value_edge' ? '$0' : '',
                description: ''
            }
        });
        
        // If a hierarchy edge was created, check if the source node just became a parent
        // If so, clear its stored value since parent nodes shouldn't have manual values
        if (edgeType === 'segment_hierarchy') {
            const sourceNodeObj = cy.getElementById(finalSourceId);
            if (sourceNodeObj.data('value') > 0) {
                // Clear the stored value both in frontend and backend
                sourceNodeObj.data('value', 0);
                await api(`/api/nodes/${finalSourceId}/`, {
                    method: 'PATCH',
                    body: JSON.stringify({ value: 0 })
                });
            }
        }
        
        calculator.recalculateAll();
        
        // If it's a value edge, prompt for weight
        if (edgeType === 'value_edge') {
            const newEdge = cy.edges(`[id="${edgeData.id}"]`);
            selectedEdge = newEdge;
            setTimeout(() => openEdgeModal(), 100);
        }
        
    } catch (error) {
        console.error('Error creating edge:', error);
        alert('Failed to create edge.\n\nError: ' + (error.error || error.message || 'Unknown error') + '\n\nCheck browser console for details.');
    }
    
    cancelEdgeDrawing();
}

// Cancel edge drawing
function cancelEdgeDrawing() {
    if (edgeSourceNode) {
        edgeSourceNode.removeClass('edge-source');
    }
    
    // Remove temporary edge and target node
    if (temporaryEdge) {
        cy.remove(temporaryEdge);
        temporaryEdge = null;
    }
    const tempTarget = cy.getElementById('temp-target');
    if (tempTarget.length) {
        cy.remove(tempTarget);
    }
    
    edgeDrawingMode = false;
    edgeSourceNode = null;
    
    document.getElementById('cy').style.cursor = 'default';
    console.log('Edge drawing cancelled');
}

// Save/Load functions
async function saveGraph() {
    alert('Graph auto-saves on every change!');
}

async function loadGraph() {
    const response = await api('/api/graphs/');
    const graphs = response.graphs || response || [];
    
    if (graphs && graphs.length > 0) {
        const graphId = graphs[0].id;
        const graphData = await api(`/api/graphs/${graphId}/`);
        loadGraphData(graphData);
    }
}

function loadGraphData(graphData) {
    cy.elements().remove();
    currentGraphId = graphData.graph.id;
    
    // Add nodes
    graphData.nodes.forEach(node => {
        cy.add({
            group: 'nodes',
            data: {
                id: node.id,
                type: node.type,
                label: node.label,
                value: node.value,
                displayLabel: node.label
            },
            position: {
                x: node.x_position,
                y: node.y_position
            }
        });
    });
    
    // Add edges
    graphData.edges.forEach(edge => {
        cy.add({
            group: 'edges',
            data: {
                id: edge.id,
                source: edge.source_node_id,
                target: edge.target_node_id,
                type: edge.type,
                weight: edge.weight ? `$${edge.weight}` : '',
                description: edge.description
            }
        });
    });
    
    calculator.recalculateAll();
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize Supabase
    initializeSupabase();
    
    // Initialize Cytoscape
    initializeCytoscape();
    
    // Check authentication status
    await checkAuthStatus();
    
    // Setup auth event listeners
    document.getElementById('show-login').addEventListener('click', showLoginModal);
    document.getElementById('show-signup').addEventListener('click', showSignupModal);
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    
    document.getElementById('login-submit').addEventListener('click', handleLogin);
    document.getElementById('cancel-login').addEventListener('click', closeLoginModal);
    
    document.getElementById('signup-submit').addEventListener('click', handleSignup);
    document.getElementById('cancel-signup').addEventListener('click', closeSignupModal);
    
    document.getElementById('switch-to-signup').addEventListener('click', (e) => {
        e.preventDefault();
        closeLoginModal();
        showSignupModal();
    });
    
    document.getElementById('switch-to-login').addEventListener('click', (e) => {
        e.preventDefault();
        closeSignupModal();
        showLoginModal();
    });
    
    // Add Enter key support for login
    document.getElementById('login-password').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleLogin();
        }
    });
    
    // Add Enter key support for signup
    document.getElementById('signup-password-confirm').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSignup();
        }
    });
    
    // Listen for auth state changes
    if (supabase) {
        supabase.auth.onAuthStateChange((event, session) => {
            console.log('Auth state changed:', event, session);
            if (event === 'SIGNED_IN') {
                currentUser = session.user;
                updateAuthUI(true);
            } else if (event === 'SIGNED_OUT') {
                currentUser = null;
                updateAuthUI(false);
            }
        });
    }
});

