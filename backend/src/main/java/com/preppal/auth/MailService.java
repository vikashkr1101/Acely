package com.preppal.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;

/**
 * Sends transactional email (signup verification codes + password resets) via Brevo's HTTP API
 * over HTTPS. We use the API — not SMTP — because many hosts (incl. Render's free tier) block
 * outbound SMTP ports, which makes SMTP sends hang and silently fail. Sends are {@code @Async}
 * so the signup/login request never blocks on email. When disabled or unconfigured (local dev),
 * the code/link is logged instead of sent, so the flow stays testable end-to-end.
 */
@Service
public class MailService {

    private static final Logger log = LoggerFactory.getLogger(MailService.class);
    private static final String BREVO_URL = "https://api.brevo.com/v3/smtp/email";

    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    private final ObjectMapper json = new ObjectMapper();

    private final boolean enabled;
    private final String apiKey;
    private final String fromName;
    private final String fromEmail;
    private final String appBaseUrl;
    private final int resetTtlMinutes;
    private final int verifyTtlMinutes;

    public MailService(@Value("${preppal.mail.enabled:false}") boolean enabled,
                       @Value("${preppal.mail.brevo-api-key:}") String apiKey,
                       @Value("${preppal.mail.from:Acely <no-reply@acely.in>}") String from,
                       @Value("${preppal.app.base-url:http://localhost:3000}") String appBaseUrl,
                       @Value("${preppal.mail.reset-ttl-minutes:45}") int resetTtlMinutes,
                       @Value("${preppal.mail.verify-ttl-minutes:10}") int verifyTtlMinutes) {
        this.enabled = enabled;
        this.apiKey = apiKey;
        this.appBaseUrl = appBaseUrl;
        this.resetTtlMinutes = resetTtlMinutes;
        this.verifyTtlMinutes = verifyTtlMinutes;
        // Parse "Name <email>" (or a bare "email") from MAIL_FROM.
        String name = "Acely";
        String email = from == null ? "" : from.trim();
        int lt = email.indexOf('<');
        if (lt >= 0) {
            int gt = email.indexOf('>', lt);
            name = email.substring(0, lt).trim();
            email = email.substring(lt + 1, gt < 0 ? email.length() : gt).trim();
            if (name.isEmpty()) name = "Acely";
        }
        this.fromName = name;
        this.fromEmail = email;
    }

    @Async
    public void sendVerificationCode(String toEmail, String code) {
        send(toEmail,
                "Your Acely verification code: " + code,
                ("Hi,\n\nWelcome to Acely! Enter this code to verify your email and start practising — "
                        + "it expires in %d minutes:\n\n    %s\n\n"
                        + "If you didn't create an Acely account, you can safely ignore this email.\n\n— Acely")
                        .formatted(verifyTtlMinutes, code),
                "verification code for " + toEmail + " → " + code);
    }

    @Async
    public void sendPasswordReset(String toEmail, String rawToken) {
        String link = appBaseUrl + "/reset-password?token=" + rawToken;
        send(toEmail,
                "Reset your Acely password",
                ("Hi,\n\nWe got a request to reset your Acely password. Click the link below to set a new one — "
                        + "it expires in %d minutes and can be used once:\n\n%s\n\n"
                        + "If you didn't ask for this, you can safely ignore this email — your password won't change.\n\n— Acely")
                        .formatted(resetTtlMinutes, link),
                "password-reset link for " + toEmail + " → " + link);
    }

    private void send(String toEmail, String subject, String text, String devLog) {
        if (!enabled || apiKey.isBlank()) {
            // Dev / unconfigured: surface the code or link in the server log instead of failing.
            log.warn("[mail disabled] {}", devLog);
            return;
        }
        try {
            String body = json.writeValueAsString(Map.of(
                    "sender", Map.of("name", fromName, "email", fromEmail),
                    "to", List.of(Map.of("email", toEmail)),
                    "subject", subject,
                    "textContent", text));
            HttpRequest req = HttpRequest.newBuilder(URI.create(BREVO_URL))
                    .timeout(Duration.ofSeconds(15))
                    .header("api-key", apiKey)
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();
            HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString());
            if (res.statusCode() / 100 != 2) {
                log.error("Brevo API returned {} sending to {}: {}", res.statusCode(), toEmail, res.body());
            }
        } catch (Exception e) {
            // Never surface email errors to the caller; just log so the flow keeps working.
            log.error("Failed to send email to {}", toEmail, e);
        }
    }
}
