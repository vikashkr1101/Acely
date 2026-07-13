package com.preppal.interview.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record AnswerRequest(
        @NotNull UUID questionId,
        @NotBlank @Size(max = 8000) String transcript,
        // Optional delivery metrics (voice/video mode only)
        Integer paceWpm,
        Integer fillerWords) {
}
