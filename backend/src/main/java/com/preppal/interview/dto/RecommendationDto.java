package com.preppal.interview.dto;

/**
 * One grounded "what to do next" line for the end of a report. The engine emits only the ones a
 * session actually earned, ranked by impact — usually one, sometimes two or three, never padded.
 *
 * @param kind    signal type (retake | focus | section | short | checkpoint) → drives the icon
 * @param text    the recommendation copy
 * @param cta     optional button label (null = no button, just guidance)
 * @param ctaType what the button starts: an InterviewType name (a practice mock), "CHECKPOINT"
 *                (a Readiness Check), "RETAKE" (re-run this mock), or null
 */
public record RecommendationDto(String kind, String text, String cta, String ctaType) {
}
