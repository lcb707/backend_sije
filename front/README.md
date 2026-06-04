# 발주서 변경 승인 — 테스트 프론트엔드

`backend_sije` 백엔드의 모든 API를 화면에서 직접 조작·확인하는 **개발·테스트 전용 UI**.
설계 배경은 [`../backend_sije/docs/FRONTEND_PLAN.md`](../backend_sije/docs/FRONTEND_PLAN.md) 참조.

## 기술 스택
Next.js 16 (App Router) · TypeScript(strict) · Tailwind CSS · React Context

## 핵심: 역할 전환
상단 드롭다운에서 시드 계정(`buyer1/buyer2/sourcing1/sourcing2/maker1`)을 고르면,
이후 모든 요청의 `X-User-Id` 헤더가 바뀐다. **역할은 백엔드가 DB에서 결정**한다.

## 화면
- `/` — 발주서 목록 (BUYER만 생성 버튼)
- `/orders/new` — 발주서 생성
- `/orders/[id]` — 상세 + 상태 전이 + 변경요청 생성/승인/반려
- `/orders/[id]/history` — 이력 조회 4탭(전체 이력 / 버전 / 시점 / 비교)

## 로컬 실행
```bash
cp .env.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:3000
npm install
npm run dev -- -p 3001       # 백엔드가 3000 을 쓰므로 프론트는 3001 권장
```

## Docker 실행 (백엔드와 함께)
백엔드 `docker-compose.yml` 에 `frontend` 서비스가 포함되어 있다.
```bash
cd ../backend_sije
docker compose up -d --build
# 프론트: http://localhost:3001   백엔드: http://localhost:3000
```

## 주의: NEXT_PUBLIC_API_URL
브라우저(클라이언트)가 직접 호출하는 주소이므로 **호스트에서 접근 가능한 주소**여야 한다
(컨테이너 내부 주소 `app:3000` 이 아니라 `http://localhost:3000`). 이 값은 **빌드 타임**에
번들에 박히므로 Docker 빌드 시 `build args` 로 주입된다(`Dockerfile` 의 `ARG NEXT_PUBLIC_API_URL`).
