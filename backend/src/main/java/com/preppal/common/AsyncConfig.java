package com.preppal.common;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;

/** Enables {@code @Async} so transactional email is sent off the request thread (never blocks signup/login). */
@Configuration
@EnableAsync
public class AsyncConfig {
}
