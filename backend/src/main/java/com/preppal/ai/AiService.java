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

    /** Failover order, e.g. "ZHIPU,GEMINI,GROQ" — overridable via AI_FAILOVER. */
    @Value("${preppal.ai.failover:ZHIPU,GEMINI,GROQ}")
    private List<String> failoverOrder;

    /** Configured LLM providers, in the order given by preppal.ai.failover. */
    private List<LlmClient> clients() {
        List<LlmClient> ordered = new ArrayList<>();
        for (String name : failoverOrder) {
            providers.stream()
                    .filter(c -> c.provider().name().equalsIgnoreCase(name.trim()) && c.isConfigured())
                    .findFirst()
                    .ifPresent(ordered::add);
        }
        return ordered;
    }

    public List<GeneratedQuestion> generateQuestions(UUID userId, UUID sessionId, String role, String jd, int count) {
        return withFailover(AiOperation.GENERATE_QUESTIONS, userId, sessionId,
                c -> c.generateQuestions(role, jd, count),
                () -> bank.forRole(role, count));
    }

    public AnswerScore scoreAnswer(UUID userId, UUID sessionId, String question, String answer) {
        return withFailover(AiOperation.SCORE_ANSWER, userId, sessionId,
                c -> c.scoreAnswer(question, answer),
                AnswerScore::fallback);
    }

    // ── failover engine (shared by both operations) ─────────────────────────
    @FunctionalInterface
    private interface AiCall<T> {
        T run(LlmClient client) throws Exception;
    }

    private <T> T withFailover(AiOperation op, UUID userId, UUID sessionId, AiCall<T> call, Supplier<T> staticFallback) {
        boolean priorFailure = false;
        for (LlmClient client : clients()) {
            long t0 = System.currentTimeMillis();
            try {
                T result = call.run(client);
                record(client.provider(), op, userId, sessionId, true, priorFailure, t0, null);
                return result;
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
