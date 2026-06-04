import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = '', id, ...props }: InputProps) {
  const inputId = id ?? label;
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <input
        id={inputId}
        {...props}
        className={`
          rounded-md border px-3 py-2 text-sm outline-none transition
          border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500
          disabled:bg-gray-50 disabled:text-gray-400
          ${error ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : ''}
          ${className}
        `}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
