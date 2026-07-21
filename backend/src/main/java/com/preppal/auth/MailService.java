package com.preppal.auth;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

/**
 * Sends transactional email (currently just password resets). Works with any free SMTP provider
 * (Brevo / Resend / etc.) via spring.mail.*. When mail is disabled or unconfigured — e.g. local dev —
 * it logs the reset link instead of failing, so the flow is still testable end-to-end.
 */
@Service
public class MailService {

    private static final Logger log = LoggerFactory.getLogger(MailService.class);

    private final ObjectProvider<JavaMailSender> mailSender;
    private final boolean enabled;
    private final String from;
    private final String appBaseUrl;
    private final int ttlMinutes;

    public MailService(ObjectProvider<JavaMailSender> mailSender,
                       @Value("${preppal.mail.enabled:false}") boolean enabled,
                       @Value("${preppal.mail.from:Acely <no-reply@preppal.app>}") String from,
                       @Value("${preppal.app.base-url:http://localhost:3000}") String appBaseUrl,
                       @Value("${preppal.mail.reset-ttl-minutes:45}") int ttlMinutes) {
        this.mailSender = mailSender;
        this.enabled = enabled;
        this.from = from;
        this.appBaseUrl = appBaseUrl;
        this.ttlMinutes = ttlMinutes;
    }

    public void sendPasswordReset(String toEmail, String rawToken) {
        String link = appBaseUrl + "/reset-password?token=" + rawToken;

        if (!enabled) {
            // Dev / unconfigured: don't fail the request — surface the link in the server log.
            log.warn("[mail disabled] Password-reset link for {} → {}", toEmail, link);
            return;
        }
        JavaMailSender sender = mailSender.getIfAvailable();
        if (sender == null) {
            log.error("preppal.mail.enabled=true but no JavaMailSender is configured (set spring.mail.*). "
                    + "Reset link for {} → {}", toEmail, link);
            return;
        }
        SimpleMailMessage msg = new SimpleMailMessage();
        msg.setTo(toEmail);
        msg.setFrom(from);
        msg.setSubject("Reset your Acely password");
        msg.setText("""
                Hi,

                We got a request to reset your Acely password. Click the link below to set a new one —
                it expires in %d minutes and can be used once:

                %s

                If you didn't ask for this, you can safely ignore this email — your password won't change.

                — Acely""".formatted(ttlMinutes, link));
        try {
            sender.send(msg);
        } catch (Exception e) {
            // Never surface SMTP errors to the caller (would leak which emails exist); just log.
            log.error("Failed to send password-reset email to {}", toEmail, e);
        }
    }
}
