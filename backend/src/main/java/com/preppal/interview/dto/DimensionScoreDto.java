package com.preppal.interview.dto;

/**
 * One rubric dimension as shown in the report — the type's real axis (e.g. "Self-awareness"
 * for HR, "Trade-offs" for Technical) with its score and the quote that justified it.
 * At session level {@code evidence} is null (the bar is an average across questions).
 */
public record DimensionScoreDto(
        String key,
        String label,
        Integer score,
        String evidence) {
}
