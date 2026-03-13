import { prisma } from "@/lib/prisma";
import { NextResponse } from 'next/server';



export async function POST(request) {
  try {
    const { email } = await request.json();
    
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Please provide a valid email address' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingEmail = await prisma.waitlistEmail.findUnique({
      where: { email },
    });

    if (existingEmail) {
      return NextResponse.json(
        { success: true, message: 'Email already registered' },
        { status: 200 }
      );
    }

    // Save email to database
    await prisma.waitlistEmail.create({
      data: { email },
    });

    return NextResponse.json(
      { success: true, message: 'Email added to waitlist' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Waitlist API error:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
