package com.preppal.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record VerifyEmailRequest(
        @NotBlank @Email @jakarta.validation.constraints.Size(max = 255) String email,
        @NotBlank @Pattern(regexp = "\\d{6}", message = "Enter the 6-digit code we emailed you.") String code) {
}
