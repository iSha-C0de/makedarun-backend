// utils/assertUser.ts
import { AuthenticatedRequest } from '../types/express';
import { UserDocument } from '../models/User';

export function assertUser(req: AuthenticatedRequest): UserDocument {
  if (!req.user) {
    throw new Error('User not authenticated');
  }
  return req.user;
}
