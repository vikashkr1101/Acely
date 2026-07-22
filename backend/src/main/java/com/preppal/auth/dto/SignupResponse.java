package com.preppal.auth.dto;

/**
 * Signup no longer issues a JWT — the account starts unverified. The frontend uses this to route
 * to the verification screen, where a valid code exchanges for a real {@link AuthResponse}.
 */
public record SignupResponse(String email, boolean verificationRequired) {
}
