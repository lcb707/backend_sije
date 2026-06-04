import type { ChangeRequestStatus, OrderStatus, UserRole } from "./types";

export const SEED_USERS = [
  { username: "buyer1", role: "BUYER" as UserRole, displayName: "주문담당 A" },
  { username: "buyer2", role: "BUYER" as UserRole, displayName: "주문담당 B" },
  {
    username: "sourcing1",
    role: "SOURCING" as UserRole,
    displayName: "소싱담당 A",
  },
  {
    username: "sourcing2",
    role: "SOURCING" as UserRole,
    displayName: "소싱담당 B",
  },
  {
    username: "maker1",
    role: "MANUFACTURER" as UserRole,
    displayName: "생산담당 A",
  },
] as const;

export type SeedUser = (typeof SEED_USERS)[number];

// 선택된 계정을 localStorage 에 저장하는 키. api.ts 와 UserContext 가 공유한다.
export const USER_STORAGE_KEY = "po_current_user";
export const DEFAULT_USERNAME = SEED_USERS[0].username; // buyer1

export const ROLE_LABELS: Record<UserRole, string> = {
  BUYER: "주문자",
  SOURCING: "소싱팀",
  MANUFACTURER: "생산자",
};

export const ROLE_COLORS: Record<UserRole, string> = {
  BUYER: "bg-blue-100 text-blue-800",
  SOURCING: "bg-green-100 text-green-800",
  MANUFACTURER: "bg-gray-100 text-gray-700",
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  DRAFT: "작성중",
  PENDING: "검토대기",
  CONFIRMED: "확정",
  IN_PRODUCTION: "생산중",
  COMPLETED: "완료",
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  PENDING: "bg-yellow-100 text-yellow-700",
  CONFIRMED: "bg-blue-100 text-blue-700",
  IN_PRODUCTION: "bg-purple-100 text-purple-700",
  COMPLETED: "bg-green-100 text-green-700",
};

// 각 상태에서 가능한 다음 전이 목록
export const STATUS_TRANSITIONS: Record<
  OrderStatus,
  { next: OrderStatus; label: string; requiredRole: UserRole }[]
> = {
  DRAFT: [
    {
      next: "PENDING",
      label: "검토 요청",
      requiredRole: "BUYER",
    },
  ],
  PENDING: [
    {
      next: "CONFIRMED",
      label: "확정",
      requiredRole: "SOURCING",
    },
  ],
  CONFIRMED: [
    {
      next: "IN_PRODUCTION",
      label: "생산 시작",
      requiredRole: "SOURCING",
    },
  ],
  IN_PRODUCTION: [
    {
      next: "COMPLETED",
      label: "완료 처리",
      requiredRole: "SOURCING",
    },
  ],
  COMPLETED: [],
};

export const CHANGEABLE_FIELD_LABELS: Record<string, string> = {
  productName: "상품명",
  quantity: "수량",
  unitPrice: "단가",
  dueDate: "납기일",
  specs: "사양",
};

// 변경요청 상태 라벨/색(카드·이력 타임라인 공통).
export const CR_STATUS_META: Record<
  ChangeRequestStatus,
  { label: string; color: string }
> = {
  PENDING: { label: "승인 대기", color: "bg-yellow-100 text-yellow-700" },
  APPROVED: { label: "승인됨", color: "bg-green-100 text-green-700" },
  REJECTED: { label: "반려됨", color: "bg-red-100 text-red-700" },
};

/**
 * 필드(+specs path)를 사람이 읽는 라벨로. specs 키 단위면 "사양.color" 처럼 표기.
 */
export function fieldLabel(field: string, path?: string | null): string {
  const base = CHANGEABLE_FIELD_LABELS[field] ?? field;
  return path ? `${base}.${path}` : base;
}
