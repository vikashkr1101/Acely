package com.preppal.auth.dto;

public record AuthResponse(String token, UserDto user) {
}
