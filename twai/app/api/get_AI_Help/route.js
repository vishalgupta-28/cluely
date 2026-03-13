import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authOptions } from "../auth/[...nextauth]/route";
import { getServerSession } from "next-auth";


export const maxDuration = 300;
export const dynamic = 'force-dynamic';
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ failure: "not authenticated" }, { status: 401 });
    }

    const { conversation, use_web, requestType = "help", useHighlightedText, copiedText, sessionId,useRag } = await req.json();
    
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ failure: "User not found" }, { status: 404 });
    }

    const Session = await prisma.session.findUnique({
      where: { userId: user.id, id: sessionId },
      select: { templateId: true, conversation:true, isActive: true , documents: true },
    });

    if (!Session) {
      return NextResponse.json({ failure: "Session not found" }, { status: 404 });
    }
    
    // Check if the session is active
    if (!Session.isActive) {
      return NextResponse.json({ failure: "This session is no longer active. Please create a new session." }, { status: 403 });
    }

    let template = {};
    if (Session.templateId) {
      template = await prisma.meetingTemplate.findUnique({
        where: { id: Session.templateId },
        select: {
          purpose: true,
          goal: true,
          additionalInfo: true,
          duration: true,
          documents: {
            select: { fileUrl: true, title: true },
          },
        },
      });
    }

    let payload = {
      raw_conversation: conversation,
      use_web: use_web ?? true,
      userId: user.id,
      useHighlightedText,
      highlightedText: copiedText,
      meetingTemplate: JSON.stringify(template),
      useRag:useRag,
      documents: Session.documents.map(doc => doc.fileUrl)
    };

    const endpoints = {
      factcheck: "/process-ai-factcheck",
      summary: "/process-ai-summary",
      help: "/process-ai-help",
      fiveyearold: "/explain-like-5-year-old",
      createactionplan: "/create-action-plan",
    };

    const response = await fetch(`${process.env.BACKEND_URL}${endpoints[requestType]}`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "BACKEND-SECRET": process.env.BACKEND_SECRET 
      },
      body: JSON.stringify(payload),
    });

    if (!response.body) {
        return NextResponse.json({ error: 'No response body' }, { status: 500 });
    }
  
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
        async start(controller) {
            const reader = response.body.getReader();
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                controller.enqueue(value);
            }
            controller.close();
        }
    });
  
    return new NextResponse(readableStream, {
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
        },
    });
  } catch (error) {
    console.error("BACKEND API error:", error);
    return NextResponse.json({ failure: "An error occurred while processing the request." }, { status: 500 });
  }
}
