package com.preppal.auth;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/**
 * A signup that hasn't confirmed its email yet. Keyed by email (no user row exists until the code is
 * verified). Holds just enough to create the real account on success: name, password hash, and the
 * hashed one-time code with its TTL and wrong-attempt counter.
 */
@Entity
@Table(name = "pending_signup")
@Getter
@Setter
@NoArgsConstructor
public class PendingSignup {

    @Id
    private String email;

    @Column(nullable = false)
    private String name;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "code_hash", nullable = false)
    private String codeHash;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(nullable = false)
    private int attempts;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
