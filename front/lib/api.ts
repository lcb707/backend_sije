import { DEFAULT_USERNAME, USER_STORAGE_KEY } from "./constants";
import type {
  ChangeRequest,
  DiffResponse,
  HistoryEntry,
  Order,
  OrderStatus,
  Paginated,
  SnapshotState,
  VersionChangeLog,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

// limit/offset 을 쿼리스트링으로(미지정 키는 생략). 백엔드 기본 limit=20, offset=0.
function pageQuery(opts: { limit?: number; offset?: number }): string {
  const qs = new URLSearchParams();
  if (opts.limit !== undefined) qs.set("limit", String(opts.limit));
  if (opts.offset !== undefined) qs.set("offset", String(opts.offset));
  return qs.toString();
}

// 현재 사용자의 username 을 localStorage 에서 직접 읽는다.
// (전역 주입 슬롯 방식은 첫 렌더에서 useEffect 실행 순서 때문에 헤더가 누락될 수 있어 폐기)
function getCurrentUsername(): string {
  if (typeof window === "undefined") return DEFAULT_USERNAME;
  return localStorage.getItem(USER_STORAGE_KEY) ?? DEFAULT_USERNAME;
}

// ── 공통 fetch 래퍼 ────────────────────────────────────────────────
async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const username = getCurrentUsername();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-User-Id": username,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new ApiError(
      res.status,
      body.message ?? `HTTP ${res.status}`,
      body.error,
    );
    throw err;
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly error?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ── 발주서 ──────────────────────────────────────────────────────────
export const ordersApi = {
  list: (opts: { limit?: number; offset?: number } = {}) => {
    const qs = pageQuery(opts);
    return apiFetch<Paginated<Order>>(`/orders${qs ? `?${qs}` : ""}`);
  },

  get: (id: number) => apiFetch<Order>(`/orders/${id}`),

  create: (body: {
    productName: string;
    quantity: number;
    unitPrice: number;
    specs: Record<string, string | number>;
    dueDate: string;
  }) =>
    apiFetch<Order>("/orders", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateStatus: (id: number, status: OrderStatus) =>
    apiFetch<Order>(`/orders/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
};

// ── 변경 요청 ────────────────────────────────────────────────────────
export const changeRequestsApi = {
  list: (orderId: number, opts: { limit?: number; offset?: number } = {}) => {
    const qs = pageQuery(opts);
    return apiFetch<Paginated<ChangeRequest>>(
      `/orders/${orderId}/change-requests${qs ? `?${qs}` : ""}`,
    );
  },

  create: (
    orderId: number,
    body: {
      reason: string;
      items: { field: string; path?: string; newValue: unknown }[];
    },
  ) =>
    apiFetch<ChangeRequest>(`/orders/${orderId}/change-requests`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  approve: (id: number, reviewComment: string) =>
    apiFetch<ChangeRequest>(`/change-requests/${id}/approve`, {
      method: "POST",
      body: JSON.stringify({ reviewComment }),
    }),

  reject: (id: number, reviewComment: string) =>
    apiFetch<ChangeRequest>(`/change-requests/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ reviewComment }),
    }),
};

// ── 이력 ─────────────────────────────────────────────────────────────
export const historyApi = {
  list: (
    orderId: number,
    opts: {
      includeRejected?: boolean;
      includePending?: boolean;
      limit?: number;
      offset?: number;
    } = {},
  ) => {
    const qs = new URLSearchParams();
    if (opts.includeRejected) qs.set("includeRejected", "true");
    if (opts.includePending) qs.set("includePending", "true");
    if (opts.limit !== undefined) qs.set("limit", String(opts.limit));
    if (opts.offset !== undefined) qs.set("offset", String(opts.offset));
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return apiFetch<Paginated<HistoryEntry>>(
      `/orders/${orderId}/history${suffix}`,
    );
  },

  getVersion: (orderId: number, version: number) =>
    apiFetch<SnapshotState>(`/orders/${orderId}/versions/${version}`),

  getVersionChanges: (orderId: number, version: number) =>
    apiFetch<VersionChangeLog>(
      `/orders/${orderId}/versions/${version}/changes`,
    ),

  getAt: (orderId: number, timestamp: string) =>
    apiFetch<SnapshotState>(
      `/orders/${orderId}/at?timestamp=${encodeURIComponent(timestamp)}`,
    ),

  diff: (orderId: number, from: number, to: number) =>
    apiFetch<DiffResponse>(`/orders/${orderId}/diff?from=${from}&to=${to}`),
};
