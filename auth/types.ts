export type Role = 'USER' | 'SUPPORT' | 'ADMIN' | 'SUPER_ADMIN';

export interface UserPayload {
  id: string;
  username: string;
  email: string;
  role: Role;
  currency: string;
  isEmailVerified: boolean;
  isSuspended: boolean;
}

export interface AuthTokens {
  accessToken: string;
  user: UserPayload;
}
