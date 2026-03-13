import { getServerSession } from "next-auth/next"
import { NextResponse } from "next/server"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const body = await request.json()
    const { preparationId, count = 5 } = body

    if (!preparationId) {
      return NextResponse.json({ error: "Preparation ID is required" }, { status: 400 })
    }

    // Get the user's email from the session
    const userEmail = session.user.email

    // Get the user record
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Find the preparation hub and verify it belongs to the user
    const preparationHub = await prisma.preparationHub.findFirst({
      where: {
        id: preparationId,
        userId: user.id,
      },
      select: {
        id: true,
        name: true,
        additionalDetails: true,
        questionsAndAnswers: true,
        meetingTemplate: {
          select:{
            purpose:true,
            goal:true,
            additionalInfo:true,
          },
        },
        document:{
          select:{
            awsFileUrl:true
          }
        }
      },
    })

    if (!preparationHub) {
      return NextResponse.json({ error: "Preparation hub not found or access denied" }, { status: 404 })
    }

    // Call the backend API to generate questions
    const requestData = {
      preparationId: preparationHub.id,
      userId: user.id,
      meetingTemplate: preparationHub.meetingTemplate,
      additionalDetails: preparationHub.additionalDetails,
      documentUrl: preparationHub.document?.awsFileUrl || null,
      count: count
    }
    
    console.log('🔍 Sending request to backend:', {
      url: `${process.env.BACKEND_URL}/generate-questions`,
      data: requestData
    })
    
    try {
      const backendResponse = await fetch(`${process.env.BACKEND_URL}/generate-questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Backend-Secret': process.env.BACKEND_SECRET 
        },
        body: JSON.stringify(requestData),
      })

      if (!backendResponse.ok) {
        const errorText = await backendResponse.text()
        console.error('Backend API Error:', {
          status: backendResponse.status,
          statusText: backendResponse.statusText,
          error: errorText,
          url: `${process.env.BACKEND_URL}/generate-questions`
        })
        throw new Error(`Backend API failed: ${backendResponse.status} ${backendResponse.statusText} - ${errorText}`)
      }

      const generatedQuestions = await backendResponse.json()
      
      // Update the preparation hub with the generated questions
      const updatedPreparationHub = await prisma.preparationHub.update({
        where: {
          id: preparationId,
        },
        data: {
          questionsAndAnswers: generatedQuestions,
        },
      })

      return NextResponse.json({
        success: true,
        questions: generatedQuestions,
        preparationHub: updatedPreparationHub,
      })
    } catch (backendError) {
      console.error('Backend API error:', backendError)
      throw new Error('Failed to generate questions from backend')
    }
  } catch (error) {
    console.error("Error generating questions:", error)
    return NextResponse.json({ error: "Failed to generate questions" }, { status: 500 })
  }
}
