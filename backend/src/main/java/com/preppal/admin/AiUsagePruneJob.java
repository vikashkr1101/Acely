package com.preppal.admin;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Nightly retention prune of the fastest-growing table (ai_usage), so it never sprawls. */
@Component
@RequiredArgsConstructor
public class AiUsagePruneJob {

    private static final Logger log = LoggerFactory.getLogger(AiUsagePruneJob.class);
    private final AdminService admin;

    /** 03:30 every day (server time). */
    @Scheduled(cron = "0 30 3 * * *")
    public void prune() {
        int deleted = admin.pruneAiUsage();
        if (deleted > 0) log.info("ai_usage retention prune removed {} rows", deleted);
    }
}
