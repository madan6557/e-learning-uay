import { UserManager, type UserManagerSettings, type User } from "oidc-client-ts";

let userManagerInstance: UserManager | null = null;
let currentConfigKey = "";

export function getOidcManager(authConfig?: {
  issuer?: string;
  clientId?: string;
  redirectUri?: string;
}): UserManager {
  const authority =
    (import.meta.env.VITE_OIDC_AUTHORITY as string | undefined) ||
    authConfig?.issuer ||
    "https://sso.uay.ac.id/realms/uay";

  const clientId =
    (import.meta.env.VITE_OIDC_CLIENT_ID as string | undefined) ||
    authConfig?.clientId ||
    "elearning-uay";

  const redirectUri =
    (import.meta.env.VITE_OIDC_REDIRECT_URI as string | undefined) ||
    authConfig?.redirectUri ||
    `${window.location.origin}/auth/callback`;

  const configKey = `${authority}|${clientId}|${redirectUri}`;

  if (userManagerInstance && currentConfigKey === configKey) {
    return userManagerInstance;
  }

  const settings: UserManagerSettings = {
    authority,
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid profile email",
    automaticSilentRenew: false,
    loadUserInfo: true,
  };

  userManagerInstance = new UserManager(settings);
  currentConfigKey = configKey;
  return userManagerInstance;
}

export async function loginWithOidc(authConfig?: {
  issuer?: string;
  clientId?: string;
  redirectUri?: string;
}): Promise<void> {
  const manager = getOidcManager(authConfig);
  await manager.signinRedirect();
}

export async function handleOidcCallback(authConfig?: {
  issuer?: string;
  clientId?: string;
  redirectUri?: string;
}): Promise<User> {
  const manager = getOidcManager(authConfig);
  const user = await manager.signinRedirectCallback();
  try {
    console.log(
      "%c[SSO OIDC CLIENT] Signin redirect callback berhasil diselesaikan:",
      "color: #10b981; font-weight: bold;",
      {
        access_token: user.access_token,
        id_token: user.id_token,
        profile: user.profile,
        scope: user.scope,
      },
    );
  } catch {}
  return user;
}

export async function logoutOidc(): Promise<void> {
  if (userManagerInstance) {
    try {
      await userManagerInstance.removeUser();
    } catch {}
  }
}
