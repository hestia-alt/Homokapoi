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
let inlineEditInput = null;
let editingNode = null;
let lastMousePosition = null; // Track mouse position for node creation

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
// NOTIFICATION SYSTEM - Gentle Alerts
// ============================================================

function showNotification(message, type = 'error', duration = 5000) {
    const container = document.getElementById('notification-container');
    if (!container) return;
    
    const notification = document.createElement('div');
    notification.className = `notification ${type === 'success' ? 'notification-success' : type === 'info' ? 'notification-info' : ''}`;
    notification.textContent = message;
    
    container.appendChild(notification);
    
    // Auto-remove after duration
    setTimeout(() => {
        notification.classList.add('removing');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, duration);
    
    // Allow manual dismissal on click
    notification.addEventListener('click', () => {
        notification.classList.add('removing');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    });
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
        showNotification('Error logging out. Please try again.');
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
        
        // Update hearth visual effects after recalculation
        setTimeout(() => {
            if (typeof updateNodeAnimations === 'function') {
                updateNodeAnimations();
            }
            if (typeof updateEdgeAnimations === 'function') {
                updateEdgeAnimations();
            }
        }, 200);
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
                
                // Check if has any connections (incoming or outgoing)
                const hasOutgoingEdges = this.cy.edges(`[source="${node.id()}"]`).length > 0;
                const hasIncomingEdges = this.cy.edges(`[target="${node.id()}"]`).length > 0;
                const hasConnections = hasOutgoingEdges || hasIncomingEdges;
                
                if (isLeaf) {
                    node.removeClass('parent-node');
                    
                    // Check for no value and no connections - light red
                    if (!hasValue && !hasConnections) {
                        node.addClass('no-value-no-connections');
                        node.removeClass('valued-leaf');
                        node.removeClass('connected-to-problem');
                    }
                    // Priority: Connected to problem (GREEN) > Has value (ORANGE) > Default (RED)
                    else if (connectedToProblem) {
                        node.addClass('connected-to-problem');
                        node.removeClass('valued-leaf');
                        node.removeClass('no-value-no-connections');
                    } else if (hasValue) {
                        node.addClass('valued-leaf');
                        node.removeClass('connected-to-problem');
                        node.removeClass('no-value-no-connections');
                    } else {
                        node.removeClass('valued-leaf');
                        node.removeClass('connected-to-problem');
                        node.removeClass('no-value-no-connections');
                    }
                } else {
                    // Parent node - circle
                    node.addClass('parent-node');
                    node.removeClass('valued-leaf');
                    node.removeClass('connected-to-problem');
                    node.removeClass('no-value-no-connections');
                }
            } else if (type === 'problem') {
                // Check if problem node is connected to any leaf nodes
                const connectedToLeaf = this.cy.edges(`[target="${node.id()}"][type="value_edge"]`).length > 0;
                
                if (connectedToLeaf) {
                    node.addClass('connected-to-leaf');
                } else {
                    node.removeClass('connected-to-leaf');
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
            // Market Segment Nodes - Default (Leaf without value and no connections) - Light Red
            // Base state: starting point, no value, no connections
            {
                selector: 'node[type="market_segment"].no-value-no-connections',
                style: {
                    'background-color': '#FFCCCB', // Light Red
                    'label': 'data(displayLabel)',
                    'text-valign': 'center',
                    'text-halign': 'center',
                    'text-wrap': 'wrap',
                    'text-max-width': '100px',
                    'color': '#6B4F3B', // Anchor Bronze
                    'font-size': '12px',
                    'font-weight': '500',
                    'font-family': 'Inter, Helvetica Neue, sans-serif',
                    'width': '120px',
                    'height': '120px',
                    'border-width': 0,
                    'shape': 'ellipse' // Circle by default
                }
            },
            // Market Segment Nodes - Default (Leaf without value) - Soft Ember
            // Base state: starting point, muted tone
            {
                selector: 'node[type="market_segment"]',
                style: {
                    'background-color': '#FAD7C0', // Soft Ember - muted, starting point
                    'label': 'data(displayLabel)',
                    'text-valign': 'center',
                    'text-halign': 'center',
                    'text-wrap': 'wrap',
                    'text-max-width': '100px',
                    'color': '#6B4F3B', // Anchor Bronze
                    'font-size': '12px',
                    'font-weight': '500',
                    'font-family': 'Inter, Helvetica Neue, sans-serif',
                    'width': '120px',
                    'height': '120px',
                    'border-width': 0,
                    'shape': 'ellipse' // Circle by default
                }
            },
            // Leaf with value - Hot Coal (brighter red-orange, glowing)
            // Progress state: active hot coals
            {
                selector: 'node[type="market_segment"].valued-leaf',
                style: {
                    'background-color': '#E5501E', // Bright red-orange - hot coal
                    'border-width': 3,
                    'border-color': '#D94A1E', // Deep red-orange border
                    'shape': 'ellipse', // Circle
                    'color': '#FFFFFF' // White text
                }
            },
            // Leaf connected to problem - Active Hot Coal (brightest)
            // Success state: fully activated, connected to hearth
            {
                selector: 'node[type="market_segment"].connected-to-problem',
                style: {
                    'background-color': '#D94A1E', // Deep red-orange - active hot coal
                    'border-width': 4,
                    'border-color': '#FFA82E', // Bright orange border - fire spirit
                    'shape': 'ellipse', // Circle
                    'color': '#FFFFFF' // White text
                }
            },
            // Parent nodes - Charcoal Coal with Pulsing Embers
            // The foundational coals (Oikos)
            {
                selector: 'node[type="market_segment"].parent-node',
                style: {
                    'background-color': '#2C2C2C', // Dark charcoal/coal
                    'border-width': 2,
                    'border-color': '#1A1A1A', // Very dark outline
                    'shape': 'ellipse', // Circle
                    'color': '#D94A1E' // Amber red text
                }
            },
            // Problem Nodes - Default (not connected) - Dormant Hearth
            {
                selector: 'node[type="problem"]',
                style: {
                    'background-color': '#D94A1E', // Deep amber red - hearth base
                    'label': 'data(displayLabel)',
                    'text-valign': 'center',
                    'text-halign': 'center',
                    'text-wrap': 'wrap',
                    'text-max-width': '100px',
                    'color': '#F4F1EA', // Woolen White - light text on dark hearth
                    'font-size': '12px',
                    'font-weight': '500',
                    'font-family': 'Inter, Helvetica Neue, sans-serif',
                    'width': '120px',
                    'height': '120px',
                    'border-width': 3,
                    'border-color': 'rgba(217, 74, 30, 0.6)', // Deep red-orange border
                    'shape': 'round-rectangle'
                }
            },
            // Problem Nodes - Connected to leaf - Active Hearth Receiving Fire
            {
                selector: 'node[type="problem"].connected-to-leaf',
                style: {
                    'background-color': '#D94A1E', // Deep amber red
                    'border-width': 4,
                    'border-color': 'rgba(255, 168, 46, 0.9)', // Bright orange border - receiving energy
                    'shape': 'round-rectangle'
                }
            },
            // Segment Hierarchy Edges - Path of Potential (dark with ember particles)
            // The path from Oikos (foundational coals) to leaf nodes
            {
                selector: 'edge[type="segment_hierarchy"]',
                style: {
                    'width': 2.5,
                    'line-color': '#464646', // Dark gray - subtle path
                    'target-arrow-color': '#464646', // Dark gray arrow
                    'target-arrow-shape': 'triangle',
                    'curve-style': 'unbundled-bezier',
                    'control-point-distances': [40, -40],
                    'control-point-weights': [0.25, 0.75],
                    'opacity': 0.6,
                    'line-dash-pattern': [8, 4], // Dashed pattern for particle effect base
                    'transition-property': 'opacity',
                    'transition-duration': '0.3s'
                }
            },
            // Value Edges - Fire Spirit (flowing energy from leaf to hearth)
            // The flowing fire anima from hot coals to the prytaneion
            {
                selector: 'edge[type="value_edge"]',
                style: {
                    'width': 5,
                    'line-color': '#FFA82E', // Bright fiery orange - fire spirit
                    'target-arrow-color': '#FFA82E', // Bright orange arrow
                    'target-arrow-shape': 'triangle',
                    'curve-style': 'unbundled-bezier',
                    'control-point-distances': [40, -40],
                    'control-point-weights': [0.25, 0.75],
                    'label': 'data(weight)',
                    'font-size': '11px',
                    'font-weight': '600',
                    'color': '#6B4F3B', // Anchor Bronze
                    'text-background-color': '#F4F1EA', // Woolen White
                    'text-background-opacity': 0.9,
                    'text-background-padding': '4px',
                    'text-background-shape': 'roundrectangle',
                    'opacity': 0.95,
                    'line-dash-pattern': [10, 5], // Dashed pattern for flow animation
                    'transition-property': 'width, opacity',
                    'transition-duration': '0.3s'
                }
            },
            // Temporary edge (while drawing) - Pale Flame dashed
            {
                selector: 'edge.temporary-edge',
                style: {
                    'width': 3,
                    'line-color': '#FFEECB', // Pale Flame
                    'line-style': 'dashed',
                    'target-arrow-color': '#FFEECB', // Pale Flame
                    'target-arrow-shape': 'triangle',
                    'curve-style': 'unbundled-bezier',
                    'control-point-distances': [40, -40],
                    'control-point-weights': [0.25, 0.75],
                    'opacity': 0.5
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
    
    // Apply hearth visual effects
    applyHearthEffects();
    
    setupEventHandlers();
}

// ============================================================
// HEARTH VISUAL EFFECTS - Apply Sacred Fire Animations
// ============================================================

function applyHearthEffects() {
    if (!cy) return;
    
    // Use MutationObserver to watch for SVG changes and reapply animations
    const container = cy.container();
    if (!container) return;
    
    let observer = null;
    
    const setupObserver = () => {
        const svg = container.querySelector('svg');
        if (svg && !observer) {
            observer = new MutationObserver(() => {
                // Debounce rapid changes
                clearTimeout(window.hearthAnimationTimeout);
                window.hearthAnimationTimeout = setTimeout(() => {
                    updateNodeAnimations();
                    updateEdgeAnimations();
                }, 150);
            });
            
            observer.observe(svg, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['id', 'class']
            });
        }
    };
    
    // Apply animations to all nodes when Cytoscape is ready
    cy.ready(() => {
        setTimeout(() => {
            setupObserver();
            updateNodeAnimations();
            updateEdgeAnimations();
        }, 300);
    });
    
    // Update animations when nodes are added
    cy.on('add', 'node', function(evt) {
        setTimeout(() => {
            updateNodeAnimations();
            updateEdgeAnimations();
        }, 150);
    });
    
    // Update animations when edges are added
    cy.on('add', 'edge', function(evt) {
        setTimeout(() => {
            updateEdgeAnimations();
            updateNodeAnimations();
        }, 150);
    });
    
    // Update animations when nodes are removed
    cy.on('remove', 'node', function(evt) {
        setTimeout(() => {
            updateNodeAnimations();
            updateEdgeAnimations();
        }, 150);
    });
    
    // Update animations when edges are removed
    cy.on('remove', 'edge', function(evt) {
        setTimeout(() => {
            updateEdgeAnimations();
            updateNodeAnimations();
        }, 150);
    });
    
    // Update animations when graph layout changes or nodes are repositioned
    cy.on('layoutstop', function() {
        setTimeout(() => {
            updateNodeAnimations();
            updateEdgeAnimations();
        }, 150);
    });
    
    // Also update on render events
    cy.on('render', function() {
        setTimeout(() => {
            updateNodeAnimations();
            updateEdgeAnimations();
        }, 50);
    });
}

function updateNodeAnimations() {
    if (!cy) return;
    
    // Wait for Cytoscape to finish rendering
    setTimeout(() => {
        const container = cy.container();
        if (!container) return;
        
        const svg = container.querySelector('svg');
        if (!svg) return;
        
        // Clear all previous hearth types
        svg.querySelectorAll('[data-hearth-type]').forEach(el => {
            el.removeAttribute('data-hearth-type');
        });
        
        // Apply animations to parent nodes (charcoal coals with embers)
        const parentNodes = cy.nodes('.parent-node');
        parentNodes.forEach((node, index) => {
            applyAnimationToNode(node.id(), 'pulse-ember', index * 0.5, 5);
        });
        
        // Apply hot coal animation to leaf nodes connected to problems
        const connectedLeafNodes = cy.nodes('.connected-to-problem');
        connectedLeafNodes.forEach((node, index) => {
            // Apply hot-coal first, then heat-distortion will upgrade it to hot-coal-connected
            applyAnimationToNode(node.id(), 'pulse-hot-coal', 0, 3);
            applyAnimationToNode(node.id(), 'heat-distortion', 0, 4);
        });
        
        // Apply hot coal animation to valued leaf nodes
        const valuedLeafNodes = cy.nodes('.valued-leaf');
        valuedLeafNodes.forEach((node, index) => {
            applyAnimationToNode(node.id(), 'pulse-hot-coal', index * 0.4, 3);
        });
        
        // Apply hearth pulse animation to problem nodes
        const problemNodes = cy.nodes('[type="problem"]');
        problemNodes.forEach((node, index) => {
            const animationName = node.hasClass('connected-to-leaf') ? 'hearth-receiving' : 'hearth-pulse';
            applyAnimationToNode(node.id(), animationName, index * 0.5, 3);
        });
    }, 100);
}

function applyAnimationToNode(nodeId, animationName, delay, duration) {
    const container = cy.container();
    if (!container) return;
    
    const svg = container.querySelector('svg');
    if (!svg) return;
    
    // Try multiple strategies to find the node element
    let nodeGroup = null;
    
    // Strategy 1: Direct ID lookup
    nodeGroup = svg.querySelector(`#${nodeId}`);
    
    // Strategy 2: Find by data-id attribute
    if (!nodeGroup) {
        const allGroups = svg.querySelectorAll('g');
        for (let g of allGroups) {
            if (g.id === nodeId || g.getAttribute('data-id') === nodeId) {
                nodeGroup = g;
                break;
            }
        }
    }
    
    // Strategy 3: Find by Cytoscape's cy-node class and check data
    if (!nodeGroup) {
        const cyNodes = svg.querySelectorAll('g.cy-node');
        for (let nodeEl of cyNodes) {
            // Cytoscape stores node ID in the element's data or as a class
            if (nodeEl.id === nodeId || 
                nodeEl.classList.contains(`cy-node-${nodeId}`) ||
                nodeEl.querySelector(`[data-id="${nodeId}"]`)) {
                nodeGroup = nodeEl;
                break;
            }
        }
    }
    
    // Strategy 4: Try finding by the node's position if we have the node object
    if (!nodeGroup && cy) {
        const node = cy.getElementById(nodeId);
        if (node && node.length > 0) {
            // Use Cytoscape's rendered position to find the element
            const pos = node.renderedPosition();
            const cyNodes = svg.querySelectorAll('g.cy-node');
            for (let nodeEl of cyNodes) {
                const transform = nodeEl.getAttribute('transform');
                if (transform && transform.includes(`translate(${Math.round(pos.x)},${Math.round(pos.y)})`)) {
                    nodeGroup = nodeEl;
                    break;
                }
            }
        }
    }
    
    if (nodeGroup) {
        applyHearthType(nodeGroup, animationName);
    }
}

function applyHearthType(nodeGroup, animationName) {
    // Remove previous hearth types
    nodeGroup.removeAttribute('data-hearth-type');
    
    // Map animation names to hearth types
    const hearthTypeMap = {
        'pulse-ember': 'parent-coal',
        'pulse-hot-coal': 'hot-coal',
        'heat-distortion': null, // Applied together with hot-coal
        'hearth-pulse': 'hearth-dormant',
        'hearth-receiving': 'hearth-active'
    };
    
    const hearthType = hearthTypeMap[animationName];
    if (hearthType) {
        nodeGroup.setAttribute('data-hearth-type', hearthType);
    }
    
    // Special handling for connected leaf nodes (hot-coal + heat-distortion)
    if (animationName === 'heat-distortion') {
        // This will be applied together with hot-coal
        const existingType = nodeGroup.getAttribute('data-hearth-type');
        if (existingType === 'hot-coal') {
            nodeGroup.setAttribute('data-hearth-type', 'hot-coal-connected');
        }
    }
}

function applyAnimationToEdge(edgeId, animationName) {
    const container = cy.container();
    if (!container) return;
    
    const svg = container.querySelector('svg');
    if (!svg) return;
    
    const edgeGroup = svg.querySelector(`#${edgeId}`) || 
                      svg.querySelector(`[id="${edgeId}"]`);
    
    if (!edgeGroup) {
        // Try finding by Cytoscape's internal structure
        const cyEdges = svg.querySelectorAll('g.cy-edge');
        for (let edgeEl of cyEdges) {
            if (edgeEl.id === edgeId || edgeEl.getAttribute('data-id') === edgeId) {
                edgeEl.setAttribute('data-hearth-type', 'fire-spirit');
                return;
            }
        }
        return;
    }
    
    if (animationName === 'flow-fire') {
        edgeGroup.setAttribute('data-hearth-type', 'fire-spirit');
    }
}

function updateEdgeAnimations() {
    if (!cy) return;
    
    // Wait for Cytoscape to finish rendering
    setTimeout(() => {
        const container = cy.container();
        if (!container) return;
        
        const svg = container.querySelector('svg');
        if (!svg) return;
        
        // Ensure defs exists for filters
        let defs = svg.querySelector('defs');
        if (!defs) {
            defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
            svg.insertBefore(defs, svg.firstChild);
        }
        
        // Create fire glow filter if it doesn't exist
        let glowFilter = defs.querySelector('#fire-glow-filter');
        if (!glowFilter) {
            glowFilter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
            glowFilter.setAttribute('id', 'fire-glow-filter');
            glowFilter.setAttribute('x', '-50%');
            glowFilter.setAttribute('y', '-50%');
            glowFilter.setAttribute('width', '200%');
            glowFilter.setAttribute('height', '200%');
            
            const feGaussianBlur = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur');
            feGaussianBlur.setAttribute('stdDeviation', '3');
            feGaussianBlur.setAttribute('result', 'coloredBlur');
            
            const feMerge = document.createElementNS('http://www.w3.org/2000/svg', 'feMerge');
            const feMergeNode1 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
            feMergeNode1.setAttribute('in', 'coloredBlur');
            const feMergeNode2 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
            feMergeNode2.setAttribute('in', 'SourceGraphic');
            
            feMerge.appendChild(feMergeNode1);
            feMerge.appendChild(feMergeNode2);
            glowFilter.appendChild(feGaussianBlur);
            glowFilter.appendChild(feMerge);
            defs.appendChild(glowFilter);
        }
        
        // Apply flowing fire animation to value edges (leaf to problem)
        const valueEdges = cy.edges('[type="value_edge"]');
        valueEdges.forEach((edge, index) => {
            const edgeId = edge.id();
            applyAnimationToEdge(edgeId, 'flow-fire');
            
            // Also apply glow filter
            const edgeGroup = svg.querySelector(`#${edgeId}`) || svg.querySelector(`[id="${edgeId}"]`);
            if (edgeGroup) {
                const path = edgeGroup.querySelector('path');
                if (path) {
                    path.setAttribute('filter', 'url(#fire-glow-filter)');
                }
            }
        });
    }, 100);
}

// Note: Particle flow animation would require calculating bezier paths
// This is a placeholder for future enhancement - the visual foundation is set
// with the dashed lines and color scheme on hierarchy edges

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
    
    // Double-click on node - rename it inline
    cy.on('dbltap', 'node', function(evt) {
        evt.preventDefault();
        
        // Don't rename if we're in edge drawing mode
        if (edgeDrawingMode) {
            return;
        }
        
        const node = evt.target;
        startInlineEdit(node);
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
            // Cancel inline editing if active
            if (inlineEditInput && inlineEditInput.style.display !== 'none') {
                cancelInlineEdit();
            }
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
    
    // Mouse move - update temporary edge position and track mouse for node creation
    // Use mouse move on the container for better tracking
    const cyContainer = document.getElementById('cy');
    cyContainer.addEventListener('mousemove', function(evt) {
        // Track mouse position for node creation
        const containerRect = cyContainer.getBoundingClientRect();
        const renderedX = evt.clientX - containerRect.left;
        const renderedY = evt.clientY - containerRect.top;
        
        // Convert rendered coordinates to graph coordinates
        const pan = cy.pan();
        const zoom = cy.zoom();
        lastMousePosition = {
            x: (renderedX - pan.x) / zoom,
            y: (renderedY - pan.y) / zoom
        };
        
        if (edgeDrawingMode && edgeSourceNode) {
            // Use the tracked mouse position (already converted to graph coordinates)
            const pos = lastMousePosition || { x: 0, y: 0 };
            
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
            if (temporaryEdge) {
                temporaryEdge.move({ target: 'temp-target' });
            }
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
    // Note: save-graph and load-graph buttons removed (graphs auto-save with authentication)
    // document.getElementById('save-graph').addEventListener('click', saveGraph);
    // document.getElementById('load-graph').addEventListener('click', loadGraph);
    
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
        if (canvasMenuPosition) {
            createMarketSegmentNode(canvasMenuPosition);
        } else {
            createMarketSegmentNode();
        }
    });
    
    document.getElementById('menu-create-problem').addEventListener('click', function() {
        hideCanvasContextMenu();
        if (canvasMenuPosition) {
            createProblemNode(canvasMenuPosition);
        } else {
            createProblemNode();
        }
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
async function createMarketSegmentNode(position = null) {
    if (!currentGraphId) {
        // Create a default graph first
        const graphData = await api('/api/graphs/', {
            method: 'POST',
            body: JSON.stringify({ name: 'New Market Analysis' })
        });
        currentGraphId = graphData.id;
        
        // Update graph name input
        const graphNameInput = document.getElementById('graph-name');
        if (graphNameInput && graphData.name) {
            graphNameInput.value = graphData.name;
        }
    }
    
    // Generate a default name with a counter
    const existingNodes = cy.nodes('[type="market_segment"]');
    const defaultName = existingNodes.length > 0 
        ? `Market Segment ${existingNodes.length + 1}`
        : 'Market Segment';
    
    // Use provided position, mouse position, or center of viewport
    let nodePosition;
    if (position) {
        nodePosition = position;
    } else if (lastMousePosition) {
        nodePosition = lastMousePosition;
    } else {
        // Fallback: center of viewport
        const container = cy.container();
        const containerRect = container.getBoundingClientRect();
        const centerX = containerRect.width / 2;
        const centerY = containerRect.height / 2;
        const pan = cy.pan();
        const zoom = cy.zoom();
        nodePosition = {
            x: (centerX - pan.x) / zoom,
            y: (centerY - pan.y) / zoom
        };
    }
    
    // Create node immediately with default name
    const nodeData = await api('/api/nodes/', {
        method: 'POST',
        body: JSON.stringify({
            graph_id: currentGraphId,
            type: 'market_segment',
            label: defaultName,
            x_position: nodePosition.x,
            y_position: nodePosition.y
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
async function createProblemNode(position = null) {
    if (!currentGraphId) {
        const graphData = await api('/api/graphs/', {
            method: 'POST',
            body: JSON.stringify({ name: 'New Market Analysis' })
        });
        currentGraphId = graphData.id;
        
        // Update graph name input
        const graphNameInput = document.getElementById('graph-name');
        if (graphNameInput && graphData.name) {
            graphNameInput.value = graphData.name;
        }
    }
    
    // Generate a default name with a counter
    const existingNodes = cy.nodes('[type="problem"]');
    const defaultName = existingNodes.length > 0 
        ? `Problem ${existingNodes.length + 1}`
        : 'Problem';
    
    // Use provided position, mouse position, or center of viewport
    let nodePosition;
    if (position) {
        nodePosition = position;
    } else if (lastMousePosition) {
        nodePosition = lastMousePosition;
    } else {
        // Fallback: center of viewport
        const container = cy.container();
        const containerRect = container.getBoundingClientRect();
        const centerX = containerRect.width / 2;
        const centerY = containerRect.height / 2;
        const pan = cy.pan();
        const zoom = cy.zoom();
        nodePosition = {
            x: (centerX - pan.x) / zoom,
            y: (centerY - pan.y) / zoom
        };
    }
    
    // Create node immediately with default name
    const nodeData = await api('/api/nodes/', {
        method: 'POST',
        body: JSON.stringify({
            graph_id: currentGraphId,
            type: 'problem',
            label: defaultName,
            x_position: nodePosition.x,
            y_position: nodePosition.y
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
        showNotification('Please enter a name for the node');
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

// Inline editing functions
function startInlineEdit(node) {
    // Cancel any existing inline edit
    if (inlineEditInput) {
        cancelInlineEdit();
    }
    
    editingNode = node;
    const nodePos = node.renderedPosition();
    const nodeWidth = node.width();
    
    // Create or get inline edit input
    if (!inlineEditInput) {
        inlineEditInput = document.createElement('input');
        inlineEditInput.type = 'text';
        inlineEditInput.className = 'inline-edit-input';
        inlineEditInput.style.cssText = `
            position: absolute;
            background: #F4F1EA;
            border: 2px solid #6B4F3B;
            border-radius: 4px;
            padding: 4px 8px;
            font-size: 12px;
            font-weight: 500;
            font-family: Inter, Helvetica Neue, sans-serif;
            color: #6B4F3B;
            z-index: 10001;
            outline: none;
            text-align: center;
            min-width: 80px;
            max-width: 200px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        `;
        document.body.appendChild(inlineEditInput);
        
        // Handle Enter key
        inlineEditInput.addEventListener('keydown', function(evt) {
            if (evt.key === 'Enter') {
                evt.preventDefault();
                finishInlineEdit();
            } else if (evt.key === 'Escape') {
                evt.preventDefault();
                cancelInlineEdit();
            }
        });
        
        // Handle blur
        inlineEditInput.addEventListener('blur', function() {
            finishInlineEdit();
        });
    }
    
    // Set position and value
    const cyContainer = document.getElementById('cy').getBoundingClientRect();
    const zoom = cy.zoom();
    
    // Position the input at the center-top of the node
    inlineEditInput.value = node.data('label');
    inlineEditInput.style.left = (cyContainer.left + nodePos.x - 50) + 'px';
    inlineEditInput.style.top = (cyContainer.top + nodePos.y - nodeWidth / 2 - 25) + 'px';
    inlineEditInput.style.fontSize = (12 / zoom) + 'px';
    inlineEditInput.style.display = 'block';
    inlineEditInput.focus();
    inlineEditInput.select();
}

async function finishInlineEdit() {
    if (!editingNode || !inlineEditInput) {
        return;
    }
    
    const newName = inlineEditInput.value.trim();
    
    if (!newName) {
        cancelInlineEdit();
        return;
    }
    
    if (newName !== editingNode.data('label')) {
        // Update node label
        try {
            await api(`/api/nodes/${editingNode.id()}/`, {
                method: 'PATCH',
                body: JSON.stringify({ label: newName })
            });
            
            editingNode.data('label', newName);
            calculator.recalculateAll();
        } catch (error) {
            console.error('Error updating node name:', error);
            showNotification('Failed to update node name. Please try again.');
        }
    }
    
    cancelInlineEdit();
}

function cancelInlineEdit() {
    if (inlineEditInput) {
        inlineEditInput.style.display = 'none';
        inlineEditInput.value = '';
    }
    editingNode = null;
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
        showNotification('Failed to delete node. Please try again.');
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
        showNotification('Failed to delete edge. Please try again.');
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
    
    // Get source node position
    const sourcePos = sourceNode.position();
    
    // Create temporary target node at source position initially (will be updated on mousemove)
    const tempTarget = cy.add({
        group: 'nodes',
        data: { id: 'temp-target' },
        position: { x: sourcePos.x + 100, y: sourcePos.y + 100 }, // Offset to make edge visible
        classes: 'temp-target-node'
    });
    
    // Create the temporary edge immediately so it's visible
    temporaryEdge = cy.add({
        group: 'edges',
        data: {
            id: 'temp-edge',
            source: sourceNode.id(),
            target: 'temp-target',
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
        showNotification('Error: No active graph. Please create nodes first to initialize a graph.');
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
        showNotification('Invalid edge connection! Valid connections: Market Segment → Market Segment (hierarchy) or Market Segment → Problem (value edge)');
        cancelEdgeDrawing();
        return;
    }
    
    // Check if an edge already exists between these nodes
    const existingEdge = cy.edges(`[source="${finalSourceId}"][target="${finalTargetId}"]`);
    if (existingEdge.length > 0) {
        showNotification('An edge already exists between these nodes.');
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
        const errorMsg = error.error || error.message || 'Unknown error';
        showNotification('Failed to create edge: ' + errorMsg);
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
    showNotification('Graph auto-saves on every change!', 'info', 3000);
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
    
    // Update graph name input field
    const graphNameInput = document.getElementById('graph-name');
    if (graphNameInput && graphData.graph.name) {
        graphNameInput.value = graphData.graph.name;
    }
    
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
    
    // Graph name input blur handler - save when user clicks out
    const graphNameInput = document.getElementById('graph-name');
    if (graphNameInput) {
        graphNameInput.addEventListener('blur', async function() {
            const newName = this.value.trim();
            if (!newName) {
                // Restore previous name if empty
                const graphData = await api(`/api/graphs/${currentGraphId}/`);
                if (graphData && graphData.graph) {
                    this.value = graphData.graph.name || 'Untitled Graph';
                }
                return;
            }
            
            if (currentGraphId && newName) {
                try {
                    await api(`/api/graphs/${currentGraphId}/`, {
                        method: 'PATCH',
                        body: JSON.stringify({ name: newName })
                    });
                    console.log('Graph name updated:', newName);
                } catch (error) {
                    console.error('Error updating graph name:', error);
                    // Restore previous name on error
                    const graphData = await api(`/api/graphs/${currentGraphId}/`);
                    if (graphData && graphData.graph) {
                        this.value = graphData.graph.name || 'Untitled Graph';
                    }
                }
            }
        });
        
        // Also save on Enter key
        graphNameInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                this.blur(); // Trigger blur which will save
            }
        });
    }
});

