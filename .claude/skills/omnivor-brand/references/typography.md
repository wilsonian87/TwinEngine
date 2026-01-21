# OmniVor Typography

## Primary Typeface: Inter

Inter is the primary typeface for all applications—digital and print.

### Import

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;900&display=swap');

font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
```

## Weight Usage

| Weight | Name | Usage |
|--------|------|-------|
| 900 | Black | OMNIVOR in wordmark, display headlines |
| 700 | Bold | H1-H2, emphasis |
| 600 | Semi-bold | H3, buttons, labels |
| 500 | Medium | Body emphasis, nav items |
| 400 | Regular | Body text |
| 300 | Light | LABS in wordmark, large display accents |

**Rule:** Never use Light (300) below 18px except in the wordmark.

## Type Scale

| Level | Size | Weight | Letter-spacing | Line-height | Usage |
|-------|------|--------|----------------|-------------|-------|
| Display | 4-5rem | 900 | 0.1em | 1.1 | Hero headlines |
| H1 | 2.5rem | 700 | 0.02em | 1.2 | Page titles |
| H2 | 1.75rem | 700 | 0.02em | 1.3 | Section headers |
| H3 | 1.25rem | 600 | 0.01em | 1.4 | Card headers |
| Body | 1rem | 400 | 0 | 1.6 | Paragraphs |
| Body Small | 0.875rem | 400 | 0 | 1.5 | Secondary text |
| Caption | 0.75rem | 500 | 0.05em | 1.4 | Timestamps, metadata |
| Label | 0.625rem | 600 | 0.15em | 1.2 | Form labels, tags (ALL CAPS) |

## Wordmark Typography

### Split Emphasis (Primary)

```css
.wordmark-omnivor {
  font-weight: 900;
  letter-spacing: 0.1em;
  color: #fafafa; /* Signal White */
}

.wordmark-labs {
  font-weight: 300;
  letter-spacing: 0.1em;
  color: #6b21a8; /* Consumption Purple */
}
```

### Heavy Extended (Secondary)

```css
.wordmark-heavy {
  font-weight: 900;
  letter-spacing: 0.18em;
}

.wordmark-heavy .labs {
  color: #6b21a8;
}
```

## Case Rules

| Context | Case |
|---------|------|
| Display/Headlines | ALL CAPS or Title Case |
| Body | Sentence case |
| Labels | ALL CAPS with wide letter-spacing |
| Buttons | Sentence case or Title Case |
| Metrics labels | ALL CAPS |

## Spacing Rules

- **Maximum line length:** 65-75 characters
- **Paragraph spacing:** 1.5× line height
- **Never center-align body text**

## Don'ts

- Never use decorative or script fonts
- Never stretch or compress type
- Never use pure black (#000000)—use Void Black (#0a0a0b)
- Never use Light (300) weight below 18px

## Tailwind Classes

```html
<!-- Display -->
<h1 class="text-5xl font-black tracking-wider leading-tight">

<!-- H1 -->
<h1 class="text-4xl font-bold tracking-tight leading-tight">

<!-- H2 -->
<h2 class="text-2xl font-bold tracking-tight leading-snug">

<!-- H3 -->
<h3 class="text-xl font-semibold leading-snug">

<!-- Body -->
<p class="text-base leading-relaxed">

<!-- Label -->
<span class="text-xs font-semibold tracking-widest uppercase">
```
