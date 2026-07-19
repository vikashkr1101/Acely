package com.preppal.ai;

import com.preppal.interview.InterviewType;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Ultimate fallback: hand-written questions used only when every AI provider
 * is unavailable — so a mock interview can ALWAYS start.
 */
@Component
public class StaticQuestionBank {

    private static final List<String> BEHAVIOURAL = List.of(
            "Tell me about yourself and why you're interested in this role.",
            "Describe a project you're proud of. What was your contribution?",
            "Tell me about a time you faced a difficult bug or problem. How did you solve it?",
            "How do you approach learning a new technology or tool?",
            "Describe a time you worked in a team. What was your role?",
            "What are your strengths, and one area you're actively improving?",
            "Where do you see yourself growing in the next couple of years?");

    private static final List<String> TECHNICAL = List.of(
            "Walk me through how you would design a simple feature end-to-end.",
            "Explain a core concept from your field as if to a junior teammate.",
            "How do you make sure your code is reliable and maintainable?",
            "What happens, step by step, when a request goes from a UI to a database?",
            "How would you debug something that works locally but fails in production?");

    /** Returns {@code count} questions, easiest-first (behavioural, then technical). */
    public List<GeneratedQuestion> forRole(String role, int count) {
        List<GeneratedQuestion> out = new ArrayList<>();
        for (String q : BEHAVIOURAL) {
            if (out.size() >= count) break;
            out.add(new GeneratedQuestion(q));
        }
        for (String q : TECHNICAL) {
            if (out.size() >= count) break;
            out.add(new GeneratedQuestion(q));
        }
        return out;
    }

    /** A balanced mixed interview (each question tagged with its section) for MIXED-session fallback. */
    private static final List<GeneratedQuestion> MIXED = List.of(
            new GeneratedQuestion("Tell me about yourself and why you're interested in this role.", InterviewType.HR),
            new GeneratedQuestion("Walk me through a project you've built — your specific role and the tech you used.", InterviewType.PROJECT),
            new GeneratedQuestion("Explain a core concept from your field as if to a junior teammate.", InterviewType.TECHNICAL),
            new GeneratedQuestion("Describe a time you worked in a team. What was your role and how did it go?", InterviewType.BEHAVIORAL),
            new GeneratedQuestion("How would you debug something that works locally but fails in production?", InterviewType.TECHNICAL),
            new GeneratedQuestion("Tell me about a time you had to learn something quickly.", InterviewType.BEHAVIORAL),
            new GeneratedQuestion("Where do you see yourself growing in the next couple of years?", InterviewType.HR));

    public List<GeneratedQuestion> mixed(int count) {
        return MIXED.subList(0, Math.min(Math.max(count, 1), MIXED.size()));
    }
}
