package com.preppal.interview.dto;

/**
 * Progress of incremental end-of-interview scoring. The client calls score-next repeatedly (one
 * short request per answer) so a long batch never hangs one request (avoids gateway timeouts) and
 * the LLM calls are naturally paced under free-tier rate limits.
 */
public record ScoreProgress(boolean done, int scored, int total) {
}
