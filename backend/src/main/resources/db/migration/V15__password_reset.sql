-- Password-reset tokens. We store only the SHA-256 hash of the token (never the raw value),
-- give it a short TTL, and mark it used so a link works exactly once.
CREATE TABLE password_reset_tokens (
    id         UUID PRIMARY KEY,
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_prt_user ON password_reset_tokens(user_id);
