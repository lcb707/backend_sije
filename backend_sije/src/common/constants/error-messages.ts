/**
 * 도메인 예외 메시지 모음. 산재 방지 + 한국어 도메인 용어 일관성(CLAUDE.md §6).
 * 테스트에서도 이 상수를 참조하여 메시지 변경에 강건하게 한다.
 */
export const ERROR_MESSAGES = {
  ORDER_NOT_FOUND: '발주서를 찾을 수 없습니다.',
  CHANGE_REQUEST_NOT_FOUND: '변경요청을 찾을 수 없습니다.',
  VERSION_NOT_FOUND: '해당 버전이 존재하지 않습니다.',
  SNAPSHOT_NOT_FOUND_AT_TIME: '해당 시점에 발주서가 존재하지 않습니다.',

  CHANGE_REQUEST_REQUIRES_CONFIRMED:
    '발주서가 확정(CONFIRMED) 이후 상태일 때만 변경 요청이 가능합니다.',
  CHANGE_REQUEST_NOT_ALLOWED_WHEN_COMPLETED:
    '완료(COMPLETED)된 발주서에는 변경 요청을 생성할 수 없습니다.',
  PENDING_CHANGE_REQUEST_EXISTS: 'PENDING 상태의 변경요청이 이미 존재합니다.',
  CHANGE_ITEMS_REQUIRED: '변경 항목은 1개 이상이어야 합니다.',
  ONLY_PENDING_CAN_BE_REVIEWED:
    'PENDING 상태의 변경요청만 승인/반려할 수 있습니다.',

  INVALID_STATUS_TRANSITION: '허용되지 않은 상태 전이입니다.',

  // 요청 항목이 모두 기존 값과 동일해 실제 반영될 변경이 없을 때(승인 거부).
  NO_EFFECTIVE_CHANGE: '실질적인 변경 사항이 없어 승인할 수 없습니다.',
  // 완료(COMPLETED)된 발주서에는 더 이상 변경을 승인할 수 없다.
  ORDER_ALREADY_COMPLETED:
    '이미 완료(COMPLETED)된 발주서는 변경을 승인할 수 없습니다.',
  // specs 변경 시 발주서 생성 때 정의되지 않은 사양 키는 추가할 수 없다(기존 키만 변경 가능).
  UNKNOWN_SPEC_KEY:
    '발주서에 존재하지 않는 사양(specs) 키는 변경할 수 없습니다.',
  // 발주서 생성 시 specs 키는 허용 마스터(spec_keys)에 정의된 키만 사용할 수 있다.
  SPEC_KEY_NOT_ALLOWED: '허용되지 않은 사양(specs) 키입니다.',
} as const;

// 발주 완료로 미결 변경요청을 자동 반려할 때 기록하는 검토 의견.
export const AUTO_REJECT_ON_COMPLETION_COMMENT =
  '발주서가 완료(COMPLETED) 처리되어 미결 변경요청을 자동 반려합니다.';
