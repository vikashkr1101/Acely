package com.preppal.interview.dto;

/** One attempt at a question — used to render the first-vs-improved retry compare in the report. */
public record AttemptDto(
        int attemptNo,
        String transcript,
        Integer score) {
}
