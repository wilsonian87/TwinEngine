# OmniVor UI Components

## Buttons

### Primary Button

```css
.btn-primary {
  background: #6b21a8;
  color: #fafafa;
  font-weight: 600;
  font-size: 0.875rem;
  padding: 14px 32px;
  border-radius: 8px;
  border: none;
}

.btn-primary:hover {
  background: #7c3aed;
}
```

### Secondary Button

```css
.btn-secondary {
  background: transparent;
  color: #6b21a8;
  font-weight: 600;
  font-size: 0.875rem;
  padding: 14px 32px;
  border-radius: 8px;
  border: 1px solid #6b21a8;
}

.btn-secondary:hover {
  background: rgba(107, 33, 168, 0.1);
}
```

### Accent Button (High-priority CTAs)

```css
.btn-accent {
  background: #d97706;
  color: #0a0a0b;
  font-weight: 600;
  font-size: 0.875rem;
  padding: 14px 32px;
  border-radius: 8px;
  border: none;
}

.btn-accent:hover {
  background: #f59e0b;
}
```

### Ghost Button

```css
.btn-ghost {
  background: transparent;
  color: #fafafa;
  font-weight: 500;
  font-size: 0.875rem;
  padding: 14px 32px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.btn-ghost:hover {
  background: rgba(255, 255, 255, 0.05);
}
```

## Cards

### Standard Card

```css
.card {
  background: #0a0a0b;
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 24px;
}
```

### Accent Card

```css
.card-accent {
  background: rgba(107, 33, 168, 0.1);
  border: 1px solid rgba(107, 33, 168, 0.2);
  border-radius: 16px;
  padding: 24px;
}
```

### Elevated Card

```css
.card-elevated {
  background: linear-gradient(135deg, rgba(107, 33, 168, 0.1) 0%, rgba(10, 10, 11, 0.95) 100%);
  border: 1px solid rgba(107, 33, 168, 0.2);
  border-radius: 20px;
  padding: 32px;
}
```

## Metrics Display

### Structure

```html
<div class="metric">
  <span class="metric-label">SIGNALS PROCESSED</span>
  <span class="metric-value">2,847</span>
  <span class="metric-subtext">14 patterns crystallized</span>
</div>
```

### Styles

```css
.metric-label {
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: #52525b;
}

.metric-value {
  font-size: 2.5rem;
  font-weight: 800;
  color: #d97706;
}

.metric-subtext {
  font-size: 0.875rem;
  color: #a1a1aa;
}
```

## Form Elements

### Input Field

```css
.input {
  background: #0a0a0b;
  border: 1px solid #27272a;
  border-radius: 8px;
  padding: 12px 16px;
  color: #fafafa;
  font-size: 1rem;
}

.input:focus {
  border-color: #6b21a8;
  outline: none;
  box-shadow: 0 0 0 2px rgba(107, 33, 168, 0.2);
}

.input::placeholder {
  color: #52525b;
}
```

### Select

```css
.select {
  background: #0a0a0b;
  border: 1px solid #27272a;
  border-radius: 8px;
  padding: 12px 16px;
  color: #fafafa;
  font-size: 1rem;
}
```

## Border Radii

| Size | Value | Usage |
|------|-------|-------|
| Small | 4px | Tags, badges |
| Medium | 8px | Buttons, inputs |
| Large | 12px | Small cards |
| XL | 16px | Standard cards |
| 2XL | 20px | Feature cards |
| 3XL | 24px | Hero sections |

## Shadows

### Subtle

```css
box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
```

### Medium

```css
box-shadow: 0 4px 6px rgba(0, 0, 0, 0.4);
```

### Large

```css
box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
```

### Glow (Purple)

```css
box-shadow: 0 0 30px rgba(107, 33, 168, 0.3);
```

### Glow (Gold)

```css
box-shadow: 0 0 20px rgba(217, 119, 6, 0.3);
```

## Tags/Badges

### Default

```css
.tag {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  background: rgba(107, 33, 168, 0.2);
  color: #a855f7;
  border-radius: 4px;
}
```

### Success

```css
.tag-success {
  background: rgba(217, 119, 6, 0.2);
  color: #d97706;
}
```

## Dividers

```css
.divider {
  height: 1px;
  background: #27272a;
  margin: 24px 0;
}

.divider-accent {
  height: 2px;
  background: linear-gradient(90deg, #6b21a8 0%, transparent 100%);
  margin: 32px 0;
}
```

## Tailwind Component Classes

### Button Variants

```html
<!-- Primary -->
<button class="bg-purple-800 text-white font-semibold text-sm px-8 py-3.5 rounded-lg hover:bg-purple-700">
  Primary Action
</button>

<!-- Secondary -->
<button class="bg-transparent text-purple-800 font-semibold text-sm px-8 py-3.5 rounded-lg border border-purple-800 hover:bg-purple-800/10">
  Secondary Action
</button>

<!-- Accent -->
<button class="bg-amber-600 text-zinc-950 font-semibold text-sm px-8 py-3.5 rounded-lg hover:bg-amber-500">
  Extract Data
</button>
```

### Card

```html
<div class="bg-zinc-950 border border-white/5 rounded-2xl p-6">
  <!-- Card content -->
</div>
```

### Metric

```html
<div class="space-y-1">
  <span class="text-[0.625rem] font-semibold tracking-widest uppercase text-zinc-500">
    SIGNALS PROCESSED
  </span>
  <span class="text-4xl font-extrabold text-amber-600">
    2,847
  </span>
  <span class="text-sm text-zinc-400">
    14 patterns crystallized
  </span>
</div>
```
