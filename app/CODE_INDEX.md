# LinkBoard Application Code Index

## **Application Overview**

LinkBoard is a single-page web application for managing bookmarks in a draggable column layout. It's built as a self-contained HTML file with inline CSS and JavaScript, requiring no build system or external dependencies beyond SortableJS for drag-and-drop functionality.

## **1. HTML Structure Analysis**

### **Main Document Structure:**
- Single-page application (SPA) with all styles and scripts inline
- Uses semantic HTML5 elements
- Structured in distinct sections:

### **Header Section** (lines 514-537):
- Sticky navigation bar with branding
- Central search input field
- Action buttons: Add Link, Columns, Theme toggle

### **Main Content** (lines 539-541):
- Board container for draggable columns
- Responsive grid layout

### **Footer Actions** (lines 543-555):
- Export/Import functionality
- Bookmarklet generation
- Reset button
- Usage hints

### **Modal Dialogs:**
- Add/Edit Link Dialog (lines 557-588)
- Bookmarklet Dialog (lines 590-606)
- Column Management Dialog (lines 608-627)
- Column Delete Confirmation Dialog (lines 629-647)

## **2. CSS Structure and Theming**

### **CSS Custom Properties (CSS Variables):**
```css
:root {
  --bg, --panel, --panel-2, --muted, --text
  --accent, --accent-2, --danger
  --shadow, --radius
}
```

### **Key CSS Classes:**
- **Layout**: `.bar`, `.wrap`, `.board`, `.col`
- **Components**: `.card`, `.list`, `.empty`
- **UI Elements**: `.pill`, `.btn-icon`, `.actions`, `.search`
- **Dialog System**: `dialog`, `.dlg-head`, `.dlg-body`, `.dlg-foot`
- **Column Management**: `.cols-list`, `.colmgr-row`

### **Responsive Design:**
- 4-column layout (default)
- 3-column (≤1280px)  
- 2-column (≤900px)
- 1-column (≤600px)

### **Theme System:**
- Light theme (default)
- Dark theme with `[data-theme="dark"]` attribute
- Complete dark mode implementation with neutral glass aesthetic

## **3. JavaScript Functionality Mapping**

### **Core Functions by Category:**

#### **Theme Management (lines 655-679):**
- `applyTheme(theme)` - Sets theme and updates button text
- `initTheme()` - Initialize theme from localStorage or system preference

#### **Data & Storage (lines 681-715):**
- `load()`, `save()` - localStorage persistence
- `createBlankColumns()`, `createInitialState()` - Default data structure
- `migrateState()` - Data format migration

#### **Utility Functions (lines 716-765):**
- `uid()` - Generate unique IDs
- `domainFrom(url)`, `normalizeUrl()` - URL processing
- `favicon(url)` - Generate favicon URLs
- `escapeHTML(str)` - XSS protection

#### **Rendering System (lines 767-925):**
- `render()` - Main render function, rebuilds entire DOM
- `matches(card, query)` - Search filtering
- `cardEl(card)` - Create card DOM elements
- `makeSortable(listEl)` - Initialize drag-and-drop with SortableJS
- `persistOrder()` - Save drag-and-drop changes

#### **CRUD Operations (lines 927-983):**
- `addCard()`, `updateCard()`, `removeCard()` - Card management
- `deleteColumn()`, `swapColumns()` - Column operations
- `findCardById()`, `findColIdByCard()` - Data lookup

#### **Dialog Management (lines 984-1079):**
- `openDialog()` - Add/edit card modal
- `readDialogData()` - Form validation and data extraction

#### **Column Management (lines 1139-1275):**
- `openColsDialog()` - Column management modal
- `renderColsManager()` - Dynamic column editor UI
- Staging system for non-destructive editing

### **External Integrations:**
- **SortableJS** (CDN) - Drag and drop functionality
- **DuckDuckGo Icons API** - Favicon service
- **Bookmarklet generation** - Browser integration

## **4. Data Flow and Storage Architecture**

### **Storage Keys:**
- `linkboard.v1` - Main application data
- `linkboard.theme` - Theme preference

### **Data Structure:**
```javascript
state = {
  columns: [
    {
      id: string,        // unique identifier
      title: string,     // column display name
      cards: [
        {
          id: string,    // unique identifier
          url: string,   // normalized HTTP(S) URL
          title: string, // display title (optional)
          note: string   // user note (optional)
        }
      ]
    }
  ]
}
```

### **Data Flow Pattern:**
1. **Load** → `load()` from localStorage
2. **Migrate** → `migrateState()` for version compatibility
3. **Modify** → CRUD operations update global `state`
4. **Save** → `save()` to localStorage
5. **Render** → `render()` rebuilds DOM from state

### **State Management:**
- Global mutable state object
- Immediate persistence on changes
- Complete DOM re-render on updates
- Staging system for column management (non-destructive editing)

## **5. Features and User Interactions**

### **Core Features:**
1. **Link Management**
   - Add new links with URL, title, and notes
   - Edit existing links
   - Delete links with confirmation
   - Automatic favicon fetching
   - URL validation and normalization

2. **Column System**
   - Drag-and-drop between columns (SortableJS)
   - Reorder columns (up/down arrows)
   - Add/remove columns
   - Rename columns
   - Safe column deletion (move cards to destination)

3. **Search & Filter**
   - Real-time search across titles, URLs, and notes
   - Case-insensitive matching
   - Instant results

4. **Data Management**
   - Export to JSON file
   - Import from JSON file
   - Reset to clean state (preserves column structure)
   - LocalStorage persistence

5. **Browser Integration**
   - Bookmarklet generation for quick adding
   - URL parameter support (`?add=URL&title=TITLE`)

### **Keyboard Shortcuts:**
- `A` - Add new link
- `/` - Focus search field

### **Theme System:**
- Light/Dark mode toggle
- System preference detection
- Persistent theme choice

### **Testing Features:**
- Built-in self-tests (`#selftest`)
- Column operation tests (`#test-columns`)
- Delete destination tests (`#test-dest-delete`)

### **Accessibility:**
- ARIA labels and roles
- Semantic HTML structure
- Keyboard navigation support
- Focus management in dialogs

## **Code Index Summary**

### **File Structure:**
- `index.html` (1,426 lines) - Complete SPA with inline CSS/JS
- `linkboardResetData.json` (208 lines) - Default data with web dev tools

### **Architecture:**
- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Storage**: Browser localStorage
- **Dependencies**: SortableJS (CDN)
- **Pattern**: Component-based with global state

### **Key Characteristics:**
- Single-file application (portable)
- No build system required
- Complete offline functionality
- Responsive design (mobile-first)
- Comprehensive theming system
- Extensive error handling and validation

## **Performance Considerations**

### **Current Implementation:**
- Complete DOM re-render on state changes
- Inline styles (large CSS block)
- Real-time search without debouncing
- Immediate localStorage writes

### **Potential Optimization Areas:**
- DOM diffing or virtual DOM for selective updates
- CSS extraction and minification
- Search input debouncing
- Batch localStorage operations
- Image lazy loading for favicons

The application is well-structured for a single-file SPA, with clear separation of concerns within the inline code blocks, comprehensive feature set, and good attention to user experience details.