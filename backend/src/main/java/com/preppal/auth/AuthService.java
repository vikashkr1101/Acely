package com.preppal.auth;

import com.preppal.auth.dto.AuthResponse;
import com.preppal.auth.dto.LoginRequest;
import com.preppal.auth.dto.SignupRequest;
import com.preppal.auth.dto.SignupResponse;
import com.preppal.auth.dto.UpdateProfileRequest;
import com.preppal.auth.dto.UserDto;
import com.preppal.security.JwtService;
import com.preppal.user.User;
import com.preppal.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.HexFormat;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final PasswordResetTokenRepository resetTokens;
    private final PendingSignupRepository pendingSignups;
    private final MailService mailService;

    @Value("${preppal.mail.reset-ttl-minutes:45}")
    private int resetTtlMinutes;

    @Value("${preppal.mail.verify-ttl-minutes:10}")
    private int verifyTtlMinutes;

    private static final int MAX_VERIFY_ATTEMPTS = 5;

    @Transactional
    public SignupResponse signup(SignupRequest req) {
        String email = req.email().toLowerCase().trim();
        if (users.existsByEmail(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "That email is already registered — try logging in.");
        }
        // No user row yet: hold the signup in pending_signup until the code is confirmed. Re-signing up
        // with the same unverified email refreshes this row, so the latest attempt's password wins.
        PendingSignup ps = pendingSignups.findById(email).orElseGet(PendingSignup::new);
        ps.setEmail(email);
        ps.setName(req.name().trim());
        ps.setPasswordHash(passwordEncoder.encode(req.password()));
        issuePendingCode(ps);
        return new SignupResponse(email, true);
    }

    @Transactional
    public AuthResponse login(LoginRequest req) {
        String email = req.email().toLowerCase().trim();
        User user = users.findByEmail(email).orElse(null);
        if (user == null) {
            // No verified account. Maybe they started signing up but never confirmed the code — if the
            // password matches the pending signup, resend a fresh code and route them to verify (403)
            // rather than a dead "invalid credentials".
            PendingSignup ps = pendingSignups.findById(email).orElse(null);
            if (ps != null && passwordEncoder.matches(req.password(), ps.getPasswordHash())) {
                issuePendingCode(ps);
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "Please verify your email — we just sent you a fresh code.");
            }
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password.");
        }
        if (!passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password.");
        }
        return new AuthResponse(jwtService.generate(user), UserDto.from(user));
    }

    /** Exchange a valid 6-digit code for a real account + session. Wrong codes count against a small cap. */
    @Transactional
    public AuthResponse verifyEmail(String rawEmail, String rawCode) {
        String email = rawEmail.toLowerCase().trim();
        String code = rawCode.trim();
        if (users.existsByEmail(email)) {
            // Already a real, verified account — never hand out a session here without credentials.
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This email is already verified — please log in.");
        }
        PendingSignup ps = pendingSignups.findById(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "That code is invalid or expired — tap resend for a new one."));
        if (ps.getExpiresAt().isBefore(Instant.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "That code has expired — tap resend for a new one.");
        }
        if (ps.getAttempts() >= MAX_VERIFY_ATTEMPTS) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Too many wrong attempts — tap resend for a new code.");
        }
        if (!ps.getCodeHash().equals(sha256(code))) {
            ps.setAttempts(ps.getAttempts() + 1);
            pendingSignups.save(ps);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "That code isn't right — check it and try again.");
        }
        // Success → the account becomes real and verified; the pending row is consumed.
        User user = User.builder()
                .name(ps.getName())
                .email(email)
                .passwordHash(ps.getPasswordHash())
                .emailVerified(true)
                .build();
        users.save(user);
        pendingSignups.deleteById(email);
        return new AuthResponse(jwtService.generate(user), UserDto.from(user));
    }

    /** Resend a fresh code to a pending signup. Silent about whether a pending signup exists. */
    @Transactional
    public void resendCode(String rawEmail) {
        String email = rawEmail.toLowerCase().trim();
        pendingSignups.findById(email).ifPresent(this::issuePendingCode);
    }

    /** Update the signed-in user's profile — name, benchmark track, and stack. */
    @Transactional
    public UserDto updateProfile(User user, UpdateProfileRequest req) {
        if (req.name() != null && !req.name().isBlank()) user.setName(req.name().trim());
        if (req.primaryTrack() != null) user.setPrimaryTrack(req.primaryTrack());
        if (req.primaryStack() != null) {
            user.setPrimaryStack(req.primaryStack().isBlank() ? null : req.primaryStack().trim());
        }
        users.save(user);
        return UserDto.from(user);
    }

    // ── Password reset ───────────────────────────────────────────────────────
    /**
     * Start a reset: if the email exists, mint a single-use token and email the link.
     * Always succeeds silently — we never reveal whether an email is registered.
     */
    @Transactional
    public void forgotPassword(String rawEmail) {
        String email = rawEmail.toLowerCase().trim();
        users.findByEmail(email).ifPresent(user -> {
            resetTokens.deleteByUserId(user.getId()); // one live link at a time
            String raw = generateToken();
            PasswordResetToken token = new PasswordResetToken();
            token.setUserId(user.getId());
            token.setTokenHash(sha256(raw));
            token.setExpiresAt(Instant.now().plus(resetTtlMinutes, ChronoUnit.MINUTES));
            resetTokens.save(token);
            mailService.sendPasswordReset(user.getEmail(), raw);
        });
    }

    /** Complete a reset with a valid token, set the new password, and sign the user in. */
    @Transactional
    public AuthResponse resetPassword(String rawToken, String newPassword) {
        PasswordResetToken token = resetTokens.findByTokenHashAndUsedFalse(sha256(rawToken))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "This reset link is invalid or already used — please request a new one."));
        if (token.getExpiresAt().isBefore(Instant.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "This reset link has expired — please request a new one.");
        }
        User user = users.findById(token.getUserId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Account not found."));
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        users.save(user);
        token.setUsed(true);
        resetTokens.save(token);
        return new AuthResponse(jwtService.generate(user), UserDto.from(user));
    }

    /** Stamp a fresh code (+ TTL, reset attempts) on a pending signup, persist it, and email the code. */
    private void issuePendingCode(PendingSignup ps) {
        String code = generateCode();
        ps.setCodeHash(sha256(code));
        ps.setExpiresAt(Instant.now().plus(verifyTtlMinutes, ChronoUnit.MINUTES));
        ps.setAttempts(0);
        pendingSignups.save(ps);
        mailService.sendVerificationCode(ps.getEmail(), code);
    }

    private static String generateCode() {
        return String.format("%06d", RANDOM.nextInt(1_000_000));
    }

    private static String generateToken() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static String sha256(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }
}
