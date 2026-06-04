/** 부팅 시 생성되는 허용 사양(specs) 키 정의. */
export interface SeedSpecKey {
  key: string;
  displayName: string;
}

/**
 * 초기 허용 키. 의류 발주에서 가장 보편적인 사양 3종.
 * 키 추가가 필요하면 이 목록에 넣으면 부팅 시 멱등 생성된다(운영 관리 UI 는 과제 범위 제외).
 */
export const SEED_SPEC_KEYS: readonly SeedSpecKey[] = [
  { key: 'color', displayName: '색상' },
  { key: 'size', displayName: '사이즈' },
  { key: 'material', displayName: '소재' },
];
