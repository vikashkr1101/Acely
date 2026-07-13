package com.preppal.interview.dto;

import com.preppal.interview.InterviewMode;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateInterviewRequest(
        @NotBlank @Size(max = 160) String role,
        @Size(max = 8000) String jd,
        InterviewMode mode,
        @Min(3) @Max(8) Integer count) {

    public InterviewMode modeOrDefault() {
        return mode == null ? InterviewMode.TEXT : mode;
    }

    public int countOrDefault() {
        return count == null ? 5 : count;
    }
}
