const providerLabels: Record<string, string> = {
  azure: "Azure AD",
  keycloak: "Keycloak",
};

export const defaultOAuth2Provider = (
  import.meta.env.VITE_OAUTH2_DEFAULT_PROVIDER ?? "azure"
).toLowerCase();

export const defaultOAuth2ProviderLabel =
  providerLabels[defaultOAuth2Provider] ?? defaultOAuth2Provider;

export const defaultOAuth2AuthorizationPath =
  `/oauth2/authorization/${defaultOAuth2Provider}`;
