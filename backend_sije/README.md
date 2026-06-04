# 발주서 변경 승인 프로세스 (Purchase Order Change Approval)

의류 생산 발주서에 대해 주문자의 변경 요청 → 소싱팀 승인/반려 → 발주서 반영을 처리하고,
모든 변경에 대한 버전·시점 조회 및 버전 간 비교(감사 가능한 이력)를 제공하는 NestJS 백엔드.

## 기술 스택

NestJS 10 · TypeScript(strict) · TypeORM · MySQL 8(Docker) · class-validator · @nestjs/swagger · Jest

---

## 실행 방법

### 1) 사전 준비
- Docker / Docker Compose
- Node 20+ (로컬 실행·테스트 시)

### 2) 환경변수
```bash
cd backend_sije
make setting
```
```
# 애플리케이션
APP_PORT=3000

# 데이터베이스 (MySQL 8)
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=app
DB_PASSWORD=app_pw
DB_DATABASE=purchase_orders
DB_ROOT_PASSWORD=root_pw

# TypeORM: 개발/평가 편의. PROD-NOTE: 운영은 false + 마이그레이션 사용
DB_SYNCHRONIZE=true
DB_LOGGING=false

```

### 3) DB 기동 (MySQL 8)
```bash
cd backend_sije
make db
```

### 4) 앱 실행
```bash
cd backend_sije
make app
```

### 5) 프론트 실행
```bash
cd backend_sije
make frontend
```

### 6) 한번에 실행

> **1)번 진행 후 이것만 실행하면 환경 setting 과 서버 실행이 됨**

```bash
cd backend_sije
make all_setting_strat
```
- API 서버: `http://localhost:3001`
- Swagger 문서: `http://localhost:3000/api`


---

## API 명세

| 메서드 | 경로 | 역할 | 설명 |
|--------|------|------|------|
| POST | `/orders` | BUYER | 발주서 생성(DRAFT, 버전1 스냅샷) |
| GET | `/orders?limit=&offset=` | 누구나(로그인) | 발주서 목록(최신순) |
| GET | `/orders/:id` | 누구나(로그인) | 현재 상태 조회 |
| PATCH | `/orders/:id/status` | BUYER(제출)/SOURCING | 상태 전이 |
| POST | `/orders/:id/change-requests` | BUYER | 변경 요청 생성 |
| GET | `/orders/:id/change-requests?limit=&offset=` | 누구나(로그인) | 변경요청 목록 |
| POST | `/change-requests/:id/approve` | SOURCING | 변경 승인(반영+이력, 변경없음=422) |
| POST | `/change-requests/:id/reject` | SOURCING | 변경 반려 |
| GET | `/orders/:id/history?includeRejected=&includePending=&limit=&offset=` | 세 역할 공통 | 변경 이력(거절/대기 포함) |
| GET | `/orders/:id/versions/:version` | 세 역할 공통 | 특정 버전 상태 |
| GET | `/orders/:id/versions/:version/changes` | 세 역할 공통 | 특정 버전의 변경 델타 |
| GET | `/orders/:id/at?timestamp=` | 세 역할 공통 | 특정 시점 상태 |
| GET | `/orders/:id/diff?from=&to=` | 세 역할 공통 | 버전 간 비교 |

> 모든 엔드포인트는 인증(`X-User-Id`)이 필요하다. 조회는 세 역할 모두 허용(생산자=읽기 전용).
> 역할은 헤더가 아니라 서버(`users` 테이블)가 결정한다 — `X-User-Id` 는 주체(username)만 식별하며 역할은 위조할 수 없다.

### 공통 규칙

- **인증 헤더**: 모든 요청에 `X-User-Id: <username>` 필요(시드 계정: `buyer1`, `buyer2`, `sourcing1`, `sourcing2`, `maker1`). 헤더 없음/미등록 사용자 → `401`.
- **상태 라이프사이클**: `DRAFT → PENDING → CONFIRMED → IN_PRODUCTION → COMPLETED` (건너뛰기·역행 불가).
- **변경 가능 필드(`field`)**: `productName` · `quantity` · `unitPrice` · `dueDate` · `specs`.
- **`specs` 키**: 허용 마스터 테이블(`spec_keys`)에 정의된 키만 사용 가능(기본 시드: `color`, `size`, `material`). 미정의 키 → `422`.
- **페이지네이션**: `limit`(기본 20, 최대 100) · `offset`(기본 0).
- **시각**: 모든 시각은 UTC 기준 저장·조회. 시점 조회 구간은 `[valid_from, valid_to)` 반열림(시작 포함, 끝 미포함).
- **공통 에러**: `400` 입력 검증 실패 · `401` 미인증 · `403` 역할 위반 · `404` 리소스/버전 없음 · `409` 상태·규칙 위반 · `422` 실질 변경 없음/허용되지 않은 specs 키.

### API 명세 상세

#### `POST /orders` — 발주서 생성 (BUYER)
생성 시 `DRAFT` 상태로 시작하고 버전1 스냅샷과 상태 이력 시작 구간을 함께 만든다.

요청 본문:
```json
{
  "productName": "면 티셔츠",
  "quantity": 1000,
  "unitPrice": 5000,
  "specs": { "color": "white", "size": "L" },
  "dueDate": "2025-03-15"
}
```
검증: `productName`(비어있지 않은 문자열, ≤255) · `quantity`(양의 정수) · `unitPrice`(0 이상) · `dueDate`(`YYYY-MM-DD`) · `specs`(객체, 키는 마스터에 정의된 것만).
응답: `201` + 발주서 상태(아래 공통 응답 형태). 허용되지 않은 specs 키 → `422`.

#### `GET /orders?limit=&offset=` — 발주서 목록
응답: `200` + `{ "items": [발주서…], "total", "limit", "offset" }` (최신 생성순).

#### `GET /orders/:id` — 현재 상태 조회
응답: `200` + 발주서 상태. 없으면 `404`.

공통 발주서 응답 형태:
```json
{
  "id": 1, "productName": "면 티셔츠", "quantity": 1500, "unitPrice": 5000,
  "specs": { "color": "white", "size": "L" }, "dueDate": "2025-03-25",
  "status": "CONFIRMED", "currentVersion": 3, "createdBy": "buyer1",
  "createdAt": "…", "updatedAt": "…"
}
```

#### `PATCH /orders/:id/status` — 상태 전이 (BUYER 제출 / SOURCING 그 외)
권한: `DRAFT→PENDING`(제출)은 **BUYER**, 그 외 전이(확정·생산·완료)는 **SOURCING**.
요청 본문: `{ "status": "CONFIRMED" }`
동작: 상태만 바뀌면 새 버전(스냅샷)은 만들지 않고 `order_status_history` 에 `[valid_from, valid_to)` 구간으로 기록.
`COMPLETED` 전이 시 남은 `PENDING` 변경요청은 자동 반려.
응답: `200` + 발주서 상태. 허용되지 않은 전이 → `409`, 역할 위반 → `403`.

#### `POST /orders/:id/change-requests` — 변경 요청 생성 (BUYER)
조건: 발주서가 `CONFIRMED` 이상이고 `COMPLETED` 가 아님. 같은 발주서에 `PENDING` 변경요청이 없어야 함. 변경 항목 1개 이상.
요청 본문:
```json
{
  "reason": "고객사 추가 주문으로 수량 상향",
  "items": [
    { "field": "quantity", "newValue": 1500 },
    { "field": "dueDate", "newValue": "2025-03-25" },
    { "field": "specs", "path": "color", "newValue": "black" }
  ]
}
```
- `field=specs` 에서 `path` 를 주면 해당 사양 키 하나만 변경(나머지 보존), `path` 없이 주면 specs 객체 전체 교체.
- `path` 는 `specs` 필드에서만 허용(다른 필드에 지정 시 `400`).
- 변경요청의 specs 키는 **발주서에 이미 존재하는 키**여야 함(신규 키 추가 불가 → `422`).

응답: `201` + 변경요청(`status=PENDING`). 상태/중복 위반 → `409`, 항목 0개·타입 불일치 → `400`.

변경요청 응답 형태:
```json
{
  "id": 5, "orderId": 1, "reason": "…", "status": "APPROVED",
  "requestedBy": "buyer1", "reviewedBy": "sourcing1", "reviewComment": "재고 확인 완료",
  "resultingVersion": 2,
  "items": [ { "field": "quantity", "path": null, "newValue": 1500 } ],
  "createdAt": "…", "reviewedAt": "…"
}
```

#### `GET /orders/:id/change-requests?limit=&offset=` — 변경요청 목록
응답: `200` + 페이지네이션 형태(최신순, 항목 포함).

#### `POST /change-requests/:id/approve` — 승인 (SOURCING)
요청 본문: `{ "reviewComment": "재고 확인 완료, 승인합니다." }` (검토 의견 필수)
동작: **발주서 업데이트 + 새 버전 스냅샷 + 변경 델타 저장을 단일 트랜잭션**으로. 실패 시 전부 롤백.
응답: `200` + 변경요청(`status=APPROVED`, `resultingVersion`).
- `PENDING` 이 아닌 변경요청 → `409`
- 모든 항목이 기존값과 동일(실질 변경 없음) → `422`(빈 버전 생성 안 함)
- 완료된 발주서 대상 → `409`

#### `POST /change-requests/:id/reject` — 반려 (SOURCING)
요청 본문: `{ "reviewComment": "납기 일정상 반려합니다." }`
동작: 변경요청만 `REJECTED` 로 갱신. 발주서·버전·스냅샷·델타는 불변.
응답: `200` + 변경요청(`status=REJECTED`). `PENDING` 이 아니면 `409`.

#### `GET /orders/:id/history?includeRejected=&includePending=&limit=&offset=` — 변경 이력
승인되어 버전이 생긴 변경(`kind=VERSION`)을 시간순으로 반환. 옵션으로 미반영 변경요청(`kind=CHANGE_REQUEST`) 포함.
- `includeRejected=true`: 반려된 변경요청도 포함
- `includePending=true`: 대기 중 변경요청도 포함
응답: `200` + 페이지네이션 형태. `VERSION` 항목은 전체 상태(`state`)와 델타(`changes`)를, 변경요청 항목은 그 시점 발주서값 기준 `oldValue`/`state` 를 채운다.

#### `GET /orders/:id/versions/:version` — 특정 버전 상태
응답: `200` + 해당 버전의 전체 상태(스냅샷, `validFrom`/`validTo` 포함). 없는 버전 → `404`.

#### `GET /orders/:id/versions/:version/changes` — 특정 버전의 변경 델타
응답: `200` + `{ "version", "changes": [ { field, path, oldValue, newValue, reason } … ] }`. 버전1(생성)은 빈 배열.

#### `GET /orders/:id/at?timestamp=` — 특정 시점 상태
`timestamp` 는 ISO 8601(UTC 권장, 예 `2025-02-16T00:00:00.000Z`).
구간은 `[valid_from, valid_to)` 반열림 — `valid_from` 과 정확히 같은 시각은 그 버전에 포함. status 는 `order_status_history` 로 보정.
응답: `200` + 그 시점 상태. 최초 생성 이전 시점 → `404`.

#### `GET /orders/:id/diff?from=&to=` — 버전 간 비교
응답: `200` + `{ "fromVersion", "toVersion", "differences": [ { field, path, from, to } … ] }`.
달라진 필드만 반환(같으면 빈 배열). `specs` 는 키 단위로 비교. 없는 버전 → `404`.

---

## 테스트 실행

테스트는 운영과 동일한 MySQL 의 별도 스키마(`purchase_orders_test`)를 사용한다.

### 테스트 DB 준비 (최초 1회) 
```bash
docker compose up -d db
docker exec backend_sije-db-1 mysql -uroot -proot_pw -e \
  "CREATE DATABASE IF NOT EXISTS purchase_orders_test CHARACTER SET utf8mb4; \
   GRANT ALL PRIVILEGES ON purchase_orders_test.* TO 'app'@'%'; FLUSH PRIVILEGES;"
```
> 5) 한번에 실행을 했으면 안하고 바로 테스트 실행해도 됨됨.
> 컨테이너 이름이 다르면 `backend_sije-db-1` 을 실제 이름으로 바꾼다(`docker compose ps`).

### 실행
```bash
make test_go
```

### 커버하는 시나리오

테스트 스위트 8개 / 57개 케이스. 시간 의존 로직은 `FakeClock` 으로 시각을 고정해 결정론적으로 검증한다.

**변경 저장 (`change-history.e2e-spec.ts`)**
- 승인 시 스냅샷 + 델타 저장
- 한 변경요청의 여러 필드 변경이 하나의 버전(v2)으로 저장
- 값이 실제로 바뀐 필드만 델타로 기록(동일 값 항목은 제외)
- `specs` 변경이 diff 에 키 단위로 반영

**이력 조회 (`history-query.e2e-spec.ts`)**
- 특정 버전(v1) 조회는 그 시점 값을 반환
- 특정 시점 조회: `2025-02-16` → v2(1500) 반환
- 경계 시각: `valid_from` 과 정확히 같은 시각은 그 버전에 포함(`[from, to)` 반열림)
- 존재하지 않는 버전 조회 → `404`
- 최초 `valid_from` 이전 시점 조회 → `404`

**비교 (`change-history.e2e-spec.ts`)**
- 버전 간 diff 정확성(`specs` 키 단위 포함)
- 동일 버전 비교는 빈 차이 반환

**비즈니스 규칙 위반 (`business-rules.e2e-spec.ts`)**
- BUYER 외 역할의 변경요청 생성 → `403`
- `CONFIRMED` 미만(DRAFT)에서 변경요청 → `409`
- `PENDING` 변경요청이 있으면 신규 생성 → `409`
- SOURCING 외 역할의 승인 → `403`
- 이미 처리된(비-PENDING) 변경요청 재승인 → `409`
- 변경 항목 0개 → `400`
- 반려 시 발주서·버전 불변
- 잘못된 상태 전이(DRAFT→CONFIRMED 직행) → `409`
- 목록 조회 최신순 정렬 + limit/offset 페이지네이션

**개선·세부 규칙 (`improvements.e2e-spec.ts`)**
- 실질 변경 없는 승인(모든 항목 동일) → `422`, 버전 유지
- 특정 버전의 변경 델타 조회 / `includeRejected`·`includePending` 로 미반영 변경요청 이력 포함
- `COMPLETED` 전이 시 미결 PENDING 자동 반려, 이후 승인 → `409`
- `COMPLETED` 발주서에 변경요청 생성 → `409`
- `specs.color` 만 변경 시 다른 키(size) 보존 / path 변경의 diff 는 키 단위 표시
- `path` 는 specs 필드에서만 허용(quantity 에 지정 시 `400`) / path 있으면 값은 스칼라여야 함(객체 주면 `400`)
- 발주서에 없는 specs 키를 변경요청 → `422`
- 허용 마스터에 없는 specs 키로 발주서 생성 → `422` / 정의된 키(material)는 생성 허용
- 생산중 변경요청 승인은 상태를 `IN_PRODUCTION` 으로 유지하고 승인 시점을 상태 이력에 기록
- 상태 전이 후 과거 시점 조회 status 가 그 시점 실제 상태와 일치
- 미반영 변경요청 이력은 그 시점 발주서값으로 `oldValue`/`state` 를 채움

**인증·인가 (`auth.e2e-spec.ts`)**
- `X-User-Id` 헤더 없음 / 미등록 사용자 → `401`
- BUYER 가 승인(SOURCING 전용) 시도 → `403` / MANUFACTURER 가 발주서 생성(BUYER 전용) 시도 → `403`
- MANUFACTURER 도 조회는 가능(읽기 전용)
- 역할은 DB가 결정(헤더 위조 불가) / 요청자·검토자가 실제 로그인 계정으로 기록

**통합 플로우 (`full-flow.e2e-spec.ts`)**
- 생성 → 확정 → 승인 2회 → 버전/시점/비교/이력 조회가 일관되게 동작

---

