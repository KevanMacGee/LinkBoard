> Has the dark mode css been tweaked in css that is NOT styles.css?

### Short answer

Yes.

- **Global dark mode** is defined in `styles.css` (CSS variables and general component tweaks).
- **Additional dark-mode tweaks** specific to the feature panel **are in `vid-feature2.css`**, for example:

```css
[data-theme="dark"] .feature-split-wrapper { ... }
[data-theme="dark"] .feature-tab:hover { ... }
[data-theme="dark"] .feature-tab.is-active { ... }
[data-theme="dark"] .feature-panels { ... }
[data-theme="dark"] .feature-video-frame { ... }
```

-`landing.css` doesn’t add any new dark-mode rules; it just handles layout/hero spacing.

> What about light mode?

### Light mode

- **Base light theme** is defined in `styles.css` via the root variables and normal rules (no `[data-theme="dark"]` selector). That’s your “light mode”.

- **landing.css** adds layout and hero-specific styles (e.g. `.hero`, `.hero .hint`) that apply in **both** light and dark; they’re not theme-specific.

- **vid-feature2.css** adds the feature panel’s look (titles, tabs, video frame, etc.) which also applies in **both** light and dark, except for the explicit `[data-theme="dark"] ...` blocks at the bottom that override a few things only in dark mode.

  

> Is anything defined in styles.css one way and then defined differently in vid-feature2.css or landing.css?

### Short answer

Mostly no; they’re **layered, not conflicting**, with a couple of intentional refinements.

- **Global in `styles.css`, refined in `landing.css`**  
  - `.hint` is defined in `styles.css` (12px).  
  - `landing.css` adds a more specific rule `.hero .hint` (24px), which only affects the hero paragraph, not other hints.

- **Global in `styles.css`, refined in `vid-feature2.css`**  
  - The feature CSS (`vid-feature2.css`) doesn’t redefine any selectors that `styles.css` already uses (no second `.hint`, `.wrap`, `.actions`, etc.).  
  - It only introduces **new selectors** (`.feature-split-wrapper`, `.demo-header`, `.feature-tab`, `.feature-video-frame`, etc.) plus **extra dark‑mode rules** like `[data-theme="dark"] .feature-video-frame`, which don’t exist in `styles.css`.

- **Dark mode**  
  - `styles.css` sets the core dark theme via `[data-theme="dark"] { … }` and variants like `[data-theme="dark"] header`, `[data-theme="dark"] .card`, etc.  
  - `vid-feature2.css` adds additional, non-overlapping dark rules for the feature panel only. There aren’t cases where the **same selector** is defined one way in `styles.css` and a different way in `vid-feature2.css`; they target different elements or use more specific selectors.