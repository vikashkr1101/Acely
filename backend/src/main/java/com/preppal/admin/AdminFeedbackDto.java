package com.preppal.admin;

import java.time.Instant;
import java.util.List;

/** User feedback for the admin panel: headline stats + the most recent entries. */
public record AdminFeedbackDto(
        Double avgRating,
        long total,
        long thisWeek,
        List<Item> recent) {

    public record Item(Integer rating, String category, String message, String user, Instant createdAt) {}
}
