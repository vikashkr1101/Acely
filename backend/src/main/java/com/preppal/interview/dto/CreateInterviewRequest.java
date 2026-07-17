package com.preppal.interview.dto;

import com.preppal.interview.ExperienceLevel;
import com.preppal.interview.InterviewMode;
import com.preppal.interview.InterviewType;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateInterviewRequest(
        @NotBlank @Size(max = 160) String role,
        @Size(max = 8000) String jd,
        InterviewMode mode,
        InterviewType interviewType,
        ExperienceLevel experienceLevel,
        @Min(3) @Max(8) Integer count) {

    public InterviewMode modeOrDefault() {
        return mode == null ? InterviewMode.TEXT : mode;
    }

    public InterviewType typeOrDefault() {
        return interviewType == null ? InterviewType.TECHNICAL : interviewType;
    }

    public ExperienceLevel levelOrDefault() {
        return experienceLevel == null ? ExperienceLevel.FRESHER : experienceLevel;
    }

    public int countOrDefault() {
        return count == null ? 5 : count;
    }
}
