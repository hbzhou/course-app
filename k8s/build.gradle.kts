import groovy.namespace.QName
import groovy.util.Node

plugins {
    kotlin("jvm")
    `maven-publish`
}

repositories {
    mavenCentral()
}

val buildVersion = System.getProperty("buildVersion") ?: "1.0.0-SNAPSHOT"
val extension = "tgz"
val helmTarTaskName = "helmTar"

tasks.register<Tar>(helmTarTaskName) {
    from("course-app-chart")
    archiveFileName = "course-app-$buildVersion.tgz"
    archiveExtension = extension
    compression = Compression.GZIP
    into("course-app-chart")
}

configure<PublishingExtension> {
    publications.create<MavenPublication>("courseApp") {
        version = buildVersion
        pom.withXml {
            asNode().getAt(QName("dependencyManagement")).toList().forEach {
                asNode().remove(it as Node)
            }
        }
        artifact(tasks.named(helmTarTaskName).get()) {
            artifactId = "course-app"
            group = "com.itsz"
            extension = extension
        }
    }

    repositories.maven {
        url = uri(System.getProperty("nexusUrl") ?: "http://localhost/repository/maven-releases/")
        credentials {
            username = System.getProperty("nexusUser") ?: ""
            password = System.getProperty("nexusPassword") ?: ""
        }
    }
}