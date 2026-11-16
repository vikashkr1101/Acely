-- ── Demo visit analytics ─────────────────────────────────────────────────────────────────────────
-- One row per demo visit (a browser tab session on acely.in/demo), upserted by fire-and-forget pings
-- from the static demo. Anonymous by design: no IP, no user agent, no account link. visitor_id is a
-- random id kept in the visitor's browser, so unique visitors can be counted without identifying anyone.

create table demo_visits (
    id             uuid        primary key,          -- client-generated per tab session
    visitor_id     uuid        not null,             -- client-generated per browser (unique counts)
    source         varchar(60),                      -- ?ref= / utm_source, else referring host; null = direct
    mobile         boolean     not null default false,
    max_step       integer     not null default 0,   -- furthest guided-tour step reached (0 = none)
    completed      boolean     not null default false,
    skipped        boolean     not null default false,
    opened_bts     boolean     not null default false,  -- opened "Behind the scenes"
    hit_gate       boolean     not null default false,  -- tried a real action → saw the sign-up prompt
    clicked_signup boolean     not null default false,
    clicked_login  boolean     not null default false,
    created_at     timestamptz not null default now(),
    last_seen_at   timestamptz not null default now()
);

create index idx_demo_visits_created on demo_visits (created_at desc);
