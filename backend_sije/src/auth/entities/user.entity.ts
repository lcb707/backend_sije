import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { UserRole } from '../../common/enums/user-role.enum';

/**
 * 시드 계정. 클라이언트는 username(X-User-Id)만 보내고, 역할은 이 테이블에서 결정된다.
 * 비밀번호 컬럼 없음(신원 검증 미수행 — 과제 목적은 역할 식별). 
 */
@Entity('users')
@Unique('uq_user_username', ['username'])
export class User {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id!: number;

  @Column({ type: 'varchar', length: 100 })
  username!: string;

  @Column({ type: 'enum', enum: UserRole })
  role!: UserRole;

  @Column({ name: 'display_name', type: 'varchar', length: 100 })
  displayName!: string;

  @CreateDateColumn({
    name: 'created_at',
    type: 'datetime',
    precision: 3,
    default: () => 'CURRENT_TIMESTAMP(3)',
  })
  createdAt!: Date;
}
