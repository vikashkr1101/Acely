package com.preppal.auth;

import org.springframework.data.jpa.repository.JpaRepository;

/** Pending (unverified) signups, keyed by email. findById(email) / deleteById(email). */
public interface PendingSignupRepository extends JpaRepository<PendingSignup, String> {
}
