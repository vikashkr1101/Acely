package com.preppal.common;

import com.preppal.user.User;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Lightweight per-user rate limit on the AI-heavy endpoints, so no single account can burn the
 * free-tier LLM quota. In-memory fixed-window counter — fine for a single free-tier instance.
 */
@Component
public class RateLimitInterceptor implements HandlerInterceptor {

    @Value("${preppal.ratelimit.per-minute:40}")
    private int maxPerMinute;

    private final Map<UUID, Counter> counters = new ConcurrentHashMap<>();

    private static final class Counter {
        long minute;
        int count;
    }

    @Override
    public boolean preHandle(HttpServletRequest req, HttpServletResponse res, Object handler) throws Exception {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof User user)) return true; // unauthenticated → let security handle it

        long minute = Instant.now().getEpochSecond() / 60;
        Counter c = counters.computeIfAbsent(user.getId(), k -> new Counter());
        synchronized (c) {
            if (c.minute != minute) { c.minute = minute; c.count = 0; }
            c.count++;
            if (c.count > maxPerMinute) {
                res.setStatus(429); // Too Many Requests
                res.setContentType("application/json");
                res.getWriter().write("{\"message\":\"You're going a bit fast — take a breather and try again in a minute.\"}");
                return false;
            }
        }
        return true;
    }
}
