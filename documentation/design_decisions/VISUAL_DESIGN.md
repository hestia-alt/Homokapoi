# Visual Design System

## Overview

Homokapoi uses a modern, clean design inspired by Monarch Money's aesthetic principles. The interface emphasizes clarity, professionalism, and ease of use through soft colors, generous whitespace, and modern typography.

## Design Principles

### 1. **Clean, Minimalist UI**
- Generous whitespace to avoid clutter
- Subtle shadows and borders
- Flat design with minimal gradients
- Clear visual hierarchy

### 2. **Modern Typography**
- **Primary Font**: Inter (Google Fonts)
- **Fallback Fonts**: Helvetica Neue, system fonts
- **Font Weights**: 
  - Regular (400) - body text
  - Medium (500) - labels, menu items
  - Semi-bold (600) - headings, buttons
  - Bold (700) - emphasis

### 3. **Soft Color Palette**
Inspired by the pastel tones in Sankey diagrams and modern financial UIs:

**Market Segment Nodes:**
- Default (no value): Soft Blue `#B8D4E8`
- With value: Soft Yellow/Beige `#F5E6D3` with `#E8C89F` border
- Connected to problem: Soft Green `#C8E6C9` with `#A5D6A7` border
- Parent nodes: Soft Teal `#80DEEA` with `#4DD0E1` border

**Problem Nodes:**
- Soft Pink `#F8BBD0` with `#F48FB1` border

**Edges:**
- Hierarchy edges: Soft Gray `#B0BEC5` (70% opacity)
- Value edges: Soft Green `#81C784` (80% opacity)
- Temporary edges: Soft Blue `#64B5F6` (50% opacity, dashed)

**UI Elements:**
- Primary action: Light Blue `#64B5F6`
- Backgrounds: White `#ffffff` with subtle inset shadow
- Text: Dark Gray `#2c3e50`, Medium Gray `#4a5568`
- Borders: Light Gray `#e2e8f0`
- Delete actions: Soft Red `#EF5350`

## Visual Elements

### Nodes

**Styling Features:**
- Rounded shapes (circles for basic segments, rounded rectangles for parents/problems)
- Subtle drop shadows: `0 2px 8px rgba(0, 0, 0, 0.08)`
- 120px × 120px size
- No borders by default, 2px colored borders for active states
- Font size: 12px, weight: 500
- Dark text on light backgrounds for accessibility

### Edges

**Smooth Bezier Curves:**
- Style: `unbundled-bezier`
- Control points create gentle, flowing curves
- Thicker lines (3-4px) for visual prominence
- Semi-transparent to show overlapping relationships

**Value Edge Labels:**
- White background with rounded corners
- Padding: 4px
- Font weight: 600 (semi-bold)
- Green text: `#388E3C`

### Modals

**Modern Card Design:**
- Rounded corners: 12px border-radius
- Soft shadow: `0 8px 32px rgba(0, 0, 0, 0.12)`
- Backdrop blur effect
- 32px padding
- Focus states on inputs with blue glow

### Context Menus

**Dropdown Style:**
- White background with subtle border
- Rounded corners: 10px
- Soft shadow: `0 8px 24px rgba(0, 0, 0, 0.12)`
- Hover state: Light gray background `#f3f4f6`
- Delete option: Separated with border, red text, pink hover background

### Buttons

**Primary Buttons:**
- Light blue background: `#64B5F6`
- White text
- Rounded corners: 8px
- Soft shadow that lifts on hover
- Transform animation on hover: `translateY(-1px)`

**Secondary Buttons:**
- Light gray background: `#E0E0E0`
- Dark gray text
- Same rounded corners and padding

## Layout

### Canvas
- Pure white background: `#ffffff`
- Subtle inset shadow for depth
- Full-screen with responsive sizing

### Top Navigation
- Dark blue-gray: `#2c3e50`
- Clean separation from canvas
- Subtle shadow: `0 2px 4px rgba(0, 0, 0, 0.1)`

### Sidebar
- Dark blue-gray: `#2c3e50`
- Clear visual hierarchy
- Button hover states for feedback

## Accessibility

### Color Contrast
- All text meets WCAG AA standards
- Dark text on light backgrounds
- Sufficient contrast for colorblind users

### Interactive States
- Hover: Background color change
- Active: Slightly darker background
- Focus: Blue outline for keyboard navigation
- Disabled: Reduced opacity

### Visual Feedback
- Edge drawing: Dashed blue temporary line
- Node selection: Orange border highlight
- Loading/calculating: Status indicators

## Animation & Transitions

**Subtle, Fast Transitions:**
- Duration: 0.15s - 0.2s
- Easing: Default cubic-bezier
- Properties: background-color, box-shadow, transform

**No Jarring Movements:**
- Smooth hover states
- Gentle transform lifts on buttons
- Fade transitions for modals

## Typography Scale

- **H3 (Modal Titles)**: 20px, weight 600
- **Body/Labels**: 14px, weight 500
- **Node Labels**: 12px, weight 500
- **Edge Labels**: 11px, weight 600
- **Helper Text**: 12px, weight 400

## Spacing System

**Consistent Spacing:**
- Extra Small: 4px
- Small: 8px
- Medium: 12px
- Large: 16px
- Extra Large: 24px
- XXL: 32px

## Shadows

**Elevation System:**
- Level 1 (Nodes): `0 2px 8px rgba(0, 0, 0, 0.08)`
- Level 2 (Buttons): `0 2px 4px rgba(0, 0, 0, 0.2)`
- Level 3 (Modals): `0 8px 32px rgba(0, 0, 0, 0.12)`
- Level 4 (Context Menus): `0 8px 24px rgba(0, 0, 0, 0.12)`

## Responsive Design

**Breakpoints:**
- Desktop: 1024px+
- Tablet: 768px - 1023px
- Mobile: < 768px

**Current Implementation:**
- Fixed desktop layout
- Future: Responsive graph canvas, collapsible sidebar

## Inspiration Sources

- **Monarch Money**: Clean financial dashboards, pastel color schemes
- **Sankey Diagrams**: Flowing edges, soft colors, clear data visualization
- **Material Design**: Elevation system, rounded corners, shadows
- **Modern Web Apps**: Backdrop blur, subtle animations, professional typography

