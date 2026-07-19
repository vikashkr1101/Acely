package com.preppal.auth.dto;

import com.preppal.user.User;

import java.util.UUID;

public record UserDto(UUID id, String name, String email, String primaryTrack, String primaryStack) {

    public static UserDto from(User user) {
        return new UserDto(user.getId(), user.getName(), user.getEmail(),
                user.getPrimaryTrack() == null ? null : user.getPrimaryTrack().name(),
                user.getPrimaryStack());
    }
}
