FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -B dependency:go-offline
COPY src src
RUN mvn -B package -DskipTests && mvn -B dependency:get -Dartifact=org.apache.maven.surefire:surefire-junit-platform:3.5.2
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/quarkus-app/ ./
USER 1001
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "quarkus-run.jar"]
