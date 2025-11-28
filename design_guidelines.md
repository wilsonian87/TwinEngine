# HCP Digital Twin Simulation Engine - Design Guidelines

## Design Approach

**Selected System:** Carbon Design System (IBM)
**Rationale:** Purpose-built for data-intensive enterprise applications with complex analytics workflows. Provides robust patterns for dashboards, data tables, and simulation interfaces that align with healthcare/pharma professional expectations.

## Core Design Principles

1. **Data Clarity First:** Every visualization and metric must be immediately interpretable
2. **Professional Clinical Aesthetic:** Clean, trustworthy, and sophisticated - befitting pharmaceutical enterprise software
3. **Efficient Workflows:** Minimize clicks between search, analysis, and simulation tasks
4. **Contextual Density:** Rich information display without overwhelming users

---

## Typography System

**Font Family:** IBM Plex Sans (primary), IBM Plex Mono (data/code)

**Hierarchy:**
- Page Titles: 32px, Semi-bold
- Section Headers: 24px, Medium
- Card/Panel Titles: 18px, Medium
- Body Text: 14px, Regular
- Data Labels: 12px, Regular
- Metadata/Tags: 11px, Regular
- Data Values (metrics): IBM Plex Mono, 16-20px, Medium

---

## Layout System

**Spacing Primitives:** Tailwind units of 2, 4, 6, 8, 12, 16, 20
- Component padding: p-4, p-6
- Section spacing: space-y-6, space-y-8
- Card gaps: gap-4, gap-6
- Dashboard grid gaps: gap-6

**Grid Structure:**
- Main container: max-w-7xl mx-auto
- Dashboard grid: grid-cols-12 (responsive breakpoints)
- Data cards: 3-column on desktop (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)
- Side panels: Fixed 320px width on desktop, full-width on mobile

---

## Component Library

### Navigation
**Top Navigation Bar:**
- Full-width, sticky header
- Logo left, primary nav center, user/settings right
- Height: h-16
- Primary nav items: "HCP Explorer", "Simulations", "Dashboards", "Reports"
- Search bar integrated into nav (expandable on mobile)

**Left Sidebar (for HCP Explorer):**
- Fixed 280px width
- Filters, segments, saved searches
- Collapsible sections with chevron indicators
- Scrollable with sticky header

### Data Display Components

**HCP Profile Cards:**
- Structured layout with clear sections
- Header: NPI, name, specialty, tier indicator
- Metrics grid: 2-3 columns showing key stats (Rx volume, engagement score, last contact)
- Channel preference indicators (icons with labels)
- Quick action buttons at bottom

**Metrics Dashboard Tiles:**
- Consistent card design with subtle border
- Header with metric name and info icon (tooltip)
- Large numeric value (center-aligned)
- Trend indicator (arrow + percentage)
- Mini sparkline chart below value
- Dimensions: Flexible height, min 180px

**Data Tables:**
- Zebra striping for row differentiation
- Sticky header on scroll
- Sortable columns with arrow indicators
- Row hover state for interactivity
- Inline actions (expand, simulate, view details)
- Pagination controls at bottom
- Dense mode option for power users

**Simulation Scenario Builder:**
- Multi-step wizard layout (left sidebar with steps)
- Main canvas area for configuration
- Live preview panel on right (or below on mobile)
- Parameter inputs organized in logical groups
- Comparison view: Side-by-side cards showing baseline vs. simulated outcomes

### Forms & Inputs

**Input Fields:**
- Label above input (12px, medium)
- Input height: h-10
- Border on all states
- Helper text below (11px)
- Validation states clearly indicated

**Dropdowns/Selects:**
- Custom styled select boxes matching Carbon patterns
- Multi-select with tag display
- Search within large option lists
- Grouped options for complex hierarchies

**Sliders:**
- Range inputs for simulation parameters (frequency, budget allocation)
- Value display updates live
- Tick marks for key thresholds
- Min/max labels

**Toggle Switches:**
- For binary options (include/exclude channel, enable constraint)
- Labeled left or right of switch

### Charts & Visualizations

**Chart Types Needed:**
- **Line Charts:** Engagement trends over time
- **Bar Charts:** Channel performance comparison, segment breakdowns
- **Heatmaps:** Engagement patterns by day/time
- **Scatter Plots:** HCP positioning by two dimensions
- **Sankey Diagrams:** Journey flow visualization
- **Sparklines:** Inline trend indicators in tables/cards

**Chart Styling:**
- Use Chart.js or D3.js for implementation
- Consistent axis labeling (11px)
- Grid lines: subtle, low opacity
- Tooltips on hover with detailed breakdowns
- Legend placement: top-right or bottom
- Responsive sizing with maintained aspect ratios

### Buttons & Actions

**Primary Actions:** 
- Filled button style, medium size (px-6 py-2.5)
- "Run Simulation", "Save Scenario", "Export Report"

**Secondary Actions:**
- Outlined button style
- "Cancel", "Reset", "View Details"

**Tertiary Actions:**
- Text-only button (ghost style)
- "Learn more", "Expand all", "Collapse"

**Icon Buttons:**
- 40x40px touch target
- Used for: Edit, Delete, Download, Refresh, Filter toggle
- Tooltips on hover (essential for accessibility)

### Overlays & Modals

**Modal Dialogs:**
- Max width: 640px (small), 896px (large)
- Header with title + close button
- Content area with appropriate padding (p-6)
- Footer with action buttons (right-aligned)
- Backdrop: semi-transparent overlay

**Side Panels (Drawers):**
- Slide in from right
- Width: 480px on desktop, full-width mobile
- Used for: HCP detail view, filter panels, simulation detail
- Close button top-right + backdrop click to dismiss

**Toasts/Notifications:**
- Fixed top-right position
- Auto-dismiss after 5 seconds (with option to persist critical messages)
- Types: Success, Warning, Error, Info
- Include icon + message + optional action button

---

## Page Layouts

### HCP Explorer Page
- Left sidebar: Filters and segments (280px)
- Main area: Search bar + results grid/list toggle
- Results: Cards in grid (3-col) or list view with expanded details
- Right panel (optional): Selected HCP summary (320px, collapsible)

### Simulation Builder Page
- Top: Scenario name + save/run controls
- Left: Step navigation (200px)
- Center: Configuration forms (responsive width)
- Right: Live preview with predicted metrics (360px)
- Bottom: Comparison table (baseline vs. scenarios)

### Dashboard Page
- Full-width hero metric cards (4-column grid)
- Middle: Chart panels (2-column on desktop, stacked mobile)
- Bottom: Data table with detailed breakdowns
- Filters in sticky top bar below main nav

---

## Interactive States

**Hover States:**
- Cards: Subtle elevation increase (shadow)
- Table rows: Background highlight
- Buttons: Slight opacity/brightness shift
- Chart elements: Highlight + tooltip

**Loading States:**
- Skeleton screens for data tables and cards
- Spinner for simulation runs (with progress indication if possible)
- Shimmer effect for loading content

**Empty States:**
- Illustration + helpful message + suggested action
- "No HCPs match your filters - Try adjusting your criteria"

---

## Icons

**Library:** Heroicons (outline for navigation, solid for status indicators)

**Key Icons Needed:**
- User/profile
- Chart/analytics
- Simulation/beaker
- Filter/funnel
- Search
- Download/export
- Calendar/time
- Email, phone, event (channel icons)
- Checkmark, warning, error (status)
- Info/help
- Settings/gear

---

## Accessibility Implementation

- WCAG AA compliance minimum
- Keyboard navigation for all interactive elements
- Focus indicators visible and high-contrast
- ARIA labels for icon-only buttons
- Screen reader announcements for dynamic content updates
- Sufficient touch targets (44x44px minimum)

---

## Responsive Behavior

**Breakpoints:**
- Mobile: < 768px
- Tablet: 768px - 1024px  
- Desktop: > 1024px

**Mobile Adaptations:**
- Sidebars collapse to drawer overlays
- Multi-column grids stack to single column
- Data tables: Horizontal scroll or card transformation
- Navigation: Hamburger menu
- Reduce padding/spacing by ~30%

---

## Images

**Not Applicable** - This is a data-focused enterprise application. No hero images or decorative photography. All visual elements are functional: charts, icons, data visualizations, and UI components.