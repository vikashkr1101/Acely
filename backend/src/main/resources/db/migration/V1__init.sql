-- PrepPal initial schema

create table users (
    id            uuid primary key,
    name          varchar(120) not null,
    email         varchar(255) not null unique,
    password_hash varchar(255) not null,
    created_at    timestamptz  not null default now()
);

create table interview_sessions (
    id            uuid primary key,
    user_id       uuid         not null references users (id) on delete cascade,
    role          varchar(160) not null,
    jd            text,
    mode          varchar(20)  not null,     -- TEXT | VOICE | VIDEO
    status        varchar(20)  not null,     -- IN_PROGRESS | COMPLETED
    overall_score int,
    sub_scores    text,                       -- JSON string of skill -> score
    summary       text,
    nerves_before int,
    nerves_after  int,
    created_at    timestamptz  not null default now(),
    completed_at  timestamptz
);

create table questions (
    id                uuid primary key,
    session_id        uuid    not null references interview_sessions (id) on delete cascade,
    ordinal           int     not null,
    question_text     text    not null,
    answer_transcript text,
    feedback          text,
    model_answer      text,
    score             int
);

create index idx_sessions_user on interview_sessions (user_id);
create index idx_questions_session on questions (session_id);
