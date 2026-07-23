import {
  CanActivate,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import type { Role } from './demo-users';

export type AuthUser = { sub: string; name: string; role: Role };

export const ROLES_KEY = 'radflow:roles';
/** Restricts a route to the given roles; without it any authenticated user passes. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const header = request.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    let user: AuthUser;
    try {
      user = await this.jwtService.verifyAsync<AuthUser>(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
    request.user = user;

    const requiredRoles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (requiredRoles && !requiredRoles.includes(user.role)) {
      throw new ForbiddenException(
        `Role ${user.role} cannot perform this action (requires: ${requiredRoles.join(', ')})`,
      );
    }
    return true;
  }
}
