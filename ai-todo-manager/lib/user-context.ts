import { NextRequest } from 'next/server';

const DEFAULT_USER_ID = process.env.DEFAULT_USER_ID || 'demo-user';

export function getUserIdFromRequest(req: NextRequest): string {
  const headerUserId = req.headers.get('x-user-id');
  if (headerUserId && headerUserId.trim().length > 0) {
    return headerUserId.trim();
  }

  const cookieUserId = req.cookies.get('ai-todo-user-id')?.value;
  if (cookieUserId && cookieUserId.trim().length > 0) {
    return cookieUserId.trim();
  }

  const forwardedUser = req.headers.get('x-forwarded-user');
  if (forwardedUser && forwardedUser.trim().length > 0) {
    return forwardedUser.trim();
  }

  return DEFAULT_USER_ID;
}
