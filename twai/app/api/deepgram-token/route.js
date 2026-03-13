import { NextResponse } from 'next/server';
import { createClient } from '@deepgram/sdk';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";


export async function POST(request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get request data
    const { sessionId, keyType } = await request.json();
    
    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 });
    }

    if (!keyType || !['microphone', 'capturescreen'].includes(keyType)) {
      return NextResponse.json({ error: "Valid keyType (microphone or capturescreen) is required" }, { status: 400 });
    }

    // Get user from database with their API keys
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { 
        id: true, 
        email: true, 
        microphoneDeepgramKey: true, 
        capturescreenDeepgramKey: true 
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if session exists and belongs to user
    const dbSession = await prisma.session.findUnique({
      where: {
        id: sessionId,
        userId: user.id,
      },
    });

    if (!dbSession) {
      return NextResponse.json({ error: "Session not found or not authorized" }, { status: 404 });
    }

    // Check if there's already a key for the requested type at the user level
    const keyFieldName = keyType === 'microphone' ? 'microphoneDeepgramKey' : 'capturescreenDeepgramKey';
    
    if (user[keyFieldName]) {
      // Return existing key from user record
      return NextResponse.json({ token: user[keyFieldName] });
    }

    // Generate new key
    const apiKey = process.env.DEEPGRAM_API_KEY;
    const projectId = process.env.DEEPGRAM_PROJECT_ID;

    if (!apiKey) {
      console.error('DEEPGRAM_API_KEY environment variable not set.');
      return NextResponse.json(
        { error: 'Server configuration error: API Key missing.' },
        { status: 500 }
      );
    }
    if (!projectId) {
      console.error('DEEPGRAM_PROJECT_ID environment variable not set.');
      return NextResponse.json(
        { error: 'Server configuration error: Project ID missing.' },
        { status: 500 }
      );
    }
    console.log(apiKey)

    const deepgram = createClient(apiKey);

    console.log(projectId)

    const { result: apiKeyResult, error: keyError } = await deepgram.manage.createProjectKey(
      projectId,
      {
        comment: `${keyType}-key-${user.email}`,
        scopes: ['usage:write'],
      }
    );

    if (keyError) {
        console.error('Deepgram key creation error:', keyError);
        return NextResponse.json(
          { error: 'Failed to create Deepgram key', details: keyError.message || keyError },
          { status: 500 }
        );
    }

    if (!apiKeyResult) {
        console.error('Deepgram key creation did not return a key.');
        return NextResponse.json(
          { error: 'Failed to obtain key from Deepgram response' },
          { status: 500 }
        );
    }

    // Save the key to the user table instead of the session
    await prisma.user.update({
      where: { id: user.id },
      data: { [keyFieldName]: apiKeyResult },
    });

    return NextResponse.json({ token: apiKeyResult });

  } catch (error) {
    console.error('Error in /api/deepgram-token route:', error);

    if (error && error.__dgError) {
       return NextResponse.json(
         { error: 'Deepgram API error', details: error.message || error },
         { status: error.status || 500 }
       );
    }

    return NextResponse.json(
      { error: 'Internal server error generating token' },
      { status: 500 }
    );
  }
}