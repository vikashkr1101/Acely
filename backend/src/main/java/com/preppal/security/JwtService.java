package com.preppal.security;

import com.preppal.user.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Arrays;
import java.util.Date;
import java.util.UUID;

@Service
public class JwtService {

    private static final Logger log = LoggerFactory.getLogger(JwtService.class);

    /** The insecure fallback baked into application.yml — safe for local dev, never for a real deployment. */
    private static final String DEV_DEFAULT_SECRET =
            "change-me-in-prod-this-is-a-long-dev-only-secret-key-0123456789";

    private final SecretKey key;
    private final long expirationMs;

    public JwtService(
            @Value("${preppal.jwt.secret}") String secret,
            @Value("${preppal.jwt.expiration-ms}") long expirationMs,
            Environment env) {
        guardSecret(secret, env);
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMs = expirationMs;
    }

    /**
     * Refuse to start with the shared dev secret under a prod profile — a forgotten JWT_SECRET would
     * otherwise let anyone forge tokens. Outside prod we only warn loudly, so local dev stays frictionless.
     */
    private static void guardSecret(String secret, Environment env) {
        if (!DEV_DEFAULT_SECRET.equals(secret)) return;
        boolean prod = Arrays.asList(env.getActiveProfiles()).contains("prod");
        if (prod) {
            throw new IllegalStateException(
                    "Refusing to start: preppal.jwt.secret is the dev default. Set a strong JWT_SECRET "
                    + "(32+ random chars) in the production environment.");
        }
        log.warn("\n============================================================\n"
                + " ⚠  Using the DEV DEFAULT JWT secret — fine for local dev, NEVER for deploy.\n"
                + "    Set JWT_SECRET (and SPRING_PROFILES_ACTIVE=prod) before going live.\n"
                + "============================================================");
    }

    public String generate(User user) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(user.getId().toString())
                .claim("email", user.getEmail())
                .claim("name", user.getName())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusMillis(expirationMs)))
                .signWith(key)
                .compact();
    }

    /** Parses and verifies the token, returning the user id (subject). Throws on invalid/expired tokens. */
    public UUID parseUserId(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
        return UUID.fromString(claims.getSubject());
    }
}
