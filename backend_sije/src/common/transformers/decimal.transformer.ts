import { ValueTransformer } from 'typeorm';

/**
 * MySQL DECIMAL 은 드라이버가 문자열로 돌려준다. 도메인에서 number 로 일관되게 다루기 위해 변환한다.
 * 과제 금액 규모(단가)에서 number 정밀도는 충분하다.
 * PROD-NOTE: 통화 정밀도가 중요한 회계 영역이면 number 대신 정수(최소단위) 또는 Decimal 라이브러리 사용 권장.
 */
export const decimalTransformer: ValueTransformer = {
  to: (value?: number | null): number | null | undefined => value,
  from: (value?: string | null): number | null | undefined =>
    value === null || value === undefined ? value : parseFloat(value),
};
