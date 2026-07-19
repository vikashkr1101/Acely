package com.preppal.auth;

import com.preppal.auth.dto.AuthResponse;
import com.preppal.auth.dto.LoginRequest;
import com.preppal.auth.dto.SignupRequest;
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
    private final MailService mailService;

    @Value("${preppal.mail.reset-ttl-minutes:45}")
    private int resetTtlMinutes;

    @Transactional
    public AuthResponse signup(SignupRequest req) {
        String email = req.email().toLowerCase().trim();
        if (users.existsByEmail(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "That email is already registered — try logging in.");
        }
        User user = User.builder()
                .name(req.name().trim())
                .email(email)
                .passwordHash(passwordEncoder.encode(req.password()))
                .build();
        users.save(user);
        return new AuthResponse(jwtService.generate(user), UserDto.from(user));
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest req) {
        String email = req.email().toLowerCase().trim();
        User user = users.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password."));
        if (!passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password.");
        }
        return new AuthResponse(jwtService.generate(user), UserDto.from(user));
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
