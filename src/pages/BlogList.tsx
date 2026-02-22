import React from "react";
import { Link } from "wouter";

const BLOGS = [
  {
    slug: "docker-for-java-beginners",
    title: "Getting Started with Docker for Java Developers",
  },
  {
    slug: "dockerizing-spring-boot-guide",
    title: "A Comprehensive Guide to Dockerizing Spring Boot Applications",
  },
  {
    slug: "introduction-to-java-ecosystem",
    title: "Introduction to Java and Its Ecosystem",
  },
  {
    slug: "java-collections-framework-beginners",
    title: "Mastering Java Collections Framework: A Deep Dive for Beginners",
  },
  {
    slug: "spring-boot-beginners-guide",
    title: "Beginner's Guide to Spring Boot Framework",
  },
  {
    slug: "understanding-java-jvm",
    title: "Understanding Java Virtual Machine (JVM): The Heart of Java",
  },
];

export default function BlogList() {
  return (
    <div
      style={{
        maxWidth: 800,
        margin: "40px auto",
        padding: 24,
        background: "#18181b",
        color: "#fff",
        borderRadius: 8,
      }}
    >
      <h1 style={{ fontSize: 32, marginBottom: 24 }}>JavaRena Blog</h1>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {BLOGS.map((blog) => (
          <li key={blog.slug} style={{ marginBottom: 16 }}>
            <Link href={`/blog/${blog.slug}`}>
              <a
                style={{
                  color: "#10b981",
                  fontSize: 20,
                  textDecoration: "none",
                }}
              >
                {blog.title}
              </a>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
