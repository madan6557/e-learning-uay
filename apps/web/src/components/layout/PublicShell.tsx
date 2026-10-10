import { type ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { Brand } from "./Brand";
import { ThemeToggle } from "./ThemeToggle";
import { LoginButton } from "./LoginButton";
import { ErrorBoundary } from "../../ErrorBoundary";
import labels from "../../../../../packages/shared/src/id.json";

const t = labels;

export interface PublicShellProps {
  children: ReactNode;
  config?: any;
}

export function PublicShell({
  children,
  config,
}: PublicShellProps) {
  return (
    <div className="public-shell">
      <a className="skip-link" href="#main-content">
        Lewati ke konten
      </a>
      <header className="public-header">
        <Brand />
        <nav aria-label="Menu publik">
          <ThemeToggle />
          <LoginButton
            className="header-sso-btn"
            label="Masuk dengan SSO UAY"
            config={config}
          >
            <span>Masuk SSO</span>
            <ArrowRight size={15} />
          </LoginButton>
        </nav>
      </header>
      <main id="main-content">
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>
      <footer>
        <span>© {new Date().getFullYear()} {t.university}</span>
        <span>{t.timeZone}</span>
      </footer>
    </div>
  );
}
