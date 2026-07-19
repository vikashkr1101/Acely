package com.preppal.interview.dto;

/** A user's free-trial usage + rolling readiness (drives the adaptive-difficulty auto-ramp). */
public record UsageDto(String plan, long used, int limit, long remaining, int readiness) {
}
