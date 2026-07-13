package com.preppal.ai;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

/** Fallback provider: Groq (OpenAI-compatible chat completions, very fast). */
@Component
public class GroqClient extends LlmClient {

    private final String apiKey;
    private final String model;
    private final String baseUrl;
    private final RestClient http = RestClient.create();

    public GroqClient(
            @Value("${preppal.groq.api-key:}") String apiKey,
            @Value("${preppal.groq.model}") String model,
            @Value("${preppal.groq.base-url}") String baseUrl) {
        this.apiKey = apiKey;
        this.model = model;
        this.baseUrl = baseUrl;
    }

    @Override
    public AiProvider provider() {
        return AiProvider.GROQ;
    }

    @Override
    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank();
    }

    @Override
    protected String complete(String systemPrompt, String userPrompt, double temperature) throws Exception {
        Map<String, Object> body = Map.of(
                "model", model,
                "temperature", temperature,
                "response_format", Map.of("type", "json_object"),
                "messages", List.of(
                        Map.of("role", "system", "content", systemPrompt),
                        Map.of("role", "user", "content", userPrompt)));

        String raw = http.post()
                .uri(baseUrl + "/chat/completions")
                .header("Authorization", "Bearer " + apiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(String.class);

        JsonNode resp = MAPPER.readTree(raw);
        return resp.path("choices").path(0).path("message").path("content").asText();
    }
}
