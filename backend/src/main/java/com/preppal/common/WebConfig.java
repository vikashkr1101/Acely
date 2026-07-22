package com.preppal.common;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/** Rate limits: per-user on the AI-heavy interview endpoints, per-IP on abuse-prone auth endpoints. */
@Configuration
@RequiredArgsConstructor
public class WebConfig implements WebMvcConfigurer {

    private final RateLimitInterceptor rateLimit;

    @Value("${preppal.ratelimit.forgot-per-hour:6}")
    private int forgotPerHour;

    @Value("${preppal.ratelimit.auth-per-hour:30}")
    private int authPerHour;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(rateLimit).addPathPatterns("/api/interviews/**");

        // Email-sending endpoints: strict, since each hit can fire an email (protects the Brevo quota).
        registry.addInterceptor(new IpRateLimitInterceptor(forgotPerHour,
                        "Too many email requests — please try again later."))
                .addPathPatterns("/api/auth/forgot-password", "/api/auth/resend-code");

        // Signup / login: lenient enough for shared (campus / mobile-carrier) IPs, strict enough to
        // stop a single source flooding signups (which would drain the email quota) or brute-forcing.
        registry.addInterceptor(new IpRateLimitInterceptor(authPerHour,
                        "Too many attempts from your network — please try again in a bit."))
                .addPathPatterns("/api/auth/signup", "/api/auth/login");
    }
}
