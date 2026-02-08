FROM eclipse-temurin:25.0.2_10-jdk

ARG TARGET_PATH=/usr/src/app
COPY api/build/libs/api-*.jar app.jar

EXPOSE 8081
ENV JAVA_OPTS="-Xmx1g -Xms256m"
ENTRYPOINT exec java $JAVA_OPTS -jar app.jar

