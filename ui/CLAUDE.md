# UI Design System & Style Guidelines

## Philosophy
- **Clean & Professional**: Inspired by Linear, Vercel, Notion
- **No AI Slop**: No rainbow gradients, neon glows, or over-the-top effects
- **Subtle Glass Effects**: Light backdrop blur, semi-transparent backgrounds
- **Consistent**: Use the design tokens and utility classes defined in `app.css`

## Color Palette
- Background: `#0a0a0b` (near black)
- Borders: `border-white/[0.06]` to `border-white/10` (subtle white borders)
- Backgrounds semi-transparent: `bg-white/5`, `bg-white/10` (for hover states)
- Primary: `primary-500` to `primary-600` (sky blue)
- Text: `text-gray-100` (primary), `text-gray-400` (secondary), `text-gray-500` (muted)

## CSS Utility Classes (defined in app.css)

### Buttons
```css
.btn              /* Base button styles */
.btn-primary      /* Primary action - blue with glow on hover */
.btn-secondary    /* Secondary - semi-transparent with border */
.btn-ghost        /* Ghost - transparent, subtle hover */
.btn-danger       /* Destructive actions - red tinted */
```

### Inputs
```css
.input            /* Standard input with blur and border */
```

### Cards & Containers
```css
.card             /* Standard card with glassmorphism */
.card-elevated    /* More prominent card */
```

### Modals
```css
.modal-backdrop   /* Full-screen backdrop with blur */
.modal-content    /* Modal container with blur and shadow */
```

### Background Patterns
```css
.bg-pattern       /* Subtle grid pattern */
.bg-dots          /* Dots pattern variant */
```

### Effects
```css
.glow-sm          /* Subtle primary color glow */
.glow-md          /* Medium glow */
.divider          /* Gradient divider line */
```

## Component Guidelines

### Creating New Modals
```svelte
<div class="modal-backdrop">
  <div class="modal-content p-6 space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h3 class="font-semibold text-gray-100">Title</h3>
      <button class="p-1.5 rounded-lg hover:bg-white/5">
        <X class="h-5 w-5 text-gray-400" />
      </button>
    </div>

    <!-- Content -->
    <div>...</div>

    <!-- Footer -->
    <div class="flex justify-end gap-2 pt-4 border-t border-white/5">
      <button class="btn btn-secondary">Cancel</button>
      <button class="btn btn-primary">Confirm</button>
    </div>
  </div>
</div>
```

### Creating Cards/Panels
```svelte
<div class="card">
  <div class="flex items-center gap-2 mb-3">
    <Icon class="h-5 w-5 text-primary-400" />
    <h3 class="font-semibold text-gray-200">Title</h3>
  </div>
  <!-- Content -->
</div>
```

### Buttons
```svelte
<!-- Primary action -->
<button class="btn btn-primary">Save</button>

<!-- Secondary action -->
<button class="btn btn-secondary">Cancel</button>

<!-- Destructive action -->
<button class="btn btn-danger">Delete</button>

<!-- Icon button -->
<button class="btn btn-ghost p-2">
  <Icon class="h-5 w-5" />
</button>
```

### Lists & Selectable Items
```svelte
<div class="rounded-lg px-3 py-2 transition-all cursor-pointer
            hover:bg-white/5 border border-transparent
            {isSelected ? 'bg-white/10 border-white/10' : ''}">
  <!-- Content -->
</div>
```

### Dropdowns
```svelte
<div class="rounded-xl border border-white/10 bg-gray-900/95 backdrop-blur-xl shadow-2xl shadow-black/50">
  <!-- Items -->
</div>
```

## Border Guidelines
- Use `border-white/[0.06]` for very subtle separators
- Use `border-white/5` for section dividers
- Use `border-white/10` for more prominent borders (selected states, cards)

## Hover States
- Backgrounds: `hover:bg-white/5` (subtle) or `hover:bg-white/10` (more visible)
- Borders: `hover:border-white/10` or `hover:border-white/15`
- Always use `transition-all` or `transition-colors` for smooth effects

## Do NOT
- Use gradient backgrounds (especially rainbow/neon)
- Use bright shadows or glows (except subtle primary glow on buttons)
- Use rounded-full on cards (use rounded-xl or rounded-2xl)
- Use solid bright colors for backgrounds
- Add excessive animations
