# Calculation Engine Guide

## Overview

The calculation engine automatically computes and displays market sizing values on your graph nodes in real-time.
11-05-2025
## How It Works

### Market Segment Nodes (Blue)

**Leaf Nodes** (no children):
- Display the user-input population value
- Format: `1,000,000` (with commas)

**Parent Nodes** (have children):
- Automatically sum all child segment values
- Updates in real-time when children change
- Format: `5,000,000` (with commas)

### Problem Nodes (Red)

- Calculate total addressable revenue
- Formula: `SUM(segment_value × edge_weight)`
- Updates when segments or edge weights change
- Format: `$50,000,000` (currency with commas)

## Example Calculation

```
Total Market (parent)
├─ Daily Users: 1,000,000
├─ Weekly Users: 2,000,000
└─ Monthly Users: 1,500,000

Total Market automatically shows: 4,500,000
```

If "Daily Users" connects to a "Recipe Discovery" problem with $10 edge weight:
- Recipe Discovery shows: $10,000,000 (1,000,000 × $10)

## When Calculations Happen

The engine recalculates automatically when you:
1. ✅ Create a new node
2. ✅ Set or change a segment value
3. ✅ Draw an edge between nodes
4. ✅ Set or change an edge weight
5. ✅ Load a saved graph

## Visual Display

### Before Value Input
```
┌─────────────┐
│   Market    │
│   Segment   │
└─────────────┘
```

### After Value Input (Leaf Node)
```
┌─────────────┐
│   Market    │
│   Segment   │
│  1,000,000  │
└─────────────┘
```

### Parent Node (Auto-Calculated)
```
┌─────────────┐
│   Total     │
│   Market    │
│  5,000,000  │
└─────────────┘
```

### Problem Node (Revenue)
```
┌─────────────┐
│   Recipe    │
│  Discovery  │
│ $10,000,000 │
└─────────────┘
```

## Technical Details

### Hierarchy Calculation (Market Segments)

```javascript
calculateSegmentValue(nodeId):
  if isLeaf(nodeId):
    return userInputValue
  else:
    return sum(calculateSegmentValue(child) for each child)
```

### Revenue Calculation (Problems)

```javascript
calculateProblemValue(problemId):
  total = 0
  for each incoming value edge:
    segmentValue = calculateSegmentValue(sourceSegment)
    edgeWeight = edge.weight  // dollar amount
    total += segmentValue × edgeWeight
  return total
```

## Number Formatting

- **Population**: `1,234,567` (commas, no decimals)
- **Currency**: `$1,234,567` (dollar sign, commas, no decimals)
- **Large numbers**: Automatically formatted (e.g., 1,000,000,000)

## Tips for Best Results

### Building Market Hierarchy
1. Start with a root "Total Market" segment
2. Break it down into logical sub-segments
3. Only input values at the **leaf nodes** (bottom level)
4. Parent nodes will auto-calculate from children

### Setting Up Problems
1. Create problem nodes for each monetization opportunity
2. Draw value edges from relevant segments to problems
3. Set realistic willingness-to-pay amounts on edges
4. Watch problem nodes calculate total revenue

### Example Workflow

**Step 1: Market Structure**
```
Total Addressable Market
├─ Enterprise (500,000)
├─ SMB (2,000,000)
└─ Individual (10,000,000)

Total shows: 12,500,000 ✅
```

**Step 2: Add Problems**
```
Problem: "Project Management Tool"

Enterprise → Problem ($100/user)
  = 500,000 × $100 = $50,000,000

SMB → Problem ($20/user)
  = 2,000,000 × $20 = $40,000,000

Problem shows: $90,000,000 ✅
```

## Console Logging

Open browser console (F12) to see calculation details:
```
🔢 Recalculating all values...
✅ Recalculation complete
```

## Performance

- Calculations are **instant** for graphs with < 100 nodes
- Uses efficient recursive algorithms
- Only recalculates when data changes (not on every frame)

## Troubleshooting

### Values Not Updating?
- Check browser console for errors
- Ensure nodes are properly connected with edges
- Verify edge weights are set (click the edge)
- Try refreshing the browser

### Parent Node Shows 0?
- Check that child nodes have values set
- Verify edges are type "segment_hierarchy" (gray arrows)
- Ensure edges point from parent → child

### Problem Node Shows 0?
- Check that value edges exist (green arrows)
- Verify edge weights are set (click edge, set $ amount)
- Ensure source segments have population values

## Future Enhancements

Potential improvements:
- Export calculations to CSV
- Show calculation breakdown on hover
- Animate value changes
- Add custom formulas
- Percentage distribution views
- Comparison mode for multiple scenarios

