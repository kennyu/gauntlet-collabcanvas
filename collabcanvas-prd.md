# CollabCanvas MVP - Product Requirements Document

## Executive Summary

CollabCanvas is a real-time collaborative canvas application enabling multiple users to simultaneously create, move, and manipulate rectangles on a shared workspace. The MVP focuses on proving the collaborative infrastructure works reliably with features including live cursor tracking, presence awareness, and conflict-free object synchronization.

**Primary Goal:** Prove that real-time collaborative infrastructure works flawlessly  
**Target Users:** 2-5 concurrent collaborators  
**Tech Stack:** React + TypeScript + Konva.js + Supabase + Vercel

---

## Goals & Objectives

### Primary Goal
Demonstrate production-ready real-time collaboration infrastructure that:
- Synchronizes all changes across users in <100ms
- Maintains 60 FPS performance with multiple concurrent users
- Persists state reliably across sessions
- Handles conflicts gracefully

### Success Criteria
**The MVP passes if:**
1. Two users can collaborate from different locations without sync issues
2. All features work reliably for 10+ consecutive minutes
3. Performance targets are met (60 FPS, <100ms sync)
4. Demo can be presented to stakeholders without critical bugs

---

## User Stories

### Authentication & Access
- **As a new user**, I want to sign in with Google or GitHub so I can start collaborating immediately
- **As a returning user**, I want to stay logged in so I don't have to re-authenticate each session

### Canvas Operations
- **As a user**, I want to pan and zoom the canvas so I can navigate a large workspace
- **As a user**, I want to create rectangles by clicking so I can quickly add objects
- **As a user**, I want to move rectangles by dragging so I can arrange my design
- **As a user**, I want to see a grid pattern so I can orient myself spatially

### Collaboration
- **As a user**, I want to see other users' cursors in real-time so I know where they're working
- **As a user**, I want to see who else is online so I understand who I'm collaborating with
- **As a user**, I want to see changes other users make instantly so we can work together seamlessly
- **As a user**, I want my changes to persist when I refresh so I don't lose work

### Performance Monitoring
- **As a developer**, I want to see FPS counter so I can monitor performance in real-time

---

## Feature Requirements

### FR-1: User Authentication
**Priority:** P0 (Must Have)  
**Status:** Required for MVP

**Requirements:**
- OAuth authentication with Google and GitHub providers
- Persistent sessions across browser restarts
- Automatic redirect to canvas after successful auth
- Display username/email from OAuth profile

**Acceptance Criteria:**
- [ ] User can sign in with Google OAuth
- [ ] User can sign in with GitHub OAuth
- [ ] Session persists after page refresh
- [ ] Username appears in presence panel after login

---

### FR-2: Canvas Workspace
**Priority:** P0 (Must Have)  
**Status:** Required for MVP

**Requirements:**
- Fixed canvas size: 3000x3000 pixels
- Grid background: 50px squares, light gray color
- Pan functionality: Click and drag to move canvas
- Zoom functionality: Mouse wheel to zoom in/out (10% to 500%)
- Boundary constraints: Cannot pan beyond canvas edges

**Acceptance Criteria:**
- [ ] Canvas renders at 3000x3000px with grid
- [ ] Pan works smoothly at 60 FPS
- [ ] Zoom centers on cursor position
- [ ] Cannot pan outside bounds
- [ ] Grid pattern visible at all zoom levels

---

### FR-3: Rectangle Creation
**Priority:** P0 (Must Have)  
**Status:** Required for MVP

**Requirements:**
- Click anywhere on canvas to create rectangle
- Default size: 100x100 pixels
- Minimum size: 20x20 pixels (enforced)
- Color assignment: Cycle through 8 preset colors
- Auto-select after creation

**Acceptance Criteria:**
- [ ] Click creates 100x100px rectangle centered on cursor
- [ ] Cannot create rectangle smaller than 20x20px
- [ ] Colors cycle through preset palette
- [ ] New rectangle automatically selected (blue border)
- [ ] Rectangle persists to database

---

### FR-4: Object Selection & Movement
**Priority:** P0 (Must Have)  
**Status:** Required for MVP

**Requirements:**
- Click rectangle to select (shows blue border)
- Drag selected rectangle to move
- Click elsewhere to deselect
- Movement constrained to canvas bounds

**Acceptance Criteria:**
- [ ] Clicking rectangle shows 2px blue selection border
- [ ] Dragging moves rectangle smoothly at 60 FPS
- [ ] Rectangle center cannot leave canvas bounds
- [ ] Clicking empty area deselects
- [ ] Movement syncs to all users in <100ms

---

### FR-5: Real-Time Object Synchronization
**Priority:** P0 (Must Have)  
**Status:** Required for MVP

**Requirements:**
- All object creation events sync to all users
- All object movement events sync to all users
- Sync latency: <100ms (p95)
- Conflict resolution: Last-write-wins
- Optimistic updates for smooth local UX

**Acceptance Criteria:**
- [ ] User A creates rectangle, User B sees it in <100ms
- [ ] User A moves rectangle, User B sees movement in <100ms
- [ ] Concurrent edits resolve with last-write-wins
- [ ] No visual glitches during sync
- [ ] Objects persist across page refresh

---

### FR-6: Multiplayer Cursors
**Priority:** P0 (Must Have)  
**Status:** Required for MVP

**Requirements:**
- Show all remote users' cursor positions in real-time
- Update frequency: 30ms (33 FPS)
- Display username label above each cursor
- Assign unique color per user (consistent across sessions)
- Hide own cursor (show only remote cursors)
- Latency target: <50ms end-to-end

**Acceptance Criteria:**
- [ ] Remote cursors visible within 200ms of user joining
- [ ] Cursor positions update every 30ms
- [ ] Username label appears 15px above cursor
- [ ] Each user has consistent color
- [ ] Own cursor not rendered
- [ ] Cursors disappear when users leave

---

### FR-7: Presence Awareness Panel
**Priority:** P0 (Must Have)  
**Status:** Required for MVP

**Requirements:**
- Panel positioned top-left corner
- Show count of online users
- List all usernames with color indicators
- Highlight current user with "(You)" label
- Real-time updates on join/leave
- Color dots match cursor colors

**Acceptance Criteria:**
- [ ] Panel shows accurate user count
- [ ] All online users listed
- [ ] Current user marked with "(You)"
- [ ] Join/leave updates in <200ms
- [ ] Color consistency with cursors
- [ ] Panel doesn't block canvas interaction

---

### FR-8: FPS Counter
**Priority:** P1 (Should Have)  
**Status:** Required for MVP

**Requirements:**
- Display real-time FPS in top-right corner
- Update every 1 second
- Color coding: Green (55-60), Yellow (45-54), Red (<45)
- Always visible during canvas usage

**Acceptance Criteria:**
- [ ] FPS counter visible in top-right
- [ ] Updates every second
- [ ] Color changes based on performance
- [ ] Doesn't interfere with canvas

---

### FR-9: State Persistence
**Priority:** P0 (Must Have)  
**Status:** Required for MVP

**Requirements:**
- All rectangles saved to database immediately
- Canvas state restored on page load
- No data loss on disconnect/reconnect
- State shared across all users

**Acceptance Criteria:**
- [ ] User creates 5 rectangles, refreshes page, all 5 still there
- [ ] User disconnects for 10 seconds, reconnects, sees current state
- [ ] All users see identical canvas state
- [ ] Database queries complete in <100ms

---

## Technical Requirements

### TR-1: Performance
- **Canvas Rendering:** Maintain 60 FPS during all interactions
- **Frame Budget:** <16ms per frame (1000ms / 60fps)
- **Object Capacity:** Support 500+ rectangles without FPS degradation
- **Concurrent Users:** Support 5+ simultaneous users
- **Memory:** No memory leaks during 30-minute sessions

### TR-2: Latency
- **Object Sync:** <100ms propagation time (p95)
- **Cursor Updates:** <50ms end-to-end latency (p95)
- **Presence Changes:** <200ms notification time
- **Database Operations:** <100ms for reads/writes (p95)

### TR-3: Reliability
- **Uptime:** 99%+ during testing period
- **Error Handling:** Graceful degradation on network failure
- **Auto-Reconnection:** Automatic reconnection after disconnect
- **Data Integrity:** Zero data loss under normal operations

### TR-4: Browser Support
- **Supported:** Chrome 100+, Firefox 100+, Safari 15+, Edge 100+
- **Not Supported:** Internet Explorer, Mobile browsers
- **Required Features:** WebSocket, HTML5 Canvas, ES6+

### TR-5: Infrastructure
- **Frontend:** Vercel (free tier)
- **Backend:** Supabase Cloud (free tier)
- **Bandwidth:** ~77 MB/hour with 5 concurrent users
- **Storage:** <500MB database usage

---

## Non-Functional Requirements

### NFR-1: Usability
- Zero learning curve for basic operations
- No tutorial or documentation required
- Intuitive interactions following web conventions

### NFR-2: Security
- All API requests authenticated with JWT
- Row Level Security enabled on database
- HTTPS enforced
- OAuth tokens securely stored

### NFR-3: Scalability (Post-MVP)
- Architecture supports future scaling
- Clear migration path from free tier
- Modular design for feature additions

---

## Out of Scope (MVP)

### Features NOT Included
- ❌ Delete functionality
- ❌ Undo/redo
- ❌ Multiple shape types (only rectangles)
- ❌ Resize or rotate objects
- ❌ Color picker (preset colors only)
- ❌ Copy/paste
- ❌ Keyboard shortcuts
- ❌ Text input
- ❌ Multiple canvases/rooms
- ❌ Comments or annotations
- ❌ Version history
- ❌ Export to PNG/SVG
- ❌ Mobile responsive design
- ❌ AI canvas agent (separate phase)

### Post-MVP Considerations
- Delete functionality (high priority)
- Undo/redo (high priority)
- Color picker (medium priority)
- Text tool (medium priority)
- Multiple shape types (low priority)

---

## Timeline & Milestones

### MVP Checkpoint: Tuesday (24 Hours)
**Hard Gate - Must Have All Features:**
- ✅ Basic canvas with pan/zoom
- ✅ Rectangle creation and movement
- ✅ Real-time sync between 2+ users
- ✅ Multiplayer cursors with name labels
- ✅ Presence awareness (who's online)
- ✅ User authentication
- ✅ Deployed and publicly accessible
- ✅ FPS counter visible

### Development Phases

**Phase 1: Foundation (Hours 0-5)**
- Project setup (React + TypeScript + Vite)
- OAuth configuration (Google + GitHub)
- Database schema creation
- Basic UI layout
- Initial deployment

**Phase 2: Canvas Implementation (Hours 5-12)**
- Konva.js canvas setup
- Pan/zoom functionality
- Rectangle creation & selection
- Object movement
- Local state management

**Phase 3: Real-Time Sync (Hours 12-20)**
- Supabase Realtime integration
- Object synchronization
- Cursor broadcasting (Supabase Presence)
- Online users panel
- Conflict resolution

**Phase 4: Testing & Polish (Hours 20-24)**
- Multi-user testing
- Bug fixes
- Performance optimization
- Final deployment
- Demo video recording

---

## Testing Requirements

### Test Scenario 1: Basic Collaboration
**Setup:** 2 users in different browsers  
**Duration:** 5 minutes  
**Steps:**
1. User A creates 3 rectangles
2. User B joins, sees all rectangles
3. User B creates 2 rectangles
4. User A sees new rectangles appear

**Success:** All changes visible to both users within 100ms

---

### Test Scenario 2: Simultaneous Editing
**Setup:** 2 users editing same object  
**Duration:** 2 minutes  
**Steps:**
1. Both users grab same rectangle
2. Both drag to different positions
3. Both release at different times

**Success:** Last-write-wins, no visual glitches, both see final position

---

### Test Scenario 3: Presence & Cursors
**Setup:** 3 users joining sequentially  
**Duration:** 3 minutes  
**Steps:**
1. User A joins, sees themselves in list
2. User B joins, both see each other
3. Users move cursors rapidly
4. User C joins
5. User B leaves

**Success:** 
- All joins/leaves reflected in <200ms
- Cursors visible and smooth
- No disappeared cursors

---

### Test Scenario 4: State Persistence
**Setup:** 1 user creating objects  
**Duration:** 3 minutes  
**Steps:**
1. User creates 5 rectangles
2. User refreshes page
3. User creates 3 more rectangles
4. User closes browser, reopens

**Success:** All 8 rectangles persist across all operations

---

### Test Scenario 5: Performance Under Load
**Setup:** 500 rectangles, 5 concurrent users  
**Duration:** 5 minutes  
**Steps:**
1. Programmatically create 500 rectangles
2. 5 users join and move cursors
3. Users pan and zoom rapidly
4. Users create and move objects

**Success:** 
- FPS stays above 55
- No lag in cursor movement
- All syncs complete in <100ms

---

### Test Scenario 6: Network Resilience
**Setup:** 1 user with network interruption  
**Duration:** 2 minutes  
**Steps:**
1. User creates rectangles
2. Disconnect network for 10 seconds
3. Reconnect network

**Success:** 
- User sees disconnect indicator
- Reconnects automatically
- Canvas state restored
- No data loss

---

## Assumptions & Dependencies

### Assumptions
- Users have stable internet connection (1+ Mbps)
- Users access from desktop/laptop (not mobile)
- Users have modern browsers (Chrome/Firefox/Safari/Edge)
- OAuth providers (Google, GitHub) remain available
- Supabase free tier sufficient for testing

### Dependencies
- **Supabase:** Real-time infrastructure, auth, database
- **Vercel:** Frontend hosting and deployment
- **OAuth Providers:** Google and GitHub APIs
- **Browser APIs:** WebSocket, Canvas, ES6+

### Risks & Mitigations
| Risk | Impact | Mitigation |
|------|--------|-----------|
| Supabase bandwidth limits | High | Monitor usage, throttle cursor updates if needed |
| OAuth setup complexity | Medium | Allow 2-3 hours for configuration |
| Performance on older hardware | Low | Test on minimum spec machine |
| Network instability | Medium | Implement reconnection logic |
| Concurrent edit conflicts | Medium | Document last-write-wins behavior |

---

## Submission Requirements

**By Sunday 10:59 PM CT:**
1. **GitHub Repository**
   - README with setup instructions
   - Architecture overview
   - Link to deployed application

2. **Demo Video** (3-5 minutes)
   - Show real-time collaboration
   - Demonstrate all MVP features
   - Explain architecture briefly

3. **Deployed Application**
   - Publicly accessible URL
   - Supports 5+ concurrent users
   - Authentication working

4. **AI Development Log** (1 page)
   - Tools used
   - Effective prompts
   - Code analysis (AI vs hand-written %)
   - Learnings

---

## Acceptance Criteria Summary

**MVP Passes If:**
- ✅ All FR-1 through FR-9 features implemented
- ✅ All technical requirements (TR-1 through TR-5) met
- ✅ All 6 test scenarios pass
- ✅ No critical bugs in deployed version
- ✅ Demo video clearly shows functionality
- ✅ Application deployed and accessible

**MVP Fails If:**
- ❌ Any P0 feature missing or broken
- ❌ Performance below 55 FPS under normal usage
- ❌ Sync latency exceeds 200ms regularly
- ❌ Critical bugs during demonstration
- ❌ Not deployed or inaccessible

---

## Appendix: Technical Specifications

### Database Schema
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
```

### Color Palettes
```javascript
// Rectangle colors (cycle through)
const RECTANGLE_COLORS = [
  '#ef4444', '#3b82f6', '#10b981', '#f59e0b',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'
];

// Cursor/user colors (assigned by user ID hash)
const CURSOR_COLORS = [
  '#ef4444', '#3b82f6', '#10b981', '#f59e0b',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'
];
```

### Canvas Constants
```javascript
const CANVAS_CONFIG = {
  width: 3000,
  height: 3000,
  gridSize: 50,
  gridColor: '#e5e7eb',
  backgroundColor: '#ffffff',
  
  minZoom: 0.1,
  maxZoom: 5.0,
  
  defaultRectSize: 100,
  minRectSize: 20,
  
  cursorUpdateInterval: 30, // ms
  selectionBorderWidth: 2,
  selectionBorderColor: '#2563eb'
};
```

---

**Document Status:** Approved  
**Next Step:** Technical Architecture Document  
**Owner:** Development Team  
**Reviewers:** Project Lead, Technical Advisor