package com.preppal.interview;

/**
 * The candidate's primary interview TRACK — the benchmark a Readiness Check standardizes to, so a
 * Backend score always compares against the Backend benchmark (never against Data/ML). The specific
 * stack (Java, Python, Node…) personalizes questions but doesn't change the benchmark.
 */
public enum InterviewTrack {
    BACKEND, FRONTEND, FULLSTACK, DATA, QA, DEVOPS, GENERAL;

    public static InterviewTrack orGeneral(InterviewTrack t) {
        return t == null ? GENERAL : t;
    }

    public String label() {
        return switch (this) {
            case BACKEND -> "Backend";
            case FRONTEND -> "Frontend";
            case FULLSTACK -> "Full-Stack";
            case DATA -> "Data / ML";
            case QA -> "QA / Testing";
            case DEVOPS -> "DevOps / Cloud";
            case GENERAL -> "General";
        };
    }

    /** What the standardized TECHNICAL + PROJECT questions should focus on for this track. */
    public String focus() {
        return switch (this) {
            case BACKEND -> "server-side development: APIs, databases and SQL, data structures, system design, concurrency and error handling";
            case FRONTEND -> "frontend development: HTML/CSS, JavaScript, a component framework (e.g. React), state management, browser rendering and web performance";
            case FULLSTACK -> "full-stack development: both frontend (UI, a JS framework) and backend (APIs, databases), and how the two connect";
            case DATA -> "data and ML: SQL, data cleaning and analysis, statistics, Python/pandas, and core machine-learning concepts";
            case QA -> "quality assurance: test design, writing test cases, manual vs automated testing, bug reporting and basic automation";
            case DEVOPS -> "DevOps and cloud: CI/CD, containers, infrastructure basics, monitoring and deployment";
            case GENERAL -> "general software fundamentals: programming basics, data structures, databases and problem-solving";
        };
    }
}
