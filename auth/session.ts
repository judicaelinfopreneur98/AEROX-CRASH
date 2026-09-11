import { AuthService } from './AuthService';
import { UserPayload } from './types';

export function getAuthSession(req: Request | any): UserPayload | null {
  try {
    let authHeader: string | null = null;

    if (req.headers && typeof req.headers.get === 'function') {
      authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    } else if (req.headers && req.headers.authorization) {
      authHeader = req.headers.authorization;
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.split(' ')[1];
    return AuthService.getInstance().verifyToken(token);
  } catch {
    return null;
  }
}
