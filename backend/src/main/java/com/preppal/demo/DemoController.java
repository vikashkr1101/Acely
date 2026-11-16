package com.preppal.demo;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Public, anonymous analytics for the static demo. The page sends pings with navigator.sendBeacon as
 * text/plain (a CORS "simple" request: no preflight, works even as the tab closes), so the JSON body is
 * parsed by hand. Always answers 204 — the demo never reads the response, and a bad payload shouldn't
 * produce noise. Abuse is bounded by the per-IP limit in WebConfig.
 */
@RestController
@RequestMapping("/api/demo")
@RequiredArgsConstructor
public class DemoController {

    private static final ObjectMapper MAPPER = new ObjectMapper()
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
    private static final int MAX_BODY = 2_000;

    private final DemoService demo;

    @PostMapping(value = "/track", consumes = MediaType.ALL_VALUE)
    public ResponseEntity<Void> track(@RequestBody(required = false) String body) {
        if (body != null && body.length() <= MAX_BODY) {
            try {
                demo.record(MAPPER.readValue(body, DemoTrackRequest.class));
            } catch (Exception ignored) {
                // malformed or unexpected payload — drop it
            }
        }
        return ResponseEntity.noContent().build();
    }
}
