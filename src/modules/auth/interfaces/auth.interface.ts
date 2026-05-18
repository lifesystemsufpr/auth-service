import { SystemRole } from '@prisma/client';

export interface AccessToken {
  access_token: string;
  refresh_token: string;
}

export interface JwtPayload {
  sub: string;
  username: string;
  cpf?: string;
  email?: string;
  role: SystemRole;
  iss: string;
  aud: string[];
}

export interface RefreshPayload {
  sub: string;
  persistent: boolean;
}

export interface Payload {
  id: string;
  cpf?: string;
  email?: string;
  fullName: string;
  role: SystemRole;
}
