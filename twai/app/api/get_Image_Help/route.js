import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request) {
  try {
    const body = await request.json()
    const { image, userInput, web, useRag, sessionId } = body

    if (!image || !userInput) {
      return NextResponse.json(
        { error: "Missing required fields: image and userInput" },
        { status: 400 }
      )
    }
    
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ failure: "not authenticated" }, { status: 401 });
    }

    // Get user info
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    // Get session and documents if sessionId provided
    let documents = [];
    if (sessionId) {
      const userSession = await prisma.session.findUnique({
        where: { userId: user.id, id: sessionId },
        select: { 
          documents: {
            select: { fileUrl: true, title: true }
          }
        },
      });
      
      if (userSession && userSession.documents) {
        documents = userSession.documents.map(doc => doc.fileUrl);
      }
    }

    let payload = {
      image: image,
      userInput: userInput,
      userId: user.id,
      web: web,
      useRag: useRag,
      documents: documents
    }
    
    // Call backend image analysis API
    const backendResponse = await fetch(`${process.env.BACKEND_URL}/help-with-image`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Backend-Secret": process.env.BACKEND_SECRET,
      },
      body: JSON.stringify(payload),
    })

    if (!backendResponse.ok) {
      throw new Error(`Backend responded with ${backendResponse.status}`)
    }

    // Stream the response from backend
    const encoder = new TextEncoder()
    const decoder = new TextDecoder()

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const reader = backendResponse.body?.getReader()
          if (!reader) {
            throw new Error("No reader available")
          }

          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            // Forward the chunk from backend to frontend
            controller.enqueue(value)
          }
        } catch (error) {
          console.error("Streaming error:", error)
          const errorResponse = JSON.stringify({
            result: "❌ Error processing image analysis. Please try again.",
            error: true
          })
          controller.enqueue(encoder.encode(errorResponse + "\n"))
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    })

  } catch (error) {
    console.error("Image help API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}