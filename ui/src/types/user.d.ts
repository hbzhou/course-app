export type User = {
  username: string;
  email: string;
  token: string; // For backward compatibility with legacy JWT
};

export type OAuth2User = {
  name: string;
  email: string;
  accessToken: string;
  idToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType: string;
};
