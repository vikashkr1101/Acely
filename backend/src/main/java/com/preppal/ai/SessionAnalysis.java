package com.preppal.ai;

import java.util.List;

/** Grounded, instruction-driven debrief for a whole mock: a human coach note + specifics. */
public record SessionAnalysis(
        String coachNote,
        List<String> strengths,
        List<String> focus,
        List<String> patterns) {

    /** Deterministic fallback when the AI can't analyse (never generic-forever — still honest). */
    public static SessionAnalysis fallback(Integer overall) {
        String note = overall == null
                ? "You made a start — that's the hardest step. Come back and finish a full run and I'll break it down properly."
                : overall >= 70
                ? "Solid work — you're building real momentum. Tighten your weakest area and you're close to interview-ready."
                : "A real start. The biggest lever now is being specific and structured — do that and your scores will climb.";
        return new SessionAnalysis(note, List.of(),
                List.of("Be specific — use concrete examples and numbers", "Structure your answers clearly"),
                List.of());
    }
}
