-- Three evolutions of the schema (the versioned way, without touching V1):
--   1) flexible metric dictionary + per-session metric values
--   2) AI-usage log (monitor OUR free-tier limits & failover)
--   3) a per-user plan column (enforce the USER's free-trial quota)

-- ── Per-user plan (free-trial gating) ───────────────────────────────────────
alter table users add column plan varchar(20) not null default 'FREE';  -- FREE | PRO
-- (Usage itself is derived by counting a user's interview_sessions — no counter column needed.)

-- ── Drop the rigid, single-purpose metric columns ───────────────────────────
alter table interview_sessions drop column if exists nerves_before;
alter table interview_sessions drop column if exists nerves_after;
alter table interview_sessions drop column if exists sub_scores;

-- ── Metric dictionary: define each metric once, extend without schema changes ─
create table metric (
    key         varchar(40) primary key,
    label       varchar(80) not null,
    category    varchar(20) not null,   -- SELF_REPORT | CONTENT | DELIVERY
    direction   varchar(15) not null,   -- HIGHER_BETTER | LOWER_BETTER | RANGE
    description text
);

-- ── Metric values captured per interview session ────────────────────────────
create table session_metric (
    id          uuid          primary key,
    session_id  uuid          not null references interview_sessions (id) on delete cascade,
    metric_key  varchar(40)   not null references metric (key),
    phase       varchar(15)   not null,   -- BEFORE | AFTER | OVERALL
    value       numeric(6, 2) not null,
    created_at  timestamptz   not null default now()
);
create index idx_session_metric_session on session_metric (session_id);
create index idx_session_metric_key on session_metric (metric_key);

-- ── AI usage log: one row per AI call (monitor free-tier limits & failover) ──
create table ai_usage (
    id          uuid        primary key,
    provider    varchar(20) not null,   -- GEMINI | GROQ | STATIC
    operation   varchar(30) not null,   -- GENERATE_QUESTIONS | SCORE_ANSWER
    user_id     uuid        references users (id) on delete set null,
    session_id  uuid        references interview_sessions (id) on delete set null,
    success     boolean     not null,
    fell_back   boolean     not null default false,
    latency_ms  int,
    error       text,
    created_at  timestamptz not null default now()
);
create index idx_ai_usage_provider_time on ai_usage (provider, created_at);

-- ── Seed the metric dictionary (feelings + content + delivery) ──────────────
insert into metric (key, label, category, direction, description) values
    ('nervousness',    'Nervousness',     'SELF_REPORT', 'LOWER_BETTER',  'How nervous the student felt (self-reported 1-10).'),
    ('confidence',     'Confidence',      'SELF_REPORT', 'HIGHER_BETTER', 'How confident the student felt (self-reported 1-10).'),
    ('communication',  'Communication',   'CONTENT',     'HIGHER_BETTER', 'Clarity and structure of the answers (0-100).'),
    ('technical_depth','Technical depth', 'CONTENT',     'HIGHER_BETTER', 'Depth and correctness of technical content (0-100).'),
    ('relevance',      'Relevance',       'CONTENT',     'HIGHER_BETTER', 'How well answers addressed the questions (0-100).'),
    ('clarity',        'Clarity',         'CONTENT',     'HIGHER_BETTER', 'How clear and concise the answers were (0-100).'),
    ('pace_wpm',       'Speaking pace',   'DELIVERY',    'RANGE',         'Words per minute while answering (ideal ~110-150).'),
    ('filler_words',   'Filler words',    'DELIVERY',    'LOWER_BETTER',  'Count of filler words (um, uh, like).'),
    ('long_pauses',    'Long pauses',     'DELIVERY',    'LOWER_BETTER',  'Number of long hesitation pauses.'),
    ('eye_contact',    'Eye contact',     'DELIVERY',    'HIGHER_BETTER', 'Percent of time looking at the camera (video only).');
