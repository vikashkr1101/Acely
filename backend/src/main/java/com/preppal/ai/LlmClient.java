package com.preppal.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.List;

/**
 * Shared LLM logic: builds the prompts and parses the JSON responses.
 * Concrete providers (Gemini, Groq) only implement {@link #complete}.
 */
public abstract class LlmClient {

    protected static final ObjectMapper MAPPER = new ObjectMapper();

    public abstract AiProvider provider();

    /** True only when an API key is configured for this provider. */
    public abstract boolean isConfigured();

    /** Send a prompt to the provider and return the raw model text (expected to be JSON). */
    protected abstract String complete(String systemPrompt, String userPrompt, double temperature) throws Exception;

    // ── Question generation ────────────────────────────────────────────────
    public List<GeneratedQuestion> generateQuestions(String role, String jd, int count) throws Exception {
        String system = """
                You are an expert, friendly interviewer helping a student prepare for a "%s" interview.
                Generate exactly %d realistic interview questions tailored to the role (and the job
                description if given). Mix behavioural and technical questions, ordered easiest-first to
                build confidence. Keep each question to one or two sentences.
                Respond with ONLY valid JSON in exactly this shape:
                {"questions":[{"text":"..."}]}
                """.formatted(role, count);
        String user = "Role: " + role + "\nJob description: " + (jd == null || jd.isBlank() ? "not provided" : jd);

        JsonNode root = MAPPER.readTree(extractJson(complete(system, user, 0.7)));
        List<GeneratedQuestion> questions = new ArrayList<>();
        for (JsonNode q : root.path("questions")) {
            String text = q.path("text").asText(null);
            if (text != null && !text.isBlank()) questions.add(new GeneratedQuestion(text.trim()));
        }
        if (questions.isEmpty()) throw new IllegalStateException("No questions parsed from response");
        return questions;
    }

    // ── Answer scoring ─────────────────────────────────────────────────────
    public AnswerScore scoreAnswer(String question, String answer) throws Exception {
        String system = """
                You are a supportive interview coach for students. Score the candidate's answer fairly
                but kindly. Lead the feedback with what they did well, then ONE specific thing to improve.
                Respond with ONLY valid JSON in exactly this shape:
                {"communication":0-100,"technical_depth":0-100,"relevance":0-100,"clarity":0-100,
                 "feedback":"kind, specific, 2-3 sentences","model_answer":"a concise strong example answer"}
                """;
        String user = "Question: " + question + "\nCandidate's answer: " + answer;

        JsonNode n = MAPPER.readTree(extractJson(complete(system, user, 0.3)));
        return new AnswerScore(
                clamp(n.path("communication").asInt(60)),
                clamp(n.path("technical_depth").asInt(60)),
                clamp(n.path("relevance").asInt(60)),
                clamp(n.path("clarity").asInt(60)),
                n.path("feedback").asText("Good effort — keep practising!"),
                n.path("model_answer").asText(""));
    }

    // ── helpers ────────────────────────────────────────────────────────────
    private static int clamp(int v) {
        return Math.max(0, Math.min(100, v));
    }

    /** Tolerates models that wrap JSON in prose or ```json fences. */
    protected static String extractJson(String raw) {
        if (raw == null) throw new IllegalStateException("Empty AI response");
        int start = raw.indexOf('{');
        int end = raw.lastIndexOf('}');
        return (start >= 0 && end > start) ? raw.substring(start, end + 1) : raw;
    }
}
