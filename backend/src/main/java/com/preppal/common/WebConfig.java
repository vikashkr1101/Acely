package com.preppal.common;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/** Rate limits: per-user on the AI-heavy interview endpoints, per-IP on password-reset requests. */
@Configuration
@RequiredArgsConstructor
public class WebConfig implements WebMvcConfigurer {

    private final RateLimitInterceptor rateLimit;
    private final IpRateLimitInterceptor ipRateLimit;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(rateLimit).addPathPatterns("/api/interviews/**");
        registry.addInterceptor(ipRateLimit).addPathPatterns("/api/auth/forgot-password", "/api/auth/resend-code");
    }
}
