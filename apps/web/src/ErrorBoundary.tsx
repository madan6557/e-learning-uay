import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import { t } from "./lib";

type Props = { children: ReactNode; onReset?: () => void };
type State = { error: Error | null };

/**
 * Keeps a render fault contained to the page that raised it. Without this a
 * single bad field reference blanks the whole application, which reads to the
 * user as an outage rather than a recoverable error.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Kesalahan tampilan:", error, info.componentStack);
  }

  reset = () => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="empty render-failure" role="alert">
        <span className="render-failure-icon">
          <AlertCircle size={24} />
        </span>
        <h1>{t.renderErrorTitle}</h1>
        <p>{t.renderErrorBody}</p>
        <div className="form-actions">
          <button type="button" className="primary" onClick={this.reset}>
            <RotateCcw size={16} />
            {t.renderErrorRetry}
          </button>
          <a className="secondary" href="#/dashboard" onClick={this.reset}>
            {t.dashboard}
          </a>
        </div>
        <details className="render-failure-detail">
          <summary>{t.renderErrorDetail}</summary>
          <pre>{this.state.error.message}</pre>
        </details>
      </div>
    );
  }
}
