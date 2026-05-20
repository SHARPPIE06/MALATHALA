import { NextResponse } from 'next/server';
import { verifyUserEmail } from '@/lib/db';

export async function POST(request) {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json(
        { error: 'Email and verification code are required.' },
        { status: 400 }
      );
    }

    const result = await verifyUserEmail(email, code);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: 'Email successfully verified! Your account is now pending administrator approval.'
    });

  } catch (error) {
    console.error('Email verification API error:', error);
    return NextResponse.json(
      { error: 'An error occurred during verification. Please try again.' },
      { status: 500 }
    );
  }
}
