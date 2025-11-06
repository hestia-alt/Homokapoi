# Leaf-Only Value Input Feature

## Overview
Only **leaf market segment nodes** (nodes with no children) can have values manually entered by users. Parent nodes automatically display the sum of their children and cannot be edited directly.

## Why This Restriction?

### Data Integrity
- Parent nodes represent aggregate segments made up of sub-segments
- Their values should always equal the sum of their children
- Allowing manual edits would create inconsistencies

### User Experience
- Forces users to think hierarchically
- Makes the calculation flow more intuitive
- Prevents confusing scenarios where a parent's value doesn't match its children

## Implementation Details

### 1. Visual Distinction

**Leaf Nodes - Default State (Red Circles)**
- Color: `#E74C3C` (red)
- Shape: Circle
- Border: 2px solid `#C0392B`
- Can be clicked to enter values
- Status: No value entered yet

**Leaf Nodes with Values (Orange Circles)**
- Color: `#E67E22` (orange)
- Shape: Circle
- Border: 2px solid `#D35400`
- Status: Value has been set

**Leaf Nodes Connected to Problem (Green Circles)**
- Color: `#27AE60` (green)
- Shape: Circle
- Border: 2px solid `#1E8449`
- Status: Connected to a problem node via value edge

**Parent Nodes (Deep Blue Squares)**
- Color: `#2C3E50` (deep blue)
- Shape: Square (round-rectangle)
- Border: 3px solid `#1A252F`
- Display calculated sum only
- Cannot be edited directly

### 2. Click Behavior

**When clicking a leaf node:**
```javascript
// Opens value modal
openValueModal();
```

**When clicking a parent node:**
```javascript
// Shows informative alert
alert('This is a parent segment. Parent segments automatically calculate their value as the sum of their children.\n\nTo set a value, click on a leaf segment (one with no child segments).');
```

### 3. Automatic Value Clearing

When a node transitions from leaf to parent (by adding a child edge):
```javascript
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
```

### 4. Visual Class Management

During calculation updates:
```javascript
// Add visual class to parent nodes and valued leaf nodes
if (type === 'market_segment') {
    const isLeaf = this.isLeaf(node.id());
    const hasValue = node.data('value') > 0;
    
    if (isLeaf) {
        node.removeClass('parent-node');
        if (hasValue) {
            node.addClass('valued-leaf');
        } else {
            node.removeClass('valued-leaf');
        }
    } else {
        node.addClass('parent-node');
        node.removeClass('valued-leaf');
    }
}
```

## User Workflows

### Creating a Hierarchy

1. User creates three market segment nodes:
   - "Total Market" (will be parent) - RED circle (default)
   - "North America" (child) - RED circle (default)
   - "Europe" (child) - RED circle (default)

2. User sets values on leaf nodes:
   - Clicks "North America" → enters 500,000 → turns ORANGE
   - Clicks "Europe" → enters 300,000 → turns ORANGE

3. User draws hierarchy edges:
   - Shift+Click from "Total Market" to "North America"
   - Shift+Click from "Total Market" to "Europe"

4. Results:
   - "Total Market" becomes DEEP BLUE SQUARE
   - "Total Market" displays: 800,000 (sum of children)
   - "North America" and "Europe" stay ORANGE CIRCLES
   - If "Total Market" had a value before, it's now cleared

5. User connects segments to problem nodes:
   - Creates a problem node "Security Issue"
   - Shift+Click from "North America" to "Security Issue"
   - "North America" turns GREEN (connected to problem)

### Visual States Summary

| Node State | Color | Shape | Can Edit? |
|-----------|-------|-------|-----------|
| Leaf without value | Red | Circle | ✅ Yes |
| Leaf with value | Orange | Circle | ✅ Yes |
| Leaf connected to problem | Green | Circle | ✅ Yes |
| Parent (calculated) | Deep Blue | Square | ❌ No |

## Edge Cases Handled

### 1. Leaf Node Becomes Parent
- Scenario: User sets value on node (ORANGE or GREEN), then adds children to it
- Behavior: Stored value is cleared, node shows calculated sum
- Visual: Node changes from colored circle to DEEP BLUE square

### 2. Parent Node Becomes Leaf
- Scenario: User deletes all child edges, making parent a leaf again
- Behavior: Node can now be clicked to enter a value
- Visual: Node changes from DEEP BLUE square to RED circle (default state)

### 3. Multi-Level Hierarchies
- Scenario: Parent → Child → Grandchild structure
- Behavior: 
  - Grandchild (leaf) can be edited - RED (no value), ORANGE (valued), or GREEN (connected to problem)
  - Child (parent) shows sum of grandchildren - DEEP BLUE square
  - Parent (grandparent) shows sum of all descendants - DEEP BLUE square

### 4. Connecting Leaf to Problem Node
- Scenario: User has an ORANGE leaf node (with value) and draws edge to problem
- Behavior: Value is preserved, edge weight can be set
- Visual: Node changes from ORANGE to GREEN (highest priority)

## Benefits

1. **Prevents Data Conflicts**
   - No scenario where parent value ≠ sum of children
   - Single source of truth for each segment

2. **Clearer Mental Model**
   - Shape indicates hierarchy: Circle = leaf, Square = parent
   - Color indicates status: Red = empty, Orange = valued, Green = connected to problem, Deep Blue = parent
   - Visual feedback is immediate and intuitive
   - Color progression shows workflow: Red → Orange → Green

3. **Better UX**
   - Informative error messages guide users
   - Visual feedback shows what can/can't be edited
   - Automatic transitions handle edge cases
   - Green color provides positive feedback when values are entered

4. **Calculation Integrity**
   - Calculator always produces correct results
   - No need to reconcile conflicting values

## Testing Checklist

- [x] Click leaf node opens value modal
- [x] Click parent node shows informative message
- [x] Creating hierarchy edge clears parent's stored value
- [x] Parent node shows correct sum of children
- [x] Parent node changes to blue square
- [x] Leaf node with value turns green
- [x] Leaf node without value stays blue
- [x] Deleting all children makes node editable again
- [x] Multi-level hierarchy calculates correctly
- [x] Visual classes update on edge creation/deletion
- [x] Database value is cleared when node becomes parent

## Future Enhancements

- Add tooltip on hover showing "Click to edit" for leaf nodes
- Add tooltip on hover showing "Auto-calculated" for parent nodes
- Visual indicator showing number of children on parent nodes
- Animation when node transitions between states

