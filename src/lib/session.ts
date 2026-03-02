import { cookies } from 'next/headers';

export const SESSION_COOKIE_NAME = 'yvz_session';

export type SessionUser = {
  id: string;
  role: 'SUPERADMIN' | 'YONETICI' | 'SAKIN';
  apartmentId: string | null;
  fullName: string;
  phone: string;
};

export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(SESSION_COOKIE_NAME);
    if (!cookie?.value) return null;
    const decoded = Buffer.from(cookie.value, 'base64').toString('utf-8');
    return JSON.parse(decoded) as SessionUser;
  } catch {
    return null;
  }
}

export function encodeSession(user: SessionUser): string {
  return Buffer.from(JSON.stringify(user)).toString('base64');
}
