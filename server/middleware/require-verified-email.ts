import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth';
import { db } from '../db';
import { users } from '../../shared/schema';
import { eq } from 'drizzle-orm';

export async function requireVerifiedEmail() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return NextResponse.json(
      { error: 'You must be signed in to access this resource' },
      { status: 401 }
    );
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, session.user.email))
    .limit(1);

  if (!user) {
    return NextResponse.json(
      { error: 'User not found' },
      { status: 404 }
    );
  }

  if (!user.isVerified) {
    return NextResponse.json(
      { 
        error: 'Please verify your email address before accessing this resource',
        code: 'EMAIL_NOT_VERIFIED'
      },
      { status: 403 }
    );
  }

  return null; // Return null if verification passes
}
