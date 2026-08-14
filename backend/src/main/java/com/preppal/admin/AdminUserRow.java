package com.preppal.admin;

import java.time.Instant;

/** One row in the admin Users list — who signed up, whether they verified, and their activity. */
public record AdminUserRow(
        String name,
        String email,
        boolean verified,     // confirmed their email via the signup code
        Instant joined,       // account created_at
        long mocks,           // total sessions started
        Instant lastActive,   // most recent session; null if they never started one
        Integer readiness) {  // avg measurement score; null if no completed measurement yet
}
