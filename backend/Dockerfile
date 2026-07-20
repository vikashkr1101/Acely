# ---- build stage: compile + package with JDK 21 ----
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app
COPY . .
RUN chmod +x mvnw && ./mvnw -q clean package -DskipTests -B

# ---- run stage: slim JRE, just the jar ----
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
# Spring reads server.port from $PORT (see application.yml) — the host injects it.
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
