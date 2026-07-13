package com.preppal.ai;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

/** Primary provider: Google Gemini (generateContent API). */
@Component
public class GeminiClient extends LlmClient {

    private final String apiKey;
    private final String model;
    private final String baseUrl;
    private final RestClient http = RestClient.create();

    public GeminiClient(
            @Value("${preppal.gemini.api-key:}") String apiKey,
            @Value("${preppal.gemini.model}") String model,
            @Value("${preppal.gemini.base-url}") String baseUrl) {
        this.apiKey = apiKey;
        this.model = model;
        this.baseUrl = baseUrl;
    }

    @Override
    public AiProvider provider() {
        return AiProvider.GEMINI;
    }

    @Override
    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank();
    }

    @Override
    protected String complete(String systemPrompt, String userPrompt, double temperature) throws Exception {
        Map<String, Object> body = Map.of(
                "contents", List.of(Map.of("parts", List.of(Map.of("text", systemPrompt + "\n\n" + userPrompt)))),
                "generationConfig", Map.of("temperature", temperature, "responseMimeType", "application/json"));

        String raw = http.post()
                .uri(baseUrl + "/models/" + model + ":generateContent?key=" + apiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(String.class);

        JsonNode resp = MAPPER.readTree(raw);
        return resp.path("candidates").path(0).path("content").path("parts").path(0).path("text").asText();
    }
}
