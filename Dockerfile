# ---------- Étape 1 : compilation du backend Spring Boot ----------
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn -B -q -DskipTests package

# ---------- Étape 2 : image d'exécution (JRE seul, plus légère) ----------
FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar

# Plan gratuit Render : 512 Mo de RAM et peu de CPU.
# On limite le tas Java et on privilégie un démarrage rapide.
ENV JAVA_OPTS="-XX:MaxRAMPercentage=60 -XX:+UseSerialGC -XX:TieredStopAtLevel=1 -Xss512k"

# Render fournit le port via la variable PORT (lue par server.port)
EXPOSE 8081
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar app.jar"]
