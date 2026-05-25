import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

interface AuthPayload {
  sub: string;
  identifier: string;
  familyId: string;
  isAdmin: boolean;
}

/**
 * Validates the Bearer JWT and exposes the family context (DB routing key,
 * current member id, admin flag) on the request.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const auth: string | undefined = req.headers['authorization'];
    if (!auth?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }
    try {
      const payload = this.jwtService.verify<AuthPayload>(auth.slice(7));
      req.familyContext = {
        familyId: payload.familyId,
        identifier: payload.identifier,
        memberId: payload.sub,
        isAdmin: payload.isAdmin,
      };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
