package com.preppal.interview.dto;

/** A user's free-trial usage: how many mocks used this month vs their allowance. */
public record UsageDto(String plan, long used, int limit, long remaining) {
}
