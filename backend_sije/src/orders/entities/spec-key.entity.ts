import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * 허용된 사양(specs) 키 마스터.
 *
 * 발주서 생성 시 specs 객체의 키는 이 테이블에 정의된 키만 허용한다(쓰기 검증).
 * 과거 자유 입력 시절 데이터/이력 조회는 이 제약과 무관하게 계속 동작한다(읽기는 관대).
 *
 * PROD-NOTE: 운영자가 무중단으로 키를 추가/비활성하는 관리 기능(활성 여부·카테고리 등)은
 * 과제 범위 제외. 여기서는 "정의된 키만 허용"을 위한 최소 마스터만 둔다.
 */
@Entity('spec_keys')
export class SpecKey {
  /** 사양 키 이름(예: color, size, material). 그대로 식별자. */
  @PrimaryColumn({ name: 'key', type: 'varchar', length: 100 })
  key!: string;

  /** 표시명(프론트 라벨 등). 검증에는 쓰지 않는다. */
  @Column({ name: 'display_name', type: 'varchar', length: 100 })
  displayName!: string;
}
