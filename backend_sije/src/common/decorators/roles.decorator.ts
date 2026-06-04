import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../enums/user-role.enum';

export const ROLES_KEY = 'roles';

/**
 * 핸들러가 허용하는 역할을 지정한다. 지정한 역할 중 하나라도 일치해야 통과.
 * 데코레이터가 없으면 역할 제한 없음(any)으로 간주한다.
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
