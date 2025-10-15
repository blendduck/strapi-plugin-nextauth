export interface OAuthLoginRequest {
  email: string;
  password: string;
}

export interface OAuthUser {
  id: string;
  nickname: string;
  avatar: string;
  email?: string;
}

export interface MagicLinkExchangeRequest {
  token?: string;
  loginToken?: string;
  email?: string;
  code?: string;
}

export interface SendMagicLinkRequest {
  email: string;
  url?: string;
  context?: Record<string, unknown>;
}
