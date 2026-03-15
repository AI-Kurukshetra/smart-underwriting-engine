import type { NextPage } from "next";

const Custom500: NextPage = () => (
  <div
    style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "2rem",
      fontFamily: "system-ui, sans-serif",
      textAlign: "center",
      background: "#0f1117",
      color: "#e2e8f0",
    }}
  >
    <h1 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "0.5rem" }}>
      Something went wrong
    </h1>
    <p style={{ color: "#94a3b8", marginBottom: "1.5rem" }}>
      An unexpected error occurred. Please try again later.
    </p>
    <a
      href="/"
      style={{
        color: "#6366f1",
        textDecoration: "none",
        fontWeight: 500,
      }}
    >
      Return home
    </a>
  </div>
);

export default Custom500;
