# CollabCanvas MVP - Development Task List


---

## Phase 1: Foundation & Setup (Hours 0-5)

### 1.1 Project Initialization
- [x] **Task 1.1.1:** Create new React project with Vite + TypeScript
  - Initialize project: `npm create vite@latest collabcanvas -- --template react-ts`
  - Install base dependencies
  - Configure TypeScript strict mode
  - Set up ESLint and Prettier
  - **Validation:** Project runs with `npm run dev`

- [x] **Task 1.1.2:** Install core dependencies
  ```bash
  npm install konva react-konva
  npm install @supabase/supabase-js
  npm install @supabase/auth-ui-react @supabase/auth-ui-shared
  ```
  - **Validation:** All packages installed without conflicts

- [x] **Task 1.1.3:** Set up Git repository
  - Initialize Git repo
  - Create `.gitignore` (include `.env`)
  - Create initial commit
  - Push to GitHub
  - **Validation:** Repository visible on GitHub

### 1.2 Supabase Configuration
- [X] **Task 1.2.1:** Create Supabase project
  - Sign up for Supabase account
  - Create new project
  - Note project URL and anon key
  - **Validation:** Can access Supabase dashboard

- [ ] **Task 1.2.2:** Configure authentication providers
  - Enable Google OAuth in Supabase dashboard
  - Enable GitHub OAuth in Supabase dashboard
  - Configure redirect URLs for localhost and production
  - **Validation:** OAuth settings saved in dashboard

- [x] **Task 1.2.3:** Create database schema
  - Run SQL in Supabase SQL Editor:
  ```sql
  CREATE TABLE canvas_objects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL DEFAULT 'rectangle',
    x FLOAT NOT NULL,
    y FLOAT NOT NULL,
    width FLOAT NOT NULL,
    height FLOAT NOT NULL,
    color TEXT NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT min_width CHECK (width >= 20),
    CONSTRAINT min_height CHECK (height >= 20),
    CONSTRAINT within_bounds_x CHECK (x >= 0 AND x <= 3000),
    CONSTRAINT within_bounds_y CHECK (y >= 0 AND y <= 3000)
  );
  
  CREATE INDEX idx_canvas_objects_created_at ON canvas_objects(created_at);
  ```
  - **Validation:** Table visible in Table Editor

- [x] **Task 1.2.4:** Enable Row Level Security (RLS)
  - Enable RLS on `canvas_objects` table
  - Create policy: Allow authenticated users to SELECT
  - Create policy: Allow authenticated users to INSERT
  - Create policy: Allow authenticated users to UPDATE
  - **Validation:** RLS policies visible and enabled

- [ ] **Task 1.2.5:** Enable Realtime on table
  - Navigate to Database → Replication
  - Enable Realtime for `canvas_objects` table
  - **Validation:** Realtime toggle shows "enabled"

### 1.3 Environment Setup
- [x] **Task 1.3.1:** Create environment configuration
  - Create `.env.local` file
  - Add Supabase URL: `VITE_SUPABASE_URL=`
  - Add Supabase anon key: `VITE_SUPABASE_ANON_KEY=`
  - Create `.env.example` template
  - **Validation:** Environment variables load in app

- [x] **Task 1.3.2:** Create Supabase client
  - Create `src/lib/supabase.ts`
  - Initialize Supabase client with env variables
  - Export typed client
  - **Validation:** No TypeScript errors

### 1.4 Initial Deployment
- [x] **Task 1.4.1:** Deploy to Vercel
  - Connect GitHub repo to Vercel
  - Configure environment variables in Vercel
  - Deploy initial version
  - **Validation:** App accessible via Vercel URL

- [ ] **Task 1.4.2:** Update Supabase redirect URLs
  - Add production URL to OAuth redirect URLs
  - Test authentication on production
  - **Validation:** OAuth works on deployed site

---

## Phase 2: Canvas Implementation (Hours 5-12)

### 2.1 Basic Canvas Setup (FR-2)
- [x] **Task 2.1.1:** Create Canvas component structure
  - Create `src/components/Canvas.tsx`
  - Set up Konva Stage and Layer
  - Configure canvas dimensions (3000x3000)
  - **Validation:** Blank canvas renders

- [x] **Task 2.1.2:** Implement grid background
  - Create grid pattern with 50px squares
  - Use light gray color (#e5e7eb)
  - Render grid as Konva shapes or image
  - **Validation:** Grid visible on canvas

- [x] **Task 2.1.3:** Add pan functionality
  - Implement mouse drag to pan
  - Track mouse down/move/up events
  - Update stage position on drag
  - **Validation:** Can drag canvas smoothly

- [x] **Task 2.1.4:** Add zoom functionality
  - Implement mouse wheel zoom
  - Zoom range: 0.1 (10%) to 5.0 (500%)
  - Center zoom on cursor position
  - **Validation:** Zoom in/out works, centers on cursor

- [x] **Task 2.1.5:** Implement boundary constraints
  - Calculate visible bounds based on zoom/pan
  - Prevent panning beyond canvas edges
  - Clamp pan position to valid range
  - **Validation:** Cannot pan outside canvas bounds

### 2.2 Rectangle Creation (FR-3)
- [x] **Task 2.2.1:** Implement click-to-create rectangle
  - Listen for canvas click events
  - Calculate click position in canvas coordinates
  - Create rectangle at cursor position
  - **Validation:** Click creates rectangle

- [x] **Task 2.2.2:** Set up color palette system
  - Define 8 preset colors array
  - Implement color cycling logic
  - Track current color index
  - **Validation:** Rectangles cycle through colors

- [x] **Task 2.2.3:** Create Rectangle component
  - Create `src/components/Rectangle.tsx`
  - Render Konva Rect with props
  - Default size: 100x100px
  - Apply color from palette
  - **Validation:** Rectangles render with correct size/color

- [x] **Task 2.2.4:** Add minimum size enforcement
  - Validate width/height >= 20px
  - Enforce constraint in creation logic
  - **Validation:** Cannot create rectangle < 20x20px

### 2.3 Selection & Movement (FR-4)
- [x] **Task 2.3.1:** Implement rectangle selection
  - Add onClick handler to rectangles
  - Track selected rectangle ID in state
  - Render 2px blue border on selected rectangle
  - **Validation:** Clicking rectangle shows selection border

- [x] **Task 2.3.2:** Implement deselection
  - Add onClick handler to canvas background
  - Clear selected ID on background click
  - **Validation:** Clicking empty space deselects

- [x] **Task 2.3.3:** Implement drag movement
  - Enable draggable on Konva Rect
  - Track drag position updates
  - Update rectangle state on drag
  - **Validation:** Can drag rectangles smoothly

- [x] **Task 2.3.4:** Add movement boundary constraints
  - Calculate rectangle bounds during drag
  - Prevent rectangle center from leaving canvas
  - Clamp position to valid range
  - **Validation:** Rectangle stays within canvas bounds

### 2.4 Local State Management
- [x] **Task 2.4.1:** Create state management structure
  - Define Rectangle interface/type
  - Create rectangles state array
  - Implement add/update/select operations
  - **Validation:** State updates trigger re-renders

- [x] **Task 2.4.2:** Implement optimistic updates
  - Update local state immediately on actions
  - Don't wait for database confirmation
  - **Validation:** Actions feel instant, no lag

---

## Phase 3: Real-Time Collaboration (Hours 12-20)

### 3.1 Authentication (FR-1)
- [x] **Task 3.1.1:** Create Auth component
  - Create `src/components/Auth.tsx`
  - Use Supabase Auth UI components
  - Configure Google and GitHub providers
  - **Validation:** Auth UI renders

- [x] **Task 3.1.2:** Implement auth state management
  - Listen to auth state changes
  - Store user session in state
  - Handle sign in/out events
  - **Validation:** User object available after login

- [x] **Task 3.1.3:** Add persistent sessions
  - Configure Supabase session persistence
  - Auto-restore session on page load
  - **Validation:** User stays logged in after refresh

- [x] **Task 3.1.4:** Implement auth routing
  - Show Auth component if not logged in
  - Show Canvas component if logged in
  - Auto-redirect after successful auth
  - **Validation:** Correct component shows based on auth state

### 3.2 Database Integration (FR-9)
- [x] **Task 3.2.1:** Create database operations module
  - Create `src/lib/database.ts`
  - Implement `createRectangle()` function
  - Implement `updateRectangle()` function
  - Implement `loadRectangles()` function
  - **Validation:** Functions execute without errors

- [x] **Task 3.2.2:** Integrate create operations
  - Call `createRectangle()` when user creates rectangle
  - Pass user ID from auth context
  - Handle success/error responses
  - **Validation:** Rectangles saved to database

- [x] **Task 3.2.3:** Integrate update operations
  - Call `updateRectangle()` when user moves rectangle
  - Debounce updates to avoid excessive writes
  - **Validation:** Position updates saved to database

- [x] **Task 3.2.4:** Implement initial state load
  - Load all rectangles on component mount
  - Populate local state with database data
  - **Validation:** Existing rectangles load on page refresh

### 3.3 Real-Time Synchronization (FR-5)
- [x] **Task 3.3.1:** Subscribe to INSERT events
  - Set up Supabase Realtime subscription
  - Listen for INSERT on `canvas_objects`
  - Add new rectangles to local state
  - **Validation:** User A creates, User B sees new rectangle

- [x] **Task 3.3.2:** Subscribe to UPDATE events
  - Listen for UPDATE on `canvas_objects`
  - Update matching rectangle in local state
  - **Validation:** User A moves, User B sees movement

- [ ] **Task 3.3.3:** Implement conflict resolution
  - Use last-write-wins strategy
  - Always apply latest update from database
  - Don't merge conflicting changes
  - **Validation:** Concurrent edits resolve consistently

- [ ] **Task 3.3.4:** Add reconnection logic
  - Detect connection drops
  - Auto-reconnect when connection restored
  - Reload state after reconnection
  - **Validation:** Recovers from network interruption

- [ ] **Task 3.3.5:** Optimize sync performance
  - Batch updates where possible
  - Debounce high-frequency updates (drag)
  - Target <100ms propagation latency
  - **Validation:** Sync latency measured < 100ms

### 3.4 Multiplayer Cursors (FR-6)
- [ ] **Task 3.4.1:** Set up cursor broadcasting
  - Initialize Supabase Broadcast channel
  - Track local cursor position on canvas
  - **Validation:** Broadcast channel connected

- [ ] **Task 3.4.2:** Implement cursor position broadcasting
  - Send cursor position every 30ms
  - Include user ID and username in payload
  - Only broadcast when cursor on canvas
  - **Validation:** Cursor positions sent via broadcast

- [ ] **Task 3.4.3:** Create Cursor component
  - Create `src/components/Cursor.tsx`
  - Render SVG cursor with username label
  - Apply user-specific color
  - **Validation:** Cursor renders with correct styling

- [ ] **Task 3.4.4:** Receive and display remote cursors
  - Subscribe to broadcast messages
  - Store remote cursor positions in state
  - Filter out own cursor
  - Render Cursor component for each remote user
  - **Validation:** Remote cursors visible and smooth

- [ ] **Task 3.4.5:** Implement cursor cleanup
  - Remove cursors when users disconnect
  - Handle stale cursor cleanup (no update for 5s)
  - **Validation:** Cursors disappear when users leave

- [ ] **Task 3.4.6:** Assign consistent user colors
  - Hash user ID to color index
  - Use same color palette as rectangles
  - Ensure color consistency across sessions
  - **Validation:** Same user always has same color

### 3.5 Presence Awareness (FR-7)
- [ ] **Task 3.5.1:** Set up Presence tracking
  - Initialize Supabase Presence channel
  - Join presence on auth
  - Leave presence on logout/disconnect
  - **Validation:** Presence channel working

- [ ] **Task 3.5.2:** Broadcast user presence
  - Send user ID, username, and color on join
  - Update presence metadata as needed
  - **Validation:** Presence data available to other users

- [ ] **Task 3.5.3:** Create Presence Panel component
  - Create `src/components/PresencePanel.tsx`
  - Position in top-left corner
  - Display user count
  - **Validation:** Panel renders in correct position

- [ ] **Task 3.5.4:** Display online users list
  - Subscribe to presence state changes
  - Render list of all online users
  - Show color dot next to each username
  - Highlight current user with "(You)"
  - **Validation:** All users listed with correct colors

- [ ] **Task 3.5.5:** Handle presence updates
  - Update list on user join
  - Update list on user leave
  - Target <200ms update latency
  - **Validation:** Join/leave updates appear quickly

---

## Phase 4: Polish & Optimization (Hours 20-24)

### 4.1 Performance Monitoring (FR-8)
- [ ] **Task 4.1.1:** Create FPS Counter component
  - Create `src/components/FPSCounter.tsx`
  - Position in top-right corner
  - Calculate FPS using requestAnimationFrame
  - **Validation:** FPS counter renders

- [ ] **Task 4.1.2:** Implement FPS calculation
  - Track frame timestamps
  - Calculate average FPS over 1 second
  - Update display every second
  - **Validation:** FPS value accurate

- [ ] **Task 4.1.3:** Add color coding
  - Green: 55-60 FPS
  - Yellow: 45-54 FPS
  - Red: < 45 FPS
  - **Validation:** Color changes based on performance

### 4.2 Performance Optimization (TR-1)
- [ ] **Task 4.2.1:** Optimize canvas rendering
  - Use Konva's caching where appropriate
  - Minimize unnecessary re-renders
  - Implement React.memo on components
  - **Validation:** Maintain 60 FPS with 100+ rectangles

- [ ] **Task 4.2.2:** Optimize cursor updates
  - Throttle cursor position updates to 30ms
  - Use requestAnimationFrame for smooth updates
  - **Validation:** Cursor movement smooth at 60 FPS

- [ ] **Task 4.2.3:** Optimize database operations
  - Add database indexes if needed
  - Batch operations where possible
  - Implement connection pooling
  - **Validation:** Database queries < 100ms

- [ ] **Task 4.2.4:** Test performance under load
  - Create 500 test rectangles
  - Test with 5 concurrent users
  - Monitor FPS and latency
  - **Validation:** Meets TR-1 requirements

### 4.3 UI/UX Polish
- [ ] **Task 4.3.1:** Style authentication page
  - Add app logo/branding
  - Center auth UI
  - Add loading states
  - **Validation:** Auth page looks professional

- [ ] **Task 4.3.2:** Add loading indicators
  - Show spinner while loading initial state
  - Show status during reconnection
  - **Validation:** User knows when data is loading

- [ ] **Task 4.3.3:** Improve visual feedback
  - Add hover effects to rectangles
  - Smooth selection transitions
  - Cursor changes on interactive elements
  - **Validation:** Interactions feel responsive

- [ ] **Task 4.3.4:** Add keyboard hints
  - Show basic instructions on first load
  - Optional: Add help tooltip
  - **Validation:** New users understand how to interact

### 4.4 Testing (All Test Scenarios)
- [ ] **Task 4.4.1:** Test Scenario 1 - Basic Collaboration
  - Open in 2 different browsers
  - Create rectangles from each
  - Verify both see changes
  - Measure sync latency
  - **Validation:** All changes visible < 100ms

- [ ] **Task 4.4.2:** Test Scenario 2 - Simultaneous Editing
  - 2 users grab same rectangle
  - Both drag to different positions
  - Verify last-write-wins
  - Check for visual glitches
  - **Validation:** Resolves cleanly

- [ ] **Task 4.4.3:** Test Scenario 3 - Presence & Cursors
  - 3 users join sequentially
  - Verify all see each other
  - Move cursors rapidly
  - Have user leave
  - **Validation:** All presence updates < 200ms

- [ ] **Task 4.4.4:** Test Scenario 4 - State Persistence
  - Create 5 rectangles
  - Refresh page
  - Create 3 more
  - Close and reopen browser
  - **Validation:** All 8 rectangles persist

- [ ] **Task 4.4.5:** Test Scenario 5 - Performance Under Load
  - Create 500 rectangles programmatically
  - Have 5 users join
  - Test pan/zoom/create/move
  - **Validation:** FPS > 55, sync < 100ms

- [ ] **Task 4.4.6:** Test Scenario 6 - Network Resilience
  - Create rectangles
  - Simulate network disconnect (DevTools)
  - Reconnect after 10 seconds
  - **Validation:** Auto-reconnects, no data loss

### 4.5 Bug Fixes & Edge Cases
- [ ] **Task 4.5.1:** Handle edge case: rapid clicking
  - Test creating many rectangles quickly
  - Verify no duplicate IDs or glitches
  - **Validation:** Works smoothly

- [ ] **Task 4.5.2:** Handle edge case: concurrent user actions
  - Multiple users creating at same time
  - Multiple users moving same object
  - **Validation:** No conflicts or crashes

- [ ] **Task 4.5.3:** Handle edge case: slow network
  - Simulate slow 3G connection
  - Verify optimistic updates work
  - **Validation:** UI remains responsive

- [ ] **Task 4.5.4:** Fix any critical bugs found in testing
  - Document bugs in issue tracker
  - Prioritize critical bugs
  - Fix and re-test
  - **Validation:** No critical bugs remain

### 4.6 Documentation
- [ ] **Task 4.6.1:** Write README.md
  - Project overview
  - Features list
  - Setup instructions
  - Environment variables needed
  - **Validation:** README clear and complete

- [ ] **Task 4.6.2:** Add architecture documentation
  - Include architecture diagram
  - Explain tech stack choices
  - Document data flow
  - **Validation:** Architecture documented

- [ ] **Task 4.6.3:** Document API/database schema
  - List all database tables
  - Explain RLS policies
  - Document Supabase configuration
  - **Validation:** Schema documented

### 4.7 Final Deployment
- [ ] **Task 4.7.1:** Deploy final version to Vercel
  - Commit all changes to main branch
  - Verify Vercel auto-deploys
  - Test deployed application
  - **Validation:** Production app works perfectly

- [ ] **Task 4.7.2:** Verify production OAuth
  - Test Google login on production
  - Test GitHub login on production
  - **Validation:** Both OAuth providers work

- [ ] **Task 4.7.3:** Test production with multiple users
  - Have 3+ people test concurrently
  - Verify all features work
  - Check for production-specific issues
  - **Validation:** Multi-user collaboration works

### 4.8 Demo Video
- [ ] **Task 4.8.1:** Record demo video (3-5 minutes)
  - Show authentication flow
  - Demonstrate rectangle creation/movement
  - Show real-time collaboration (2 browsers side-by-side)
  - Display multiplayer cursors
  - Show presence awareness
  - Demonstrate persistence (page refresh)
  - Explain architecture briefly
  - **Validation:** Video complete and uploaded

### 4.9 Submission Preparation
- [ ] **Task 4.9.1:** Create AI Development Log
  - Document AI tools used (Claude, Copilot, etc.)
  - List effective prompts
  - Estimate AI vs hand-written code %
  - Share key learnings
  - **Validation:** 1-page log complete

- [ ] **Task 4.9.2:** Final checklist review
  - Review all acceptance criteria
  - Verify all P0 features implemented
  - Confirm all test scenarios pass
  - Check no critical bugs
  - **Validation:** Ready for submission

- [ ] **Task 4.9.3:** Submit deliverables
  - GitHub repository with README
  - Deployed application URL
  - Demo video link
  - AI Development Log
  - **Validation:** Submitted before deadline

---

## Dependencies & Critical Path

### Critical Path (Must complete in order):
1. Phase 1.1-1.3 → Phase 1.4 (Foundation before deployment)
2. Phase 2.1 → Phase 2.2 → Phase 2.3 (Canvas before rectangles before interaction)
3. Phase 3.1 → Phase 3.2 (Auth before database operations)
4. Phase 3.2 → Phase 3.3 (Database integration before real-time sync)
5. Phase 3.3 → Phase 3.4, 3.5 (Basic sync before cursors/presence)

### Can Work in Parallel:
- Phase 3.4 (Cursors) || Phase 3.5 (Presence) - Independent features
- Phase 4.1 (FPS Counter) - Can be built anytime after canvas exists
- Phase 4.3 (UI Polish) - Can happen alongside testing

### Blockers:
- **Nothing can proceed until Phase 1.1-1.3 complete** (Foundation)
- **Phase 3 blocked by Phase 2** (Need canvas before adding collaboration)
- **Phase 4.4 (Testing) blocked by all feature work** (Need features to test)

---

## Acceptance Criteria Tracking

### Core Features (Must Have All ✅):
- [ ] Authentication with Google OAuth
- [ ] Authentication with GitHub OAuth
- [x] Canvas with pan and zoom
- [x] Rectangle creation
- [x] Rectangle movement
- [ ] Real-time object synchronization
- [ ] Multiplayer cursors
- [ ] Presence awareness panel
- [ ] State persistence
- [ ] FPS counter

### Performance Targets:
- [ ] 60 FPS during normal usage
- [ ] <100ms object sync latency
- [ ] <50ms cursor update latency
- [ ] <200ms presence update latency
- [ ] Support 500+ rectangles
- [ ] Support 5+ concurrent users

### Quality Gates:
- [ ] All 6 test scenarios pass
- [ ] Zero critical bugs
- [ ] Demo video shows all features
- [ ] Application deployed and accessible
- [ ] Documentation complete

---

## Notes

**Estimated Hours per Phase:**
- Phase 1: 5 hours
- Phase 2: 7 hours
- Phase 3: 8 hours
- Phase 4: 4 hours
- **Total: 24 hours**

**Risk Mitigation:**
- Build Phase 1 thoroughly - it's the foundation
- Test each feature immediately after building
- Deploy early and often
- Keep scope tight - no scope creep
- Use AI assistance wisely but verify all code

**Success Indicators:**
✅ Features work as specified  
✅ Performance targets met  
✅ No critical bugs in production  
✅ Demo video impresses stakeholders  
✅ Code is maintainable for future iterations