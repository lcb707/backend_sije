// 백엔드 DTO 미러링. 백엔드 엔티티가 바뀌면 함께 업데이트한다.

export type OrderStatus =
  | "DRAFT"
  | "PENDING"
  | "CONFIRMED"
  | "IN_PRODUCTION"
  | "COMPLETED";

export type ChangeRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

export type UserRole = "BUYER" | "SOURCING" | "MANUFACTURER";

export type ChangeableField =
  | "productName"
  | "quantity"
  | "unitPrice"
  | "specs"
  | "dueDate";

export interface OrderSpecs {
  [key: string]: string | number;
}

// ── 발주서 ──
export interface Order {
  id: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  specs: OrderSpecs;
  dueDate: string;
  status: OrderStatus;
  currentVersion: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ── 변경 요청 ──
export interface ChangeRequestItem {
  field: ChangeableField;
  // specs 의 특정 키만 변경할 때 그 키(예: 'color'). 그 외엔 null.
  path: string | null;
  newValue: string | number | OrderSpecs;
}

export interface ChangeRequest {
  id: number;
  orderId: number;
  reason: string;
  status: ChangeRequestStatus;
  requestedBy: string;
  reviewedBy: string | null;
  reviewComment: string | null;
  resultingVersion: number | null;
  items: ChangeRequestItem[];
  createdAt: string;
  reviewedAt: string | null;
}

// ── 이력 ──
export interface ChangeLog {
  field: ChangeableField;
  // specs 의 특정 키만 바뀐 경우 그 키. 아니면 null.
  path: string | null;
  // 미반영 변경요청 항목/신규 사양 키는 이전값이 없어 null.
  oldValue: string | number | OrderSpecs | null;
  newValue: string | number | OrderSpecs;
  reason: string;
}

// 이력 항목 종류: 승인되어 버전이 생긴 변경(VERSION) vs 미반영 변경요청(CHANGE_REQUEST).
export type HistoryEntryKind = "VERSION" | "CHANGE_REQUEST";

export interface HistoryEntry {
  kind: HistoryEntryKind;
  // VERSION 항목의 버전. CHANGE_REQUEST 항목은 null.
  version: number | null;
  // 발생 시각(버전=validFrom, 변경요청=생성/검토 시각).
  occurredAt: string;
  // VERSION 항목의 전체 상태. CHANGE_REQUEST 항목은 null.
  state: SnapshotState | null;
  changes: ChangeLog[];
  changeRequestId: number | null;
  changeRequestStatus: ChangeRequestStatus | null;
}

// 특정 버전의 변경 델타 응답.
export interface VersionChangeLog {
  version: number;
  changes: ChangeLog[];
}

export interface SnapshotState {
  orderId: number;
  version: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  specs: OrderSpecs;
  dueDate: string;
  status: OrderStatus;
  validFrom: string;
  validTo: string | null;
}

export interface DiffEntry {
  field: ChangeableField;
  // specs 의 특정 키가 달라진 경우 그 키. 아니면 null.
  path: string | null;
  from: string | number | OrderSpecs | null;
  to: string | number | OrderSpecs | null;
}

export interface DiffResponse {
  fromVersion: number;
  toVersion: number;
  differences: DiffEntry[];
}

// ── 페이지네이션 봉투 ──
// 목록 응답(/orders, /history, /change-requests)은 이 형태로 감싸여 온다.
export interface Paginated<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

// ── API 에러 ──
export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}
