package com.preppal.auth;

import com.preppal.auth.dto.AuthResponse;
import com.preppal.auth.dto.ForgotPasswordRequest;
import com.preppal.auth.dto.LoginRequest;
import com.preppal.auth.dto.ResetPasswordRequest;
import com.preppal.auth.dto.SignupRequest;
import com.preppal.auth.dto.UpdateProfileRequest;
import com.preppal.auth.dto.UserDto;
import com.preppal.user.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/signup")
    public AuthResponse signup(@Valid @RequestBody SignupRequest request) {
        return authService.signup(request);
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    /** Request a reset link. Always returns 200 — we never reveal whether the email is registered. */
    @PostMapping("/forgot-password")
    @ResponseStatus(HttpStatus.OK)
    public void forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.forgotPassword(request.email());
    }

    /** Complete a reset with the emailed token; signs the user straight in on success. */
    @PostMapping("/reset-password")
    public AuthResponse resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        return authService.resetPassword(request.token(), request.password());
    }

    @GetMapping("/me")
    public UserDto me(@AuthenticationPrincipal User user) {
        return UserDto.from(user);
    }

    @PutMapping("/me")
    public UserDto updateMe(@AuthenticationPrincipal User user, @Valid @RequestBody UpdateProfileRequest req) {
        return authService.updateProfile(user, req);
    }
}
