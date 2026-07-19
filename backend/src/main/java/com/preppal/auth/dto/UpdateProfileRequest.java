package com.preppal.auth.dto;

import com.preppal.interview.InterviewTrack;
import jakarta.validation.constraints.Size;

/** Partial profile update — only non-null fields are applied. */
public record UpdateProfileRequest(
        @Size(max = 120) String name,
        InterviewTrack primaryTrack,
        @Size(max = 60) String primaryStack) {
}
