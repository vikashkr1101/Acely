-- V6: retry attempts + scoring mode. Additive; existing sessions/questions unaffected.

-- Practice = score each answer as it's submitted; Interview = answer all, score at the end.
alter table interview_sessions add column scoring_mode varchar(20);  -- PRACTICE | INTERVIEW

-- One row per answer attempt for a question (attempt_no 1 = first, 2+ = retries).
-- Lets us compare first-vs-improved and track the improvement delta.
create table answer_attempt (
    id           uuid        primary key,
    question_id  uuid        not null references questions (id) on delete cascade,
    attempt_no   int         not null,
    transcript   text        not null,
    score        int,
    rubric_json  text,
    feedback     text,
    model_answer text,
    created_at   timestamptz not null default now()
);
create index idx_answer_attempt_question on answer_attempt (question_id);
