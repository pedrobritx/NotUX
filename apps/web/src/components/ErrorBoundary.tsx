import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

// Top-level safety net: a render error anywhere in the tree shows a recovery
// screen instead of a blank white page, and offers a reload. This is the
// difference between "the app crashed" and "the app is unusable".
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surface the failure in the console for diagnosis; kept lightweight so we
    // don't depend on an external error service.
    console.error("NotUX crashed:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="crash">
          <div className="crash__card">
            <h1 className="crash__title">Something went wrong</h1>
            <p className="crash__body">
              NotUX hit an unexpected error. Your boards are saved — reloading
              usually fixes it.
            </p>
            {import.meta.env.DEV && (
              <pre className="crash__detail">{this.state.error.message}</pre>
            )}
            <div className="crash__actions">
              <button
                type="button"
                className="lg-button lg-button--primary"
                onClick={() => window.location.reload()}
              >
                Reload
              </button>
              <button
                type="button"
                className="lg-button"
                onClick={() => {
                  window.location.href = import.meta.env.BASE_URL;
                }}
              >
                Back to home
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
