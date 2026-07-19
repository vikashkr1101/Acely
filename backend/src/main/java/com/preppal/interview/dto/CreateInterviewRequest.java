package com.preppal.interview.dto;

import com.preppal.interview.CompanyType;
import com.preppal.interview.Difficulty;
import com.preppal.interview.ExperienceLevel;
import com.preppal.interview.InterviewMode;
import com.preppal.interview.InterviewTrack;
import com.preppal.interview.InterviewType;
import com.preppal.interview.ScoringMode;
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
        ScoringMode scoringMode,
        Difficulty difficulty,
        Boolean checkpoint,
        InterviewTrack track,
        @Size(max = 60) String stack,
        CompanyType companyType,
        @Min(1) @Max(10) Integer count) {

    public boolean isCheckpoint() {
        return checkpoint != null && checkpoint;
    }

    public InterviewMode modeOrDefault() {
        return mode == null ? InterviewMode.TEXT : mode;
    }

    public ScoringMode scoringModeOrDefault() {
        return scoringMode == null ? ScoringMode.PRACTICE : scoringMode;
    }

    public InterviewType typeOrDefault() {
        return interviewType == null ? InterviewType.TECHNICAL : interviewType;
    }

    public ExperienceLevel levelOrDefault() {
        return experienceLevel == null ? ExperienceLevel.FRESHER : experienceLevel;
    }

    public Difficulty difficultyOrDefault() {
        return Difficulty.orDefault(difficulty);
    }

    public int countOrDefault() {
        return count == null ? 5 : count;
    }
}
