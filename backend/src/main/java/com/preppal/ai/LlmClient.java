package com.preppal.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.preppal.common.InvalidInputException;
import com.preppal.interview.ExperienceLevel;
import com.preppal.interview.InterviewType;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

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

    // ── Question generation (type-aware + level-aware) ─────────────────────
    public List<GeneratedQuestion> generateQuestions(String role, String jd, int count,
                                                     InterviewType type, ExperienceLevel level) throws Exception {
        InterviewType t = type == null ? InterviewType.TECHNICAL : type;
        String levelLabel = (level == null ? ExperienceLevel.FRESHER : level).label();
        String system = """
                You are an expert, friendly interviewer running a %s interview for a "%s" role.
                The candidate is %s — calibrate difficulty and expectations to that level.
                %s
                Generate exactly %d realistic questions of this kind, ordered easiest-first to build
                confidence. Keep each to one or two sentences and stay within the interview type above.
                If the role above is NOT a recognisable job title (e.g. random letters or gibberish),
                respond ONLY with {"invalid_role":true} and no questions.
                Otherwise respond with ONLY valid JSON in exactly this shape:
                {"questions":[{"text":"..."}]}
                """.formatted(kindLabel(t), role, levelLabel, typeGuidance(t), count);
        String user = "Role: " + role + "\nContext / job description: " + (jd == null || jd.isBlank() ? "not provided" : jd);

        JsonNode root = MAPPER.readTree(extractJson(complete(system, user, 0.7)));
        if (root.path("invalid_role").asBoolean(false)) {
            throw new InvalidInputException("That doesn't look like a real role — try something like \"Frontend Developer\".");
        }
        List<GeneratedQuestion> questions = new ArrayList<>();
        for (JsonNode q : root.path("questions")) {
            String text = q.path("text").asText(null);
            if (text != null && !text.isBlank()) questions.add(new GeneratedQuestion(text.trim()));
        }
        if (questions.isEmpty()) throw new IllegalStateException("No questions parsed from response");
        return questions;
    }

    private static String kindLabel(InterviewType t) {
        return switch (t) {
            case TECHNICAL -> "technical";
            case BEHAVIORAL -> "behavioural";
            case HR -> "HR / motivation";
            case PROJECT -> "project-based";
        };
    }

    private static String typeGuidance(InterviewType t) {
        return switch (t) {
            case TECHNICAL -> "Ask technical questions: core fundamentals, problem-solving, and 'how would you approach' questions relevant to the role. Do NOT ask HR or behavioural questions.";
            case BEHAVIORAL -> "Ask behavioural questions that invite STAR-style stories (a real situation, the actions they took, the result) about teamwork, conflict, ownership, and learning.";
            case HR -> "Ask HR / motivation questions: tell me about yourself, strengths and weaknesses, why this role and company, career goals, and situational fit.";
            case PROJECT -> "Ask questions about the candidate's OWN projects and experience (use the job description/context if given): their specific role, the technical decisions and why, challenges they solved, and the impact.";
        };
    }

    // ── Answer evaluation (rubric-driven, one call) ─────────────────────────
    // The prompt does two things IN ORDER inside one JSON response: (1) grade each rubric
    // dimension harshly, with a quoted piece of the answer as evidence, against anchored bands
    // and calibrated to the candidate's level; (2) only then write encouraging coach feedback +
    // a strong example answer. Scoring is anchored by evidence + bands before feedback is written,
    // so the warm tone can't inflate the numbers. Overall + the canonical-4 report axes are then
    // computed IN CODE from the returned dimension scores (never trusting the model's own maths).
    public AnswerScore evaluateAnswer(String question, String answer, InterviewType type,
                                      ExperienceLevel level, Rubric rubric) throws Exception {
        JsonNode rubricDims = MAPPER.readTree(rubric.getDimensions());
        String levelLabel = (level == null ? ExperienceLevel.FRESHER : level).label();

        StringBuilder dimList = new StringBuilder();
        for (JsonNode d : rubricDims) {
            dimList.append("- ").append(d.path("key").asText())
                    .append(" (").append(d.path("label").asText()).append("): ")
                    .append(d.path("description").asText()).append('\n');
        }

        String system = """
                You are a strict, fair interviewer evaluating a candidate's answer in a %s interview.
                The candidate is %s. Judge against what is fair for that level — never penalise a fresher
                for lacking senior experience, and never reward a weak answer just because it is on-topic.

                What a strong answer contains: %s

                Score EACH of these dimensions from 0-100. For every dimension you MUST quote a short
                exact phrase from the candidate's answer as evidence (use "" if the answer gives none):
                %s
                Scoring bands: %s

                Be harsh and specific. Most real answers land 40-70; only genuinely strong, complete
                answers exceed 80. A vague, rambling, or off-topic answer scores low even when the topic
                is right. Do NOT inflate.

                Only AFTER scoring, write short encouraging feedback for the candidate — lead with a real
                strength, then the single most important thing to improve — and a concise strong example answer.

                Respond with ONLY valid JSON in exactly this shape:
                {"dimensions":[{"key":"<dimension key>","score":0-100,"evidence":"<short quote or empty>"}],
                 "feedback":"kind, specific, 2-3 sentences","model_answer":"a concise strong example answer"}
                """.formatted(rubric.getLabel(), levelLabel, rubric.getTopAnswerGuidance(),
                dimList.toString().trim(), rubric.getBandAnchors());
        String user = "Question: " + question + "\nCandidate's answer: " + answer;

        JsonNode resp = MAPPER.readTree(extractJson(complete(system, user, 0.2)));

        // key -> score for each dimension the model returned. Keys are NORMALISED (lowercase,
        // alphanumeric only) on both sides so "Trade-offs" / "Correctness" still match our
        // "tradeoffs" / "correctness" — models don't reliably echo the exact key casing.
        JsonNode dimsNode = resp.path("dimensions");
        if (!dimsNode.isArray()) dimsNode = MAPPER.createArrayNode();
        Map<String, Integer> scores = new HashMap<>();
        for (JsonNode d : dimsNode) {
            String key = norm(d.path("key").asText(""));
            if (!key.isBlank()) scores.put(key, clamp(d.path("score").asInt(60)));
        }

        // weighted overall (weights from the rubric; normalised in case they don't sum to 1)
        double weightedSum = 0, weightTotal = 0;
        for (JsonNode rd : rubricDims) {
            Integer s = scores.get(norm(rd.path("key").asText()));
            double w = rd.path("weight").asDouble(0);
            if (s != null && w > 0) { weightedSum += s * w; weightTotal += w; }
        }
        int overall = weightTotal > 0 ? (int) Math.round(weightedSum / weightTotal) : avg(scores);

        // project onto the canonical 4 report axes so the bars are never empty
        JsonNode axisMap = MAPPER.readTree(rubric.getAxisMap());
        String rubricJson = MAPPER.writeValueAsString(Map.of("dimensions", dimsNode, "overall", overall));
        return new AnswerScore(
                projectAxis(axisMap, "communication", scores, overall),
                projectAxis(axisMap, "technical_depth", scores, overall),
                projectAxis(axisMap, "relevance", scores, overall),
                projectAxis(axisMap, "clarity", scores, overall),
                overall,
                resp.path("feedback").asText("Good effort — keep practising!"),
                resp.path("model_answer").asText(""),
                rubricJson);
    }

    // ── helpers ────────────────────────────────────────────────────────────
    private static int clamp(int v) {
        return Math.max(0, Math.min(100, v));
    }

    private static int avg(Map<String, Integer> scores) {
        return scores.isEmpty() ? 60 : (int) Math.round(scores.values().stream().mapToInt(Integer::intValue).average().orElse(60));
    }

    /** Normalise a dimension key for matching: lowercase, alphanumeric only. */
    private static String norm(String s) {
        return s == null ? "" : s.toLowerCase().replaceAll("[^a-z0-9]", "");
    }

    /** A canonical axis = average of the dimension scores mapped to it; falls back to overall. */
    private static int projectAxis(JsonNode axisMap, String axis, Map<String, Integer> scores, int fallback) {
        int sum = 0, n = 0;
        for (JsonNode k : axisMap.path(axis)) {
            Integer s = scores.get(norm(k.asText()));
            if (s != null) { sum += s; n++; }
        }
        return n > 0 ? Math.round((float) sum / n) : fallback;
    }

    /** Tolerates models that wrap JSON in prose or ```json fences. */
    protected static String extractJson(String raw) {
        if (raw == null) throw new IllegalStateException("Empty AI response");
        int start = raw.indexOf('{');
        int end = raw.lastIndexOf('}');
        return (start >= 0 && end > start) ? raw.substring(start, end + 1) : raw;
    }
}
