import { SetMetadata } from '@nestjs/common';
import type { Role } from '@facturation/core';

export const ROLES_KEY = 'roles';

/** Restreint un endpoint aux rôles indiqués. */
export const Roles = (...roles: Role[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);
