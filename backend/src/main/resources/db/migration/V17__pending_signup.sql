-- ── Accounts are created ONLY after email verification ─────────────────────────────────────────
-- Before, a user row was created at signup (before the code was confirmed). An abandoned signup then
-- blocked that email forever ("already registered") even though it was never verified — and the person
-- couldn't recover it because they never set a password they remember. Now `users` holds VERIFIED
-- accounts only. An unconfirmed signup lives here (keyed by email) until the code is entered, then it
-- graduates into `users`. Re-signing up with the same unverified email just refreshes this row, so the
-- latest attempt's password wins.

create table pending_signup (
    email         varchar(255) primary key,
    name          varchar(255) not null,
    password_hash varchar(255) not null,
    code_hash     varchar(64)  not null,
    expires_at    timestamptz  not null,
    attempts      integer      not null default 0,
    created_at    timestamptz  not null default now()
);

-- One-time cleanup: remove accounts left unverified by the old flow. Under the new model they can't
-- finish verifying and can't log in, so they're dead rows. Every dependent row cascades away cleanly
-- (interview_sessions -> questions/session_metric/answer_attempt, feedback, password_reset_tokens,
-- email_verifications); ai_usage.user_id simply nulls out.
delete from users where email_verified = false;

-- The per-user verification table is superseded by pending_signup.
drop table if exists email_verifications;
