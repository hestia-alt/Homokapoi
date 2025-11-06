# Context Menu System

## Overview

The context menu system provides a clean, intuitive interface for interacting with nodes. When a user clicks on any node, a menu appears with actions appropriate to that node type.

## Implementation

### HTML Structure

Located in `templates/index.html`:
```html
<div id="node-context-menu" class="context-menu" style="display: none;">
    <div class="context-menu-item" id="menu-rename">Rename</div>
    <div class="context-menu-item" id="menu-set-value">Set Value</div>
</div>
```

### CSS Styling

Located in `static/css/style.css`:
- Positioned absolutely where the user clicks
- White background with border and shadow
- Hover effects for visual feedback
- Menu items have proper padding and transitions

### JavaScript Logic

Located in `static/js/main.js`:

#### Global State
```javascript
let contextMenuNode = null;  // Tracks which node the menu is for
```

#### Key Functions

1. **showContextMenu(node, x, y)**
   - Determines node type and whether it's a leaf
   - Shows/hides appropriate menu items
   - Positions menu at click coordinates
   
2. **hideContextMenu()**
   - Hides the menu
   - Clears the contextMenuNode reference

3. **Event Handlers**
   - Click on node → Show context menu
   - Click on canvas → Hide context menu
   - Click menu item → Execute action and hide menu

## Menu Options by Node Type

### Leaf Market Segment Nodes (Circles)
**Menu Items:**
- **Rename** - Opens rename modal
- **Set Value** - Opens value input modal

**Logic:** A market segment is considered a leaf if it has no outgoing `segment_hierarchy` edges.

### Parent Market Segment Nodes (Deep Blue Squares)
**Menu Items:**
- **Rename** - Opens rename modal

**Rationale:** Parent nodes auto-calculate their values from children, so manual value input is disabled.

### Problem Nodes (Red Squares)
**Menu Items:**
- **Rename** - Opens rename modal

**Rationale:** Problem nodes calculate revenue from incoming value edges, so they don't have manual value input.

## User Experience Flow

1. **User clicks a node** (without Shift key)
2. Context menu appears at click position
3. User sees only relevant options for that node type
4. User selects an option
5. Menu closes and appropriate modal opens
6. Canvas click closes menu without action

## Benefits

### Clarity
- Users understand what actions are available for each node
- Parent nodes don't confuse users by showing disabled value input

### Consistency
- Same interaction pattern for all nodes
- Menu adapts to node type automatically

### Discoverability
- All available actions are visible in one place
- No hidden keyboard shortcuts required

### Maintainability
- Easy to add new node actions in the future
- Centralized menu logic

## Future Enhancements

Potential additions to the context menu:
- **Delete** - Remove node and its edges
- **Duplicate** - Create a copy of the node
- **Lock Position** - Prevent accidental dragging
- **Add Note** - Attach documentation to a node
- **Change Color** - Custom color coding
- **View History** - See value changes over time

## Technical Notes

### Positioning
The menu uses `renderedPosition` from Cytoscape to place the menu near the clicked node in screen coordinates.

### Z-Index
Menu has `z-index: 10000` to ensure it appears above the Cytoscape canvas.

### Edge Drawing Integration
Shift+Click still triggers edge drawing mode, bypassing the context menu. This allows power users to draw edges quickly.

### Mobile Considerations
The context menu works on touch devices:
- Tap node to open menu
- Tap menu item to execute action
- Tap canvas to close menu

## Related Files

- `templates/index.html` - HTML structure
- `static/css/style.css` - Styling
- `static/js/main.js` - Logic and event handlers
- `documentation/USER_GUIDE.md` - User-facing documentation

