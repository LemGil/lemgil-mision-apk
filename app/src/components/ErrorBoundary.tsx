import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          background: "#1a1d26",
          color: "white",
          padding: "20px",
          fontFamily: "system-ui, sans-serif"
        }}>
          <div style={{ textAlign: "center", maxWidth: "500px" }}>
            <h1 style={{ fontSize: "24px", marginBottom: "12px" }}>⚠️ Error del Sistema</h1>
            <p style={{ marginBottom: "8px", color: "#ccc" }}>Lo sentimos, ha ocurrido un error inesperado.</p>
            {this.state.error && (
              <p style={{ fontSize: "12px", color: "#888", marginBottom: "20px", wordBreak: "break-all" }}>
                {this.state.error.message}
              </p>
            )}
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: "10px 20px",
                background: "#c9a24a",
                color: "#1a1d26",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: 600
              }}
            >
              Recargar página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
