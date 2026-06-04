'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  SEED_USERS,
  USER_STORAGE_KEY,
  type SeedUser,
} from '@/lib/constants';

interface UserContextValue {
  currentUser: SeedUser;
  setUser: (username: string) => void;
}

const UserContext = createContext<UserContextValue | null>(null);

const DEFAULT_USER = SEED_USERS[0]; // buyer1

export function UserProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<SeedUser>(DEFAULT_USER);

  // 새로고침 후에도 선택 유지. localStorage 가 비어 있으면 기본값(buyer1)을 써둔다.
  // (api.ts 가 같은 키를 읽으므로 첫 요청부터 X-User-Id 가 일관되게 실린다)
  useEffect(() => {
    const saved = localStorage.getItem(USER_STORAGE_KEY);
    if (saved) {
      const found = SEED_USERS.find((u) => u.username === saved);
      if (found) {
        setCurrentUser(found);
        return;
      }
    }
    localStorage.setItem(USER_STORAGE_KEY, DEFAULT_USER.username);
  }, []);

  const setUser = (username: string) => {
    const found = SEED_USERS.find((u) => u.username === username);
    if (!found) return;
    setCurrentUser(found);
    localStorage.setItem(USER_STORAGE_KEY, username);
  };

  return (
    <UserContext.Provider value={{ currentUser, setUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within UserProvider');
  return ctx;
}
