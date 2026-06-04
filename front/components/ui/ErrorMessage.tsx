import { ApiError } from '@/lib/api';

interface ErrorMessageProps {
  error: unknown;
}

const STATUS_HINTS: Record<number, string> = {
  401: '로그인이 필요합니다 (등록되지 않은 사용자).',
  403: '이 작업은 현재 역할에서 수행할 수 없습니다.',
  404: '리소스를 찾을 수 없습니다.',
  409: '비즈니스 규칙 위반 — 현재 상태에서 허용되지 않는 작업입니다.',
  400: '입력값을 확인하세요.',
};

export function ErrorMessage({ error }: ErrorMessageProps) {
  if (!error) return null;

  if (error instanceof ApiError) {
    const hint = STATUS_HINTS[error.status];
    return (
      <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 space-y-1">
        <p className="font-semibold">
          오류 {error.status}: {error.message}
        </p>
        {hint && <p className="text-red-600">{hint}</p>}
      </div>
    );
  }

  return (
    <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
      예상치 못한 오류가 발생했습니다.
    </div>
  );
}
