package com.preppal.interview.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record AnswerRequest(
        @jakarta.validation.constraints.NotNull UUID questionId,
        @NotBlank @Size(max = 8000) String transcript) {
}
