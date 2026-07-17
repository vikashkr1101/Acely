package com.preppal.ai;

import com.preppal.interview.InterviewType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/** Loads the scoring rubric for an interview type (used by the answer evaluator). */
@Service
@RequiredArgsConstructor
public class RubricService {

    private final RubricRepository repo;

    /** Rubric for the given type; falls back to TECHNICAL if the type is null/unseeded. */
    public Rubric forType(InterviewType type) {
        InterviewType t = type == null ? InterviewType.TECHNICAL : type;
        return repo.findById(t)
                .or(() -> repo.findById(InterviewType.TECHNICAL))
                .orElseThrow(() -> new IllegalStateException("No rubric seeded for " + t));
    }
}
