package com.preppal.ai;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.function.Supplier;

/**
 * The reliability layer: runs each AI operation through a provider failover chain
 * (order from preppal.ai.failover, e.g. Zhipu → Gemini → Groq → static fallback)
 * and records every attempt in ai_usage. Callers get a result no matter what —
 * the app never breaks on a rate limit.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AiService {

    /** All LlmClient beans (Zhipu, Gemini, Groq); ordered at call time by config. */
    private final List<LlmClient> providers;
    private final StaticQuestionBank bank;
    private final AiUsageRepository usageRepo;

    /** Default failover order (generation, etc.) — overridable via AI_FAILOVER. */
    @Value("${preppal.ai.failover:ZHIPU,GEMINI,GROQ}")
    private List<String> failoverOrder;

    /** Scoring failover order — Gemini first (more consistent technical judging). */
    @Value("${preppal.ai.failover-score:GEMINI,ZHIPU,GROQ}")
    private List<String> scoreOrder;

    /** Configured LLM providers, ordered by the per-operation failover config. */
    private List<LlmClient> clients(AiOperation op) {
        List<String> order = (op == AiOperation.SCORE_ANSWER) ? scoreOrder : failoverOrder;
        List<LlmClient> ordered = new ArrayList<>();
        for (String name : order) {
            providers.stream()
                    .filter(c -> c.provider().name().equalsIgnoreCase(name.trim()) && c.isConfigured())
                    .findFirst()
                    .ifPresent(ordered::add);
        }
        return ordered;
    }

    public List<GeneratedQuestion> generateQuestions(UUID userId, UUID sessionId, String role, String jd, int count,
                                                     com.preppal.interview.InterviewType type,
                                                     com.preppal.interview.ExperienceLevel level) {
        return withFailover(AiOperation.GENERATE_QUESTIONS, userId, sessionId,
                c -> c.generateQuestions(role, jd, count, type, level),
                () -> bank.forRole(role, count));
    }

    public AnswerScore scoreAnswer(UUID userId, UUID sessionId, String question, String answer,
                                   com.preppal.interview.InterviewType type,
                                   com.preppal.interview.ExperienceLevel level, Rubric rubric) {
        return withFailover(AiOperation.SCORE_ANSWER, userId, sessionId,
                c -> c.evaluateAnswer(question, answer, type, level, rubric),
                AnswerScore::fallback);
    }

    public SessionAnalysis analyzeSession(UUID userId, UUID sessionId, String role,
                                          com.preppal.interview.InterviewType type,
                                          com.preppal.interview.ExperienceLevel level,
                                          String perQuestion, Integer overall) {
        return withFailover(AiOperation.ANALYZE_SESSION, userId, sessionId,
                c -> c.analyzeSession(role, type, level, perQuestion),
                () -> SessionAnalysis.fallback(overall));
    }

    // ── failover engine (shared by both operations) ─────────────────────────
    @FunctionalInterface
    private interface AiCall<T> {
        T run(LlmClient client) throws Exception;
    }

    private <T> T withFailover(AiOperation op, UUID userId, UUID sessionId, AiCall<T> call, Supplier<T> staticFallback) {
        boolean priorFailure = false;
        for (LlmClient client : clients(op)) {
            long t0 = System.currentTimeMillis();
            try {
                T result = call.run(client);
                record(client.provider(), op, userId, sessionId, true, priorFailure, t0, null);
                return result;
            } catch (com.preppal.common.InvalidInputException e) {
                throw e; // a user-input problem (e.g. gibberish role) — don't retry or fall back
            } catch (Exception e) {
                log.warn("AI provider {} failed for {}: {}", client.provider(), op, e.getMessage());
                record(client.provider(), op, userId, sessionId, false, priorFailure, t0, e.getMessage());
                priorFailure = true;
            }
        }
        long t0 = System.currentTimeMillis();
        T result = staticFallback.get();
        record(AiProvider.STATIC, op, userId, sessionId, true, true, t0, null);
        return result;
    }

    private void record(AiProvider provider, AiOperation op, UUID userId, UUID sessionId,
                        boolean success, boolean fellBack, long startedAt, String error) {
        usageRepo.save(AiUsage.builder()
                .provider(provider)
                .operation(op)
                .userId(userId)
                .sessionId(sessionId)
                .success(success)
                .fellBack(fellBack)
                .latencyMs((int) (System.currentTimeMillis() - startedAt))
                .error(error == null ? null : error.substring(0, Math.min(error.length(), 500)))
                .build());
    }
}
