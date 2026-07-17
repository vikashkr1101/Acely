-- V4: Interview-engine foundation (Phase 1) — fixed interview types + per-type rubrics.
-- Strictly ADDITIVE and NULLABLE: every existing session/question stays valid;
-- the new columns are populated only by the new engine (Phase 1.3+). No data is
-- touched, so the app keeps working the moment this migration lands.

-- ── Per-session engine fields ───────────────────────────────────────────────
alter table interview_sessions add column interview_type   varchar(20);  -- HR | TECHNICAL | BEHAVIORAL | PROJECT
alter table interview_sessions add column experience_level varchar(20);  -- FRESHER | ZERO_ONE | ONE_THREE | THREE_PLUS
alter table interview_sessions add column entry_mode        varchar(20);  -- PASTE_JD | GENERATE_JD | PROJECT | TOPIC
alter table interview_sessions add column prompt_version    varchar(20);  -- which prompt set produced/scored this session

-- ── Per-question fields: typed + raw rubric result + retry linkage ──────────
alter table questions add column question_type varchar(20);              -- Phase 1: same as the session's interview_type
alter table questions add column rubric_json   text;                     -- raw evaluator output: dimensions + evidence + overall
alter table questions add column retry_of       uuid references questions (id) on delete set null;  -- original question, if this is a retry
create index idx_questions_retry_of on questions (retry_of);

-- ── Rubric dictionary: one row per interview type, drives evaluation ────────
--    dimensions / axis_map are JSON (stored as text; parsed by the app).
--    axis_map projects the type's dimensions onto the canonical 4 report axes
--    (communication / technical_depth / relevance / clarity) so the report
--    bars are always populated regardless of interview type.
create table rubric (
    type                varchar(20) primary key,   -- HR | TECHNICAL | BEHAVIORAL | PROJECT
    label               varchar(60) not null,
    dimensions          text        not null,       -- JSON: [{"key","label","description"}]
    axis_map            text        not null,       -- JSON: canonical_axis -> [dimension keys to average]
    top_answer_guidance text        not null,       -- what a strong answer (for the level) contains
    band_anchors        text        not null,       -- anchored scoring bands (shared wording)
    prompt_version      varchar(20) not null default 'v1'
);

-- ── Seed the 4 fixed-type rubrics ────────────────────────────────────────────
-- Shared band anchors are repeated per row (kept self-contained for the prompt).
insert into rubric (type, label, dimensions, axis_map, top_answer_guidance, band_anchors) values
(
  'TECHNICAL', 'Technical',
  '[{"key":"correctness","label":"Correctness","description":"Are the facts and logic actually correct?"},{"key":"depth","label":"Depth","description":"Do they go beyond the surface to the why and the internals?"},{"key":"tradeoffs","label":"Trade-offs","description":"Do they weigh alternatives or trade-offs?"},{"key":"communication","label":"Communication","description":"Is the explanation clear and well structured?"}]',
  '{"communication":["communication"],"technical_depth":["correctness","depth","tradeoffs"],"relevance":["correctness"],"clarity":["communication"]}',
  'A strong answer is factually correct, explains the underlying why (not just the what), weighs at least one trade-off or alternative, and is communicated clearly with a concrete example.',
  'Score each dimension 0-100 against these bands: 0-40 missing or incorrect; 41-60 partly right but vague or incomplete; 61-75 solid but shallow or generic; 76-90 strong, specific and well structured; 91-100 exceptional and complete. Judge against what is fair for the candidate stated experience level.'
),
(
  'BEHAVIORAL', 'Behavioral',
  '[{"key":"structure","label":"Structure (STAR)","description":"Does it follow Situation, Task, Action, Result?"},{"key":"specificity","label":"Specificity","description":"Concrete real details versus vague generalities?"},{"key":"impact","label":"Impact","description":"Is there a clear, ideally quantified outcome?"},{"key":"communication","label":"Communication","description":"Clear, concise, and first-person (I, not we)?"}]',
  '{"communication":["communication"],"technical_depth":["impact"],"relevance":["structure"],"clarity":["communication","structure"]}',
  'A strong answer follows STAR, uses a real specific example (not hypothetical), centres on what THEY personally did (I, not we), and ends with a concrete, ideally quantified result.',
  'Score each dimension 0-100 against these bands: 0-40 missing or off-topic; 41-60 vague or generic, no real example; 61-75 a real example but loosely structured or no clear result; 76-90 clear STAR with a specific result; 91-100 exceptional, quantified and reflective. Judge against what is fair for the candidate stated experience level.'
),
(
  'HR', 'HR & Motivation',
  '[{"key":"relevance","label":"Relevance","description":"Does it actually answer the question asked?"},{"key":"self_awareness","label":"Self-awareness","description":"Honest, reflective and self-aware?"},{"key":"motivation","label":"Motivation","description":"Is genuine interest or fit conveyed with a real reason?"},{"key":"communication","label":"Communication","description":"Clear, confident and concise without rambling?"}]',
  '{"communication":["communication"],"technical_depth":["self_awareness"],"relevance":["relevance"],"clarity":["communication"]}',
  'A strong answer directly addresses the question, is honest and self-aware, conveys genuine motivation or fit with a specific reason, and is delivered clearly and concisely without rambling.',
  'Score each dimension 0-100 against these bands: 0-40 does not answer or is evasive; 41-60 generic and rehearsed; 61-75 relevant but shallow; 76-90 specific, honest and confident; 91-100 exceptional, memorable and well reasoned. Judge against what is fair for the candidate stated experience level.'
),
(
  'PROJECT', 'Project',
  '[{"key":"ownership","label":"Ownership","description":"Is their specific role and personal contribution clear?"},{"key":"depth","label":"Technical depth","description":"Do they understand the technical choices and why they made them?"},{"key":"challenges","label":"Challenges","description":"Do they describe a real problem and how they solved it?"},{"key":"communication","label":"Communication","description":"Clear, structured explanation of the project?"}]',
  '{"communication":["communication"],"technical_depth":["ownership","depth"],"relevance":["challenges"],"clarity":["communication"]}',
  'A strong answer makes THEIR specific role clear, explains the key technical decisions and why, describes a real challenge and how they solved it, and quantifies the outcome or impact where possible.',
  'Score each dimension 0-100 against these bands: 0-40 vague, cannot explain their role; 41-60 describes the project but not their part or the why; 61-75 clear role but shallow on decisions or challenges; 76-90 clear ownership, decisions and a real challenge; 91-100 exceptional, quantified impact and deep understanding. Judge against what is fair for the candidate stated experience level.'
);
