# 1) Fix the dark-mode color mismatch in the “Add New Link” modal (necessary)

### What’s happening (root cause)

- Your dark theme sets shared surface tokens (`--panel`, `--panel-2`, `--border`, etc.) and gives both `.col` and `dialog` a soft “neutral glass” background… **but then the modal gets re-overridden** to a fully opaque surface:

  ```
  [data-theme="dark"] .col,
  [data-theme="dark"] dialog {
    background: linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.02));
  }
  /* later */
  [data-theme="dark"] dialog {
    background: linear-gradient(180deg, var(--panel), var(--panel-2));
  }
  ```

  That last rule makes the modal appear visibly darker than the columns. The backdrop layer (`dialog::backdrop`) also adds a dark veil that accentuates the perceived difference. 

### The changes I’d make (and why)

1. **Unify the modal’s surface with column cards**

   - Remove the dark-mode override that forces `dialog` to the opaque `var(--panel)` stack, and let it use the same subtle translucent gradient the columns use.
   - Replace it with the same glass recipe and border you use elsewhere so the modal feels like a first-class “panel,” not a different component.

   **Code fragment (replace your dark-mode dialog block):**

   ```
   /* Dark theme — make the modal match .col surfaces */
   [data-theme="dark"] dialog {
     background: linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.02));
     border: 1px solid var(--border);
     box-shadow: var(--shadow);
   }
   ```

   (This removes the darker `var(--panel)` / `--panel-2` fill so it visually matches `.col`.) 

2. **Lighten the overlay slightly to reduce perceived darkening**

   - Your backdrop is `rgba(35,39,49,0.35)` with blur. Dialing this to ~0.25–0.28 keeps focus but lets base luminance show through.

   **Code fragment:**

   ```
   dialog::backdrop {
     background: rgba(35,39,49,0.26); /* was 0.35 */
     backdrop-filter: blur(2px);
   }
   ```

   (Reason: small alpha change, big perceived match.)

3. **Match section dividers in the modal to dark tokens**

   - `.dlg-head` and `.dlg-foot` currently use light-theme borders (`#e5e7eb`). In dark mode, switch those to `var(--border)` and use the same faint header wash you use on column headers.

   **Code fragment:**

   ```
   /* Modal header/footer lines and wash in dark */
   [data-theme="dark"] .dlg-head,
   [data-theme="dark"] .dlg-foot {
     border-color: var(--border);
     background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03));
   }
   ```

   (This mirrors your `.col header` treatment so the modal’s chrome matches cards/columns.) 

4. **Ensure inputs and buttons inside the modal keep the same “glass” recipe**

   - You already style inputs/buttons in dark mode with soft translucent fills and `var(--border)`. The change in (1) ensures the container no longer looks darker than its children, so no extra tweak is needed—but if you want a touch more lift for focus states:

   **Optional focus lift:**

   ```
   [data-theme="dark"] input[type="text"]:focus,
   [data-theme="dark"] textarea:focus,
   [data-theme="dark"] select:focus {
     outline: 2px solid rgba(255,255,255,0.08);
     border-color: #3a3a3a;
   }
   ```

**Expected result:** The modal will match the column cards’ “neutral glass” feel, the overlay won’t over-darken it, and the header/footer lines won’t read as “light theme” inside dark mode. Net effect: same elevation, same material, same vibe as the rest of the app in dark mode. 