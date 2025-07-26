// types/express.ts
import { Request } from 'express';
import { UserDocument } from '../models/User';

export interface AuthenticatedRequest extends Request {
  user?: UserDocument;
}
