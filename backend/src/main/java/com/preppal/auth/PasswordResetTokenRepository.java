package com.preppal.auth;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, UUID> {

    Optional<PasswordResetToken> findByTokenHashAndUsedFalse(String tokenHash);

    /** Invalidate any earlier outstanding tokens when a new reset is requested. */
    void deleteByUserId(UUID userId);
}
