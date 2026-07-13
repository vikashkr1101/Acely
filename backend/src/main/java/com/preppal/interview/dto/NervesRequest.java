package com.preppal.interview.dto;

import com.preppal.metric.MetricPhase;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/** The 😰→😌 check-in: how nervous (1-10) the student felt BEFORE or AFTER a mock. */
public record NervesRequest(
        @NotNull MetricPhase phase,
        @Min(1) @Max(10) int nervousness) {
}
