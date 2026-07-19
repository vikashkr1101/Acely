package com.preppal.interview;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

/**
 * The ONE definition of "readiness" — used everywhere (dashboard, auto-ramp, journey) so the number
 * never disagrees across screens. Readiness comes only from MEASUREMENTS (Readiness Checks + Mock
 * Interviews — single-shot), never from practice (retries would inflate it). It's the average of the
 * most recent {@value #WINDOW} measurements; null until the first one exists. Framed as an
 * assessment, not a pass-probability %.
 */
@Service
@RequiredArgsConstructor
public class ReadinessService {

    private final InterviewSessionRepository sessions;
    private static final int WINDOW = 5;

    @Transactional(readOnly = true)
    public Readiness forUser(UUID userId) {
        // All completed MEASUREMENT sessions (Readiness Checks + Mock Interviews), newest completion first.
        List<InterviewSession> measurements = sessions.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .filter(s -> s.getStatus() == SessionStatus.COMPLETED && s.getOverallScore() != null
                        && (s.isCheckpoint() || s.getScoringMode() == ScoringMode.INTERVIEW))
                .sorted(Comparator.comparing(ReadinessService::completionInstant).reversed())
                .toList();

        // Only fully-scored (non-estimated) runs count — a degraded, offline-scored run isn't a real reading.
        List<Integer> scores = measurements.stream()
                .filter(s -> !s.isHasEstimated())
                .limit(WINDOW)
                .map(InterviewSession::getOverallScore)
                .toList();

        if (scores.isEmpty()) {
            // Distinguish "never measured" (empty state) from "measured, but every run was estimated"
            // (a completed measurement exists but couldn't be trusted → show a re-take nudge, not a glitch).
            boolean estimatedOnly = measurements.stream().anyMatch(InterviewSession::isHasEstimated);
            return new Readiness(null, 0, estimatedOnly);
        }
        int avg = (int) Math.round(scores.stream().mapToInt(Integer::intValue).average().orElse(0));
        return new Readiness(avg, scores.size(), false);
    }

    /** Order measurements by when they were finished (fallback: created) — not creation, per review. */
    private static Instant completionInstant(InterviewSession s) {
        return s.getCompletedAt() != null ? s.getCompletedAt() : s.getCreatedAt();
    }

    /**
     * score = null until the first trustworthy measurement; measurements = how many fed it (drives confidence);
     * estimatedPending = true when a measurement exists but was excluded for being offline-scored.
     */
    public record Readiness(Integer score, int measurements, boolean estimatedPending) {
    }
}
