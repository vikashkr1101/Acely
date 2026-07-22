package com.preppal.common;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.servlet.HandlerInterceptor;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Per-IP hourly limit for anonymous, abuse-prone endpoints (signup / login / password-reset /
 * resend-code) — stops a single source from flooding them. In-memory fixed hourly window; fine for
 * one instance. Instantiated (not a @Component) so each endpoint group can carry its own limit.
 */
public class IpRateLimitInterceptor implements HandlerInterceptor {

    private final int maxPerHour;
    private final String message;
    private final Map<String, Counter> counters = new ConcurrentHashMap<>();

    public IpRateLimitInterceptor(int maxPerHour, String message) {
        this.maxPerHour = maxPerHour;
        this.message = message;
    }

    private static final class Counter {
        long window;
        int count;
    }

    @Override
    public boolean preHandle(HttpServletRequest req, HttpServletResponse res, Object handler) throws Exception {
        long window = Instant.now().getEpochSecond() / 3600;
        Counter c = counters.computeIfAbsent(clientIp(req), k -> new Counter());
        synchronized (c) {
            if (c.window != window) { c.window = window; c.count = 0; }
            c.count++;
            if (c.count > maxPerHour) {
                res.setStatus(429); // Too Many Requests
                res.setContentType("application/json");
                res.getWriter().write("{\"message\":\"" + message + "\"}");
                return false;
            }
        }
        return true;
    }

    private static String clientIp(HttpServletRequest req) {
        String xff = req.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) return xff.split(",")[0].trim();
        return req.getRemoteAddr();
    }
}
