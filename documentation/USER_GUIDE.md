# Homokapoi User Guide

## Getting Started

1. Open the application in your browser at `http://localhost:8000`
2. You'll see a blank canvas with a toolbar on the left

## Creating Nodes

### Market Segment Nodes
- Click the **"📊 Market Segment"** button in the toolbar
- A modal opens asking you to name the node
- Enter a descriptive name (e.g., "Daily Active Users", "Enterprise Customers")
- Press **Enter** or click **Save**
- A new **RED circle** appears on the canvas with your chosen name
- These represent populations of potential buyers

**Color Progression:**
- **Red Circle** = Default state (no value)
- **Orange Circle** = Has a value set
- **Green Circle** = Connected to a problem node
- **Deep Blue Square** = Parent node (auto-calculated from children)

### Problem Nodes (Red Squares)
- Click the **"💡 Problem"** button in the toolbar
- A modal opens asking you to name the node
- Enter a descriptive name (e.g., "Data Security", "Slow Load Times")
- Press **Enter** or click **Save**
- A new **red square** appears on the canvas with your chosen name
- These represent problems that segments will pay to solve

## Naming and Renaming Nodes

### Naming New Nodes
- When creating any node, you'll be prompted to enter a name
- Enter a meaningful name that describes the segment or problem
- Press **Enter** or click **Save** to create the node
- Press **Escape** or click **Cancel** to cancel creation

### Renaming Existing Nodes
- **Click** on any node to open the context menu
- Select **"Rename"** from the menu
- A modal opens with the current name selected
- Type the new name
- Press **Enter** or click **Save** to update
- Press **Escape** or click **Cancel** to keep the old name

## Drawing Edges Between Nodes

### How to Draw an Edge

1. **Left-click on the first node** (source)
   - The node will get an orange highlight
   - A dashed blue line appears following your cursor
   - The cursor changes to a crosshair
2. **Left-click on the second node** (target)
   - An edge is created automatically
   - The edge type is determined by the node types

**Note:** You cannot create duplicate edges between the same two nodes.

### Valid Edge Connections

**Segment → Segment** (Gray Arrow)
- Creates a hierarchy relationship
- Parent segments show the sum of their children
- Use this to break down markets into sub-segments

**Segment → Problem** (Green Arrow with $ label)
- Creates a "value edge"
- After creating, a modal opens to set the dollar amount
- Enter the average willingness-to-pay per user in this segment
- Optionally add a description explaining why

**Problem → Segment** 
- Automatically reverses to Segment → Problem
- The system ensures value edges always flow segment → problem

### Canceling Edge Drawing
- Click on the empty canvas background
- The orange highlight and temporary edge disappear
- Drawing mode ends

## Context Menus

### Node Context Menu (Right-Click on Node)

When you **right-click** on any node, a context menu appears with available actions:

#### Leaf Market Segment Nodes (Circles)
**Menu Options:**
- **Rename** - Change the node's name
- **Set Value** - Enter the population size
- **Delete** - Remove the node and all connected edges

#### Parent Market Segment Nodes (Deep Blue Squares)
**Menu Options:**
- **Rename** - Change the node's name only
- **Delete** - Remove the node and all connected edges

Parent nodes automatically calculate their value as the sum of their children, so they cannot have values manually entered.

#### Problem Nodes (Red Squares)
**Menu Options:**
- **Rename** - Change the node's name only
- **Delete** - Remove the node and all connected edges

### Canvas Context Menu (Right-Click on Canvas)

When you **right-click** on the empty canvas, a menu appears to create new nodes:

**Menu Options:**
- **📊 Create Market Segment** - Creates a new market segment node
- **💡 Create Problem** - Creates a new problem node

### Edge Context Menu (Right-Click on Edge)

When you **right-click** on any edge, a context menu appears:

**For Value Edges (Green):**
- **Edit Value** - Modify the dollar amount and description
- **Delete** - Remove the edge

**For Hierarchy Edges (Gray):**
- **Delete** - Remove the edge

## Setting Values

### Market Segment Population

**Important:** Only **leaf nodes** (circles with no children) can have values manually entered.

1. Click on any **leaf Market Segment node** (circle - red or orange)
2. A context menu appears
3. Select **"Set Value"**
4. Enter the number of potential buyers (e.g., 1000000)
5. Click **Save**
6. The node turns **ORANGE** (indicating it has a value)
7. The value is stored and used for calculations

**Parent nodes** (deep blue squares) only show the **"Rename"** option in the context menu since their values are automatically calculated.

### Edge Dollar Amount (Willingness-to-Pay)
1. Click on any **green Value Edge**
2. A modal opens with two fields:
   - **Dollar amount**: How much each person will pay (e.g., 50.00)
   - **Description**: Why this segment values this problem
3. Click **Save**
4. The dollar amount appears on the edge as a label

## Moving Nodes

- **Click and drag** any node to reposition it
- The position is automatically saved
- Use this to organize your market map visually

## Managing Your Graph

### Auto-Save
- All changes are automatically saved to Supabase
- No need to manually save

### Manual Save/Load
- Click **"💾 Save Graph"** - Shows confirmation (already auto-saved)
- Click **"📂 Load Graph"** - Loads your saved graph

## Tips & Best Practices

### Building a Market Map

1. **Start with the Total Addressable Market (TAM)**
   - Create a root market segment node
   - Label it "Total Market" or similar

2. **Segment the Market**
   - Create child segment nodes
   - Draw hierarchy edges from parent → children
   - Break down by geography, demographics, behavior, etc.

3. **Set Leaf Values**
   - Click on the lowest-level segments
   - Enter population numbers
   - Parent nodes will automatically sum these

4. **Define Problems**
   - Create problem nodes for monetization opportunities
   - Draw value edges from relevant segments
   - Set willingness-to-pay amounts

5. **Document Assumptions**
   - Use the description field on value edges
   - Explain why each segment values each problem
   - This helps stakeholders understand your reasoning

### Mouse Controls

- **Left-Click Node**: Start/complete edge drawing
- **Right-Click Node**: Open node context menu
- **Right-Click Canvas**: Open canvas context menu (create nodes)
- **Right-Click Edge**: Open edge context menu (edit/delete)
- **Left-Click Canvas**: Cancel edge drawing / Close menus
- **Drag Node**: Move node to new position
- **Click Menu Item**: Execute action and close menu
- **Click Outside Menu**: Close menu

### Visual Cues

- **Orange border**: Node is selected as edge source
- **Dashed blue line**: Temporary edge following your cursor during drawing
- **Crosshair cursor**: In edge drawing mode
- **Gray edges**: Hierarchy relationships
- **Green edges**: Value relationships (show $ amounts)
- **$ labels**: Willingness-to-pay amounts on value edges

## Example Workflow

Let's say you're analyzing the market for a meal planning app:

1. **Create Root Segment**
   - Create market segment: "US Adults who cook"
   - Click the node → Select "Set Value" from menu
   - Enter value: 150,000,000

2. **Segment by Behavior**
   - Create child: "Daily Cooks"
   - Click it → "Set Value" → Enter: 50,000,000
   - Create child: "Weekly Cooks"
   - Click it → "Set Value" → Enter: 75,000,000
   - Create child: "Occasional Cooks"
   - Click it → "Set Value" → Enter: 25,000,000
   - Draw hierarchy edges from root to each child

3. **Define Problems**
   - Create problem: "Recipe Discovery"
   - Create problem: "Grocery List Creation"
   - Create problem: "Nutrition Tracking"

4. **Connect Segments to Problems**
   - Shift+Click "Daily Cooks" → "Nutrition Tracking"
   - Set willingness-to-pay: $10/month
   - Add description: "Health-conscious, tracks everything"
   
   - Shift+Click "Weekly Cooks" → "Recipe Discovery"
   - Set willingness-to-pay: $5/month
   - Add description: "Needs inspiration for weekly meals"

5. **Review Calculations**
   - "Nutrition Tracking" problem shows: $500M (50M × $10)
   - "Recipe Discovery" problem shows: $375M (75M × $5)

## Troubleshooting

### Edge won't create
- Make sure you're holding Shift or Ctrl
- Check that you're clicking on nodes (not canvas)
- Verify the connection type is valid

### Context menu or modal won't open
- Make sure you released Shift after edge drawing
- Click canvas first to close any open menus
- Try clicking the node/edge again
- Check browser console for errors

### Numbers not updating
- Ensure you clicked "Save" in the modal
- Check that the node is properly connected
- Refresh the page and try again

### Can't move nodes
- Make sure you're not in edge drawing mode
- If cursor is crosshair, click canvas to cancel
- Try clicking the node first, then dragging

## Browser Requirements

- Modern browser (Chrome, Firefox, Safari, Edge)
- JavaScript enabled
- Canvas/WebGL support for smooth rendering
- Recommended: Chrome for best performance

## Need Help?

- Check browser console (F12) for error messages
- Review the SETUP.md for configuration issues
- See ARCHITECTURE.md for technical details
- Check that Supabase credentials are correct in .env

