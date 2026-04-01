import type { Role, Status } from '@prisma/client';
import type { Request } from 'express';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: Status;
}

export type AuthenticatedRequest = Request & {
  user?: AuthenticatedUser;
};

export interface AuthTokenPayload {
  sub: string;
  iat?: number;
  exp?: number;
}