package com.preppal.interview;

public enum SessionStatus {
    /** Started, not yet finished. Excluded from readiness/analytics until completed. */
    IN_PROGRESS,
    /** Finished with at least one scored answer — a real, reportable session. */
    COMPLETED,
    /** Finished (or discarded) with no scored answers — never a measurement, kept out of trends. */
    ABANDONED
}
