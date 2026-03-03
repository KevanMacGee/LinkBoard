# LinkBoard Project Status & Roadmap
**Date:** March 2, 2026

## 1. Current Project Status: "Late-Stage Prototype"
LinkBoard is currently a functional, polished frontend application designed for local use. 

### ✅ What is Working:
- **Core UI/UX:** The dashboard (`index.html`) is fully functional with a column-based layout for bookmarks.
- **Card Management:** Adding, editing, and deleting bookmarks (cards) is complete.
- **Dynamic Assets:** Automatic favicon fetching using DuckDuckGo's service.
- **Organization:** Drag-and-drop sorting and column management (create/delete/reorder).
- **Data Portability:** JSON-based Export and Import functionality is present.
- **Build Pipeline:** A custom script (`scripts/inline-builder.js`) allows for "inlining" the entire app into a single HTML file for static distribution.
- **Landing Page:** A foundational landing page exists at `app/landing-index.html`.

### ⚠️ Technical Debt & Limitations:
- **Persistence:** Currently relies entirely on `localStorage`, meaning data is scoped to a single browser/device.
- **Architecture:** The app is "pure frontend." To support multiple users and payments, a server-side component is required.
- **Security:** There is currently no concept of "protected" data; all logic is client-side.

---

## 2. Gap Analysis (User Accounts & Payments)
To reach your goal of adding users and a paid tier, the following infrastructure is missing:

1.  **Backend API:** A server to handle authentication, database queries, and payment webhooks.
2.  **User Database:** A persistent store for user profiles and their saved links.
3.  **Auth System:** A way for users to sign up, log in, and stay authenticated.
4.  **Payment Gateway:** Stripe integration for handling subscriptions.
5.  **Tier Enforcement:** Logic to check if a user is "Free" or "Paid" and limit features accordingly.

---

## 3. Recommended Roadmap

### Phase 1: Backend Scaffolding (The "Brain")
- **Action:** Initialize a Node.js/Express server.
- **Goal:** Create a secure environment to handle user data that can't be tampered with in the browser.

### Phase 2: Database Migration
- **Action:** Define a schema (User -> Columns -> Cards).
- **Goal:** Move data from `storage.local.js` to a real database (e.g., PostgreSQL or MongoDB). Add a "Migration" utility to help existing local users move their data to the cloud.

### Phase 3: Authentication & User Profiles
- **Action:** Implement Auth (using a service like Firebase Auth or a library like Passport.js).
- **Goal:** Allow users to "Add New User" (Sign up) and log in.

### Phase 4: Tier Logic & Payments
- **Action:** Integrate Stripe.
- **Goal:**
    - Create a **Free Tier** (e.g., limit to 3 columns, 20 links).
    - Create a **Paid Tier** (unlimited).
    - Implement a "Subscription Management" modal in the UI.

### Phase 5: UI/UX Refinement
- **Action:** Update the header to show the logged-in user and a "Go Pro" button for free users.
- **Goal:** Finalize the transition from a "local tool" to a "SaaS platform."

---

## 4. Immediate Next Task
**Recommendation:** Start by selecting your backend stack and setting up a basic "Hello World" API that connects to a database. This will provide the foundation for everything else.
