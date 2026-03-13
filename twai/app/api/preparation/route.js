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
    const { name, meetingTemplateId, additionalDetails, documentId } = body

    if (!name || !meetingTemplateId) {
      return NextResponse.json({ error: "Name and meeting template are required" }, { status: 400 })
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

    // Create the preparation hub
    const preparationHub = await prisma.preparationHub.create({
      data: {
        name,
        userId: user.id,
        meetingTemplateId,
        documentId: documentId || null, // Optional document association
        additionalDetails: additionalDetails || null,
        questionsAndAnswers: [], // Start with empty array
      },
    })

    return NextResponse.json(preparationHub)
  } catch (error) {
    console.error("Error creating preparation hub:", error)
    return NextResponse.json({ error: "Failed to create preparation hub" }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const url = new URL(request.url)
    const id = url.searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Preparation hub ID is required" }, { status: 400 })
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

    // Check if the preparation hub exists and belongs to the user
    const preparationHub = await prisma.preparationHub.findFirst({
      where: {
        id: id,
        userId: user.id,
      },
    })

    if (!preparationHub) {
      return NextResponse.json({ error: "Preparation hub not found or access denied" }, { status: 404 })
    }

    // Delete the preparation hub
    await prisma.preparationHub.delete({
      where: {
        id: id,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting preparation hub:", error)
    return NextResponse.json({ error: "Failed to delete preparation hub" }, { status: 500 })
  }
}

export async function PUT(request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const url = new URL(request.url)
    const id = url.searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Preparation hub ID is required" }, { status: 400 })
    }

    const body = await request.json()
    const { name, meetingTemplateId, documentId, additionalDetails } = body

    if (!name || !meetingTemplateId) {
      return NextResponse.json({ error: "Name and meeting template are required" }, { status: 400 })
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

    // Check if the preparation hub exists and belongs to the user
    const existingPrep = await prisma.preparationHub.findFirst({
      where: {
        id: id,
        userId: user.id,
      },
    })

    if (!existingPrep) {
      return NextResponse.json({ error: "Preparation hub not found or access denied" }, { status: 404 })
    }

    // Update the preparation hub
    const updatedPreparation = await prisma.preparationHub.update({
      where: {
        id: id,
      },
      data: {
        name,
        meetingTemplateId,
        documentId: documentId || null,
        additionalDetails: additionalDetails || null,
      },
      include: {
        meetingTemplate: {
          select: {
            purpose: true,
            goal: true,
          }
        },
        document: true
      }
    })

    // Add questionsCount to match the expected format
    const responseData = {
      ...updatedPreparation,
      questionsCount: Array.isArray(updatedPreparation.questionsAndAnswers) ? updatedPreparation.questionsAndAnswers.length : 0
    }

    return NextResponse.json(responseData)
  } catch (error) {
    console.error("Error updating preparation hub:", error)
    return NextResponse.json({ error: "Failed to update preparation hub" }, { status: 500 })
  }
}
