-- User feedback: post-interview ratings + general product feedback.
create table feedback (
    id         uuid        primary key,
    user_id    uuid        not null references users (id) on delete cascade,
    session_id uuid        references interview_sessions (id) on delete set null,
    rating     int,                        -- 1..5 (nullable — a message alone is fine)
    category   varchar(20) not null,       -- INTERVIEW | IDEA | BUG | PRAISE | OTHER
    message    text,
    created_at timestamptz not null default now()
);
create index idx_feedback_created on feedback (created_at desc);
