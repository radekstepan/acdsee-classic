import { Component, StrictMode, type ErrorInfo, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./app.css";
import App from "./App";

/**
 * Last-resort boundary. In development a hot update that invalidates the store
 * context can leave React with no provider; reloading recovers immediately.
 * In production it offers a manual reload instead of a blank window.
 */
class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ACDSee render error", error, info);
    if (import.meta.env.DEV) {
      window.setTimeout(() => window.location.reload(), 150);
    }
  }

  render() {
    if (this.state.failed) {
      return (
        <div style={{ position: "fixed", inset: 0, background: "#008080", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="window98" style={{ width: 360 }}>
            <div className="title-bar">
              <div className="title-bar-text">ACDSee Classic</div>
            </div>
            <div className="p-3">
              <div className="mb-3">ACDSee needs to reload.</div>
              <div className="flex justify-end">
                <button type="button" className="btn default" onClick={() => window.location.reload()}>
                  Reload
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>
);
