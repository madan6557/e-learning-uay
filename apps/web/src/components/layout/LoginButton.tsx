import { type ReactNode } from "react";
import { Action } from "../ui/Action";
import { api } from "../../services/api";
import { loginWithOidc } from "../../oidc";

export interface LoginButtonProps {
  children: ReactNode;
  className: string;
  demoUserId?: string;
  label: string;
  config?: any;
}

export function LoginButton({
  children,
  className,
  demoUserId,
  label,
  config,
}: LoginButtonProps) {
  return (
    <Action
      className={className}
      label={label}
      run={async () => {
        if (
          !location.pathname.startsWith("/auth") &&
          !location.pathname.startsWith("/api") &&
          !["/", "/login"].includes(location.pathname)
        ) {
          sessionStorage.setItem(
            "uay-return-path",
            location.pathname + location.search,
          );
        } else {
          sessionStorage.removeItem("uay-return-path");
        }

        if (demoUserId) {
          await api("/auth/development-login", "POST", {
            userId: demoUserId,
          });
          location.assign("/");
          return;
        }

        // Mode demo / pengujian: selalu gunakan alur otorisasi backend agar mock SSO membuka daftar akun uji
        const isHostedDemo =
          Boolean(config?.demoEnabled) ||
          (typeof window !== "undefined" &&
            (window.location.hostname.endsWith(".vercel.app") ||
              window.location.hostname === "vercel.app" ||
              window.location.hostname.includes("railway.app")));

        if (isHostedDemo || config?.mode === "development") {
          const { authorizationUrl } = await api<{ authorizationUrl: string }>(
            "/auth/authorization",
            "POST",
          );
          location.assign(authorizationUrl);
          return;
        }

        try {
          await loginWithOidc({
            issuer: config?.issuer,
            clientId: config?.clientId,
            redirectUri: config?.redirectUri,
          });
        } catch (e) {
          console.warn(
            "[Auth] Client OIDC signinRedirect failed, trying backend fallback:",
            e,
          );
          const { authorizationUrl } = await api<{ authorizationUrl: string }>(
            "/auth/authorization",
            "POST",
          );
          location.assign(authorizationUrl);
        }
      }}
    >
      {children}
    </Action>
  );
}
