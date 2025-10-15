canvases
Purpose: Stores canvas metadata (one row per canvas).
Columns:
    id (uuid) — primary key, default: gen_random_uuid()
    name (text)
    owner_user_id (uuid) — nullable, references auth.users.id (implied by usage; not listed as FK in metadata)
    created_at (timestamptz) — default: now()
Rows: 1
RLS: disabled
Notes: Holds the canvas identifier you queried earlier (example id: 95ff5e46-b1d2-46fb-b1dd-747bd070b1fa).
---
canvas_objects
Purpose: Stores drawable objects placed on canvases (rectangles, etc.).
Columns:
    id (uuid) — primary key, default: gen_random_uuid()
    type (text) — default: 'rectangle'
    x (double precision) — check: x >= 0 AND x <= 3000
    y (double precision) — check: y >= 0 AND y <= 3000
    width (double precision) — check: width >= 20
    height (double precision) — check: height >= 20
    color (text)
    created_by (uuid) — nullable, foreign key -> auth.users.id
    created_at (timestamptz) — default: now()
    updated_at (timestamptz) — default: now()
    canvas_id (uuid) — references canvases.id (implied relation)
Rows: 51
RLS: enabled
Notes:
Constrains enforce objects stay within canvas bounds and minimum size.
Indexing on canvas_id is recommended for queries and RLS performance if not present.
Enable Supabase Realtime replication for this table so clients can subscribe to
`postgres_changes` on `canvas_id`.
---
canvas_members
Purpose: Membership roles for users on canvases.
Columns:
    canvas_id (uuid) — part of primary key, references canvases.id (implied)
    user_id (uuid) — part of primary key, references auth.users.id (implied)
    role (text) — default: 'member'
Rows: 2
RLS: enabled
Notes:
Composite primary key (canvas_id, user_id) enforces unique membership.
Useful for implementing access control via RLS on canvas_objects and canvases.
---
canvas_presence
Purpose: Tracks user presence/last seen per canvas (for realtime features).
Columns:
    canvas_id (uuid) — part of primary key, references canvases.id (implied)
    user_id (uuid) — part of primary key, references auth.users.id (implied)
    last_seen (timestamptz) — default: now()
Rows: 0
RLS: enabled
Notes:
Small table intended for presence; consider TTL cleanup jobs for stale rows.
---
