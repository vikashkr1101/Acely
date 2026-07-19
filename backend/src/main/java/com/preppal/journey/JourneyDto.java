package com.preppal.journey;

import com.preppal.interview.dto.DimensionScoreDto;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * The two journeys:
 *  - {@code measurements} = the READINESS journey (checkpoints + mock-interviews; single-shot, honest),
 *    each with its overall + per-section scores.
 *  - {@code practice} = the per-section PRACTICE journey (one point per practice mock).
 * The frontend filters by date range client-side.
 */
public record JourneyDto(
        List<Measurement> measurements,
        List<PracticePoint> practice) {

    /** A checkpoint or mock-interview: overall readiness + per-section breakdown + pre-session nerves. */
    public record Measurement(
            Instant date,
            Integer overall,
            boolean checkpoint,
            String role,
            Map<String, Integer> sections,
            Integer nervesBefore) {
    }

    /** A single practice mock, focused on one section. */
    public record PracticePoint(
            Instant date,
            String section,
            Integer score,
            String role,
            List<DimensionScoreDto> dims) {
    }
}
