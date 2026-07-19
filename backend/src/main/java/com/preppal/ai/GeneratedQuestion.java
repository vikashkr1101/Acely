package com.preppal.ai;

import com.preppal.interview.InterviewType;

/**
 * A generated question. {@code type} is the section it belongs to — set for MIXED sessions
 * (Mock Interview / Checkpoint) so each question is scored on its own rubric; null for a
 * single-type session (the session's type applies).
 */
public record GeneratedQuestion(String text, InterviewType type) {

    public GeneratedQuestion(String text) {
        this(text, null);
    }
}
