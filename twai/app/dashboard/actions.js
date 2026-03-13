"use server"
import { PrismaClient } from "@prisma/client"
import { authOptions } from "../../app/api/auth/[...nextauth]/route"
import { getServerSession } from "next-auth"
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3"
const prisma = new PrismaClient()

const s3 = new S3Client({
  region: process.env.AWS_S3_BUCKET_REGION,
  credentials: {
    accessKeyId: process.env.AWS_S3_ACCESS_KEY,
    secretAccessKey: process.env.AWS_S3_SECRET_KEY,
  },
})

export async function getUserDetails() {
  const session = await getServerSession(authOptions)

  if (!session) {
    return { failure: "not authenticated" }
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      name: true,
      email: true,
      sessions: {
        where: {
          isDeleted: false, // Only return non-deleted sessions
        },
        select: {
          id: true,
          name: true,
          description: true,
          conversation: true,
          createdAt: true,
          summary: true,
          templateId: true,
          isActive: true,
        },
      },
      documents: {
        select: {
          id: true,
          fileUrl: true,
          uploadedAt: true,
          title: true,
          description: true,
          isEmbedded: true,
        },
      },
      meetingTemplates: {
        select: {
          id: true,
          purpose: true,
          goal: true,
          additionalInfo: true,
          duration: true,
          createdAt: true,
          documents: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      },
    },
  })

  if (!user) {
    return { failure: "User not found" }
  }

  return { user }
}

export async function getAgentStore() {
  try {
    const agents = await prisma.agentStore.findMany({
      orderBy: {
        createdAt: "desc",
      },
    })

    return { agents }
  } catch (error) {
    console.error("Error fetching agent store:", error)
    return { failure: "Failed to fetch agent store" }
  }
}

export async function createSession(formData) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return { failure: "not authenticated" }
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  })

  if (!user) {
    return { failure: "User not found" }
  }

  const name = formData.get("name") || "Untitled Session"
  const description = formData.get("description") || ""
  const templateId = formData.get("templateId") || null
  const documentIds = formData.getAll("documentIds") || []
  const agentIds = formData.getAll("agentIds") || []

  // First, deactivate all existing sessions for this user
  await prisma.session.updateMany({
    where: {
      userId: user.id,
      isActive: true,
    },
    data: {
      isActive: false,
    },
  })

  const sessionData = {
    userId: user.id,
    name,
    description,
    isActive: true, // Explicitly set the new session as active
  }

  // Add template relation if a template was selected
  if (templateId) {
    sessionData.templateId = templateId
  }
  
  // Add documents relation if documents were selected
  if (documentIds.length > 0) {
    sessionData.documents = {
      connect: documentIds.map((id) => ({ id })),
    }
  }
  
  // Add agents relation if agents were selected
  if (agentIds.length > 0) {
    sessionData.agents = {
      connect: agentIds.map((id) => ({ id })),
    }
  }

  // Create session with session data
  const newSession = await prisma.session.create({
    data: sessionData,
  })

  return { sessionId: newSession.id }
}

export async function removeDocument(documentId) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return { failure: "not authenticated" }
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  })

  if (!user) {
    return { failure: "User not found" }
  }

  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: { userId: true, fileUrl: true, isEmbedded: true, awsFileUrl: true },
  })

  if (!document) {
    return { failure: "Document not found" }
  }

  if (document.userId !== user.id) {
    return { failure: "Unauthorized" }
  }

  try {
    // Extract blob name from Azure URL
    const url = new URL(document.awsFileUrl);
    const encodedName = url.pathname.substring(url.pathname.lastIndexOf('/') + 1);
    const blobName = decodeURIComponent(encodedName);

    const { BlobServiceClient } = await import("@azure/storage-blob");
    const blobServiceClient = new BlobServiceClient(process.env.BLOBSERVICE_SAS_URL);
    const containerClient = blobServiceClient.getContainerClient(process.env.DOCUMENT_CONTAINER);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.delete();

    if (document.isEmbedded) {
      const res = await fetch(`${process.env.BACKEND_URL}/delete_embeddings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "BACKEND-SECRET": process.env.BACKEND_SECRET
        },
        body: JSON.stringify({ pdf_url: document.fileUrl, userId: user.id }),
      })

      if (!res.ok) {
        console.log("Failed to delete embeddings")
        const d = await res.json()
        console.log(d)
        return { error: "Failed to delete embeddings" }
      }
    }

    await prisma.document.delete({
      where: { id: documentId },
    })

    return { success: true }
  } catch (error) {
    console.error("Error deleting file from Azure:", error)
    return { error: error.message }
  }
}

export async function getSummary(sessionId) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return { failure: "not authenticated" }
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  })

  if (!user) {
    return { failure: "User not found" }
  }

  const s = await prisma.session.findUnique({
    where: { id: sessionId, userId: user.id },
  })

  if (!s) {
    return { failure: "Summary not found or user not linked to the summary" }
  }
  console.log(s.isActive)
  if (!s.summary || s.isActive) {
    const response = await fetch(`${process.env.BACKEND_URL}/process-ai-summary`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "BACKEND-SECRET": process.env.BACKEND_SECRET
      },
      body: JSON.stringify({ raw_conversation: s.conversation }),
    });
    
    if (!response.ok) {
      const text = await response.text(); // Read raw text (since streaming JSON might be malformed)
      console.error("Error Response:", text);
      return {
        failure: "Sorry, I couldn't process the summary of this meeting at this time.",
      };
    }
    
    // Process the streaming response manually
    const reader = response.body?.getReader();
    if (!reader) {
      return { failure: "Error reading summary stream." };
    }
    
    let fullResponse = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      // Convert chunk to text
      const chunkText = new TextDecoder().decode(value);
      
      try {
        const chunkData = JSON.parse(chunkText);
        if (chunkData.result) {
          fullResponse = chunkData.result; // Store the cumulative response
        }
      } catch (err) {
        console.error("Error parsing stream chunk:", chunkText);
      }
    }
    
    // Store summary in Prisma
    await prisma.session.update({
      where: { id: sessionId },
      data: { summary: fullResponse },
    });
    
    return {
      summary: fullResponse,
      createdAt: s.createdAt,
    };
  }else{

    return {
      summary: s.summary,
      createdAt: s.createdAt,
    };
  }
}

export async function createMeetingTemplate(formData) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return { failure: "not authenticated" }
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  })

  if (!user) {
    return { failure: "User not found" }
  }

  const purpose = formData.get("purpose")
  const goal = formData.get("goal")
  const additionalInfo = formData.get("additionalInfo")
  const duration = formData.get("duration")
  const documentIds = formData.getAll("documentIds")

  if (!purpose || !goal) {
    return { failure: "Purpose and goal are required" }
  }

  const newTemplate = await prisma.meetingTemplate.create({
    data: {
      userId: user.id,
      purpose,
      goal,
      additionalInfo: additionalInfo || "",
      duration: duration || "30 mins",
      documents: {
        connect: documentIds.map((id) => ({ id })),
      },
    },
  })

  return { success: true, templateId: newTemplate.id }
}

export async function deleteMeetingTemplate(templateId) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return { failure: "not authenticated" }
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  })

  if (!user) {
    return { failure: "User not found" }
  }

  const template = await prisma.meetingTemplate.findUnique({
    where: { id: templateId },
    select: { userId: true },
  })

  if (!template) {
    return { failure: "Template not found" }
  }

  if (template.userId !== user.id) {
    return { failure: "Unauthorized" }
  }

  await prisma.meetingTemplate.delete({
    where: { id: templateId },
  })

  return { success: true }
}

export async function updateDocument(documentId, formData) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return { failure: "not authenticated" }
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  })

  if (!user) {
    return { failure: "User not found" }
  }

  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: { userId: true, fileUrl: true, isEmbedded: true },
  })

  if (!document) {
    return { failure: "Document not found" }
  }

  if (document.userId !== user.id) {
    return { failure: "Unauthorized" }
  }

  const title = formData.get("title") || ""
  const description = formData.get("description") || ""
  const addEmbedding = formData.get("add_embedding") === "true"

  // Check if embedding status has changed
  if (addEmbedding !== document.isEmbedded) {
    if (addEmbedding) {
      // Add embedding
      const res = await fetch(`${process.env.BACKEND_URL}/add_embeddings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "BACKEND-SECRET": process.env.BACKEND_SECRET
        },
        body: JSON.stringify({ s3_url: document.fileUrl, userId: user.id }),
      })

      if (!res.ok) {
        console.log("Failed to add embeddings")
        const d = await res.json()
        console.log(d)
        return { error: "Failed to add embeddings" }
      }
    } else {
      // Remove embedding
      const res = await fetch(`${process.env.BACKEND_URL}/delete_embeddings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "BACKEND-SECRET": process.env.BACKEND_SECRET
        },
        body: JSON.stringify({ pdf_url: document.fileUrl, userId: user.id }),
      })

      if (!res.ok) {
        console.log("Failed to delete embeddings")
        const d = await res.json()
        console.log(d)
        return { error: "Failed to delete embeddings" }
      }
    }
  }

  // Update document in database
  await prisma.document.update({
    where: { id: documentId },
    data: {
      title,
      description,
      isEmbedded: addEmbedding,
    },
  })

  return { success: true }
}

export async function updateMeetingTemplate(templateId, formData) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return { failure: "not authenticated" }
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  })

  if (!user) {
    return { failure: "User not found" }
  }

  const template = await prisma.meetingTemplate.findUnique({
    where: { id: templateId },
    select: { userId: true },
  })

  if (!template) {
    return { failure: "Template not found" }
  }

  if (template.userId !== user.id) {
    return { failure: "Unauthorized" }
  }

  const purpose = formData.get("purpose")
  const goal = formData.get("goal")
  const additionalInfo = formData.get("additionalInfo")
  const duration = formData.get("duration")
  const documentIds = formData.getAll("documentIds")

  if (!purpose || !goal) {
    return { failure: "Purpose and goal are required" }
  }

  // Update template in database
  await prisma.meetingTemplate.update({
    where: { id: templateId },
    data: {
      purpose,
      goal,
      additionalInfo: additionalInfo || "",
      duration: duration || "30 mins",
      documents: {
        set: [], // Remove all existing connections
        connect: documentIds.map((id) => ({ id })), // Connect selected documents
      },
    },
  })

  return { success: true }
}

export async function getEmbeddedDocuments() {
  const session = await getServerSession(authOptions)

  if (!session) {
    return { failure: "not authenticated" }
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  })

  if (!user) {
    return { failure: "User not found" }
  }

  const documents = await prisma.document.findMany({
    where: {
      userId: user.id,
      isEmbedded: true,
    },
    select: {
      id: true,
      title: true,
    },
  })

  return { documents }
}

export async function deleteSession(sessionId) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return { failure: "not authenticated" }
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  })

  if (!user) {
    return { failure: "User not found" }
  }

  const existingSession = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { userId: true, isActive: true },
  })

  if (!existingSession) {
    return { failure: "Session not found" }
  }

  if (existingSession.userId !== user.id) {
    return { failure: "Unauthorized" }
  }

  // Only allow deletion of completed sessions
  if (existingSession.isActive) {
    return { failure: "Cannot delete active sessions. Please complete the session first." }
  }

  // Soft delete the session by marking it as deleted
  await prisma.session.update({
    where: { id: sessionId },
    data: {
      isDeleted: true,
    },
  })

  return { success: true }
}

