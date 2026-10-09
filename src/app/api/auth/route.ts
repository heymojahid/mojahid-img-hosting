import { NextRequest, NextResponse } from 'next/server';
import { APP_DEFAULT_PASSWORD } from '@/lib/constants';

function getExpectedPassword(): string {
  return process.env.APP_PASSWORD?.trim() || APP_DEFAULT_PASSWORD;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const password = body?.password?.toString().trim();
    const expectedPassword = getExpectedPassword();

    if (!password || password !== expectedPassword) {
      return NextResponse.json(
        {
          success: false,
          error: 'Incorrect password. Access denied.',
        },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
      message: 'Authenticated successfully.',
    });

    // Set cookie valid for 30 days
    response.cookies.set('mojahidx_auth', 'authorized', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid request';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const authCookie = req.cookies.get('mojahidx_auth')?.value;
  const authHeader = req.headers.get('x-app-password');
  const expectedPassword = getExpectedPassword();

  const isAuthenticated =
    authCookie === 'authorized' || authHeader === expectedPassword;

  return NextResponse.json({
    authenticated: isAuthenticated,
  });
}

export async function DELETE(): Promise<NextResponse> {
  const response = NextResponse.json({
    success: true,
    message: 'Logged out successfully.',
  });

  response.cookies.delete('mojahidx_auth');
  return response;
}
