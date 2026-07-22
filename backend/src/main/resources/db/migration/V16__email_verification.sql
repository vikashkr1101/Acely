-- Email verification: a one-time 6-digit code (hashed) confirms the user owns the address at signup.
-- Only the SHA-256 hash of the code is stored, with a short TTL and a wrong-attempt counter.
-- Existing accounts are grandfathered as verified so the new gate never locks anyone out — only
-- NEW signups from here on must verify.
ALTER TABLE users ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE users SET email_verified = TRUE;

CREATE TABLE email_verifications (
    id         UUID PRIMARY KEY,
    user_id    UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    code_hash  VARCHAR(64) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    attempts   INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ev_user ON email_verifications(user_id);
