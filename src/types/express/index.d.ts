import { UserDocument } from '../../src/models/User'; // adjust path if needed

declare global {
  namespace Express {
    interface Request {
      user?: UserDocument;
    }
  }
}
