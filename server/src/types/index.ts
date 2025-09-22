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