"use client";

// Catches errors thrown in the root layout itself, where the normal error boundary cannot run.
// It must render its own <html>/<body> because it replaces the whole document.
export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <html lang="en">
            <body
                style={{
                    fontFamily: "system-ui, sans-serif",
                    display: "grid",
                    placeItems: "center",
                    minHeight: "100dvh",
                    margin: 0,
                    padding: "1rem",
                }}
            >
                <div style={{ maxWidth: "32rem", textAlign: "center" }}>
                    <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>
                        Something went wrong
                    </h1>
                    <p style={{ color: "#666", marginBottom: "1.5rem" }}>
                        The application failed to load.
                        {error.digest ? ` Reference: ${error.digest}` : ""}
                    </p>
                    <button
                        onClick={reset}
                        style={{
                            padding: "0.5rem 1rem",
                            borderRadius: "0.5rem",
                            border: "1px solid #ccc",
                            cursor: "pointer",
                        }}
                    >
                        Try again
                    </button>
                </div>
            </body>
        </html>
    );
}
