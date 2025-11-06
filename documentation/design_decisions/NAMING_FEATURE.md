# Node Naming Feature

## Overview
Users can now name nodes when creating them and rename existing nodes by double-clicking. This makes the market sizing graphs more readable and meaningful.

11-05-2025

## Implementation Details

### Frontend Changes

#### 1. New Modal (`templates/index.html`)
- Added a **Node Name Modal** with:
  - Dynamic title (changes based on create vs. rename)
  - Text input field for node names
  - Save and Cancel buttons
  - Keyboard support (Enter to save, Escape to cancel)

#### 2. JavaScript Updates (`static/js/main.js`)

**Global State:**
- `pendingNodeData` - Stores node data while waiting for user to enter name
- `isRenamingNode` - Tracks if modal is for creating or renaming

**New Functions:**
- `openNameModal(title)` - Opens modal for naming new nodes
- `openRenameModal()` - Opens modal for renaming existing nodes
- `closeNameModal()` - Closes modal and cleans up state
- `saveNodeName()` - Handles both creation and rename based on `isRenamingNode` flag
- `finishCreateNode(name)` - Creates node with user-provided name

**Modified Functions:**
- `createMarketSegmentNode()` - Now opens name modal instead of immediately creating node
- `createProblemNode()` - Now opens name modal instead of immediately creating node

**Event Handlers:**
- Double-click on nodes triggers rename modal
- Enter key in name input triggers save
- Escape key in name input triggers cancel

#### 3. CSS Updates (`static/css/style.css`)
- Updated helper text to include rename tip: "Tip: Shift+Click to draw edges • Double-click to rename nodes"

### User Experience

#### Creating Nodes
1. User clicks "Market Segment" or "Problem" button
2. Modal appears asking for node name
3. User types name and presses Enter (or clicks Save)
4. Node is created with the custom name

#### Renaming Nodes
1. User double-clicks on any existing node
2. Modal appears with current name highlighted
3. User types new name and presses Enter (or clicks Save)
4. Node label is updated in the graph and database

### Backend Integration
- Uses existing `PATCH /api/nodes/{id}/` endpoint to update node labels
- Node creation includes `label` field in the POST request
- All changes are automatically synced to Supabase

## Benefits
1. **Improved Readability** - Meaningful names make graphs easier to understand
2. **Better Organization** - Users can identify nodes at a glance
3. **Professional Output** - Custom names make the tool suitable for presentations
4. **Intuitive UX** - Double-click to rename is a familiar interaction pattern
5. **Keyboard Shortcuts** - Enter/Escape keys speed up the workflow

## Testing Checklist
- [ ] Create market segment node with custom name
- [ ] Create problem node with custom name
- [ ] Cancel node creation (should not create node)
- [ ] Rename existing market segment node
- [ ] Rename existing problem node
- [ ] Cancel rename (should keep old name)
- [ ] Use Enter key to save
- [ ] Use Escape key to cancel
- [ ] Verify names persist after page reload
- [ ] Verify calculated values still display correctly with custom names

## Future Enhancements
- Add character limit validation for node names
- Add duplicate name detection/warning
- Add autocomplete for frequently used names
- Add search/filter by node name

