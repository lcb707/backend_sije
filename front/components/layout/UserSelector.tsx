'use client';

import { useUser } from '@/contexts/UserContext';
import { ROLE_COLORS, ROLE_LABELS, SEED_USERS } from '@/lib/constants';
import { Badge } from '@/components/ui/Badge';

export function UserSelector() {
  const { currentUser, setUser } = useUser();

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-500">접속 계정:</span>
      <div className="flex items-center gap-2">
        <select
          value={currentUser.username}
          onChange={(e) => setUser(e.target.value)}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm
                     focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
        >
          {SEED_USERS.map((u) => (
            <option key={u.username} value={u.username}>
              {u.username} ({u.displayName})
            </option>
          ))}
        </select>
        <Badge
          label={ROLE_LABELS[currentUser.role]}
          colorClass={ROLE_COLORS[currentUser.role]}
          size="sm"
        />
      </div>
    </div>
  );
}
