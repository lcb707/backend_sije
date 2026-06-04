import { UserRole } from '../common/enums/user-role.enum';

/** 부팅 시 생성되는 고정 시드 계정 정의. */
export interface SeedUser {
  username: string;
  role: UserRole;
  displayName: string;
}

/**
 * 역할마다 2~3개를 두어 같은 역할 내 사람을 구분한다.
 */
export const SEED_USERS: readonly SeedUser[] = [
  { username: 'buyer1', role: UserRole.BUYER, displayName: '주문담당 A' },
  { username: 'buyer2', role: UserRole.BUYER, displayName: '주문담당 B' },
  { username: 'sourcing1', role: UserRole.SOURCING, displayName: '소싱담당 A' },
  { username: 'sourcing2', role: UserRole.SOURCING, displayName: '소싱담당 B' },
  {
    username: 'maker1',
    role: UserRole.MANUFACTURER,
    displayName: '생산담당 A',
  },
];
