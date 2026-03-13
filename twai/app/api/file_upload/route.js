import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

export const maxDuration = 300; // 5 minutes

export async function POST(request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get user from session
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Handle both Azure Blob Storage upload and JSON payload
    let fileUrl, add_embedding, title, description, fileName;

    const contentType = request.headers.get("content-type") || "";
    
    if (contentType.includes("application/json")) {
      // Azure Blob Storage upload method with JSON payload
      const body = await request.json();
      fileUrl = body.fileUrl;
      add_embedding = body.add_embedding;
      title = body.title || "Untitled Document";
      description = body.description || "";
      fileName = body.fileName;
    } else {
      // Traditional FormData upload method using Azure Blob Storage
      const formData = await request.formData();
      const file = formData.get("file");
      
      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }

      // Validate file type (PDF and PowerPoint)
      const allowedMimeTypes = [
        'application/pdf',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      ];
      
      if (!allowedMimeTypes.includes(file.type)) {
        return NextResponse.json(
          { error: "Invalid file type. Only PDF and PowerPoint files are allowed" },
          { status: 400 }
        );
      }

      // Validate file size (10MB limit)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        return NextResponse.json(
          { error: "File too large. Maximum size is 10MB" },
          { status: 400 }
        );
      }

      // Upload to Azure Blob Storage
      const sasUrl = process.env.BLOBSERVICE_SAS_URL;
      const containerName = process.env.DOCUMENT_CONTAINER;

      if (!sasUrl || !containerName) {
        return NextResponse.json(
          { error: "Azure storage configuration missing" },
          { status: 500 }
        );
      }

      try {
        // Dynamically import Azure storage client
        const { BlobServiceClient } = await import("@azure/storage-blob");

        const blobServiceClient = new BlobServiceClient(sasUrl);
        const containerClient = blobServiceClient.getContainerClient(containerName);

        const blobName = `${Date.now()}-${file.name}`;
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);

        // Convert file to Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Upload with correct content-type
        await blockBlobClient.uploadData(buffer, {
          blobHTTPHeaders: {
            blobContentType: file.type || "application/octet-stream",
          },
        });

        fileUrl = blockBlobClient.url;
        fileName = file.name;
        title = formData.get("title") || file.name;
        description = formData.get("description") || "";
        add_embedding = formData.get("add_embedding") === "true";
      } catch (uploadError) {
        console.error("Error uploading to Azure:", uploadError);
        return NextResponse.json(
          { error: "Failed to upload file to Azure storage" },
          { status: 500 }
        );
      }
    }

    // Create document record in database
    const document = await prisma.document.create({
      data: {
        userId: user.id,
        awsFileUrl: fileUrl,
        fileUrl: fileUrl, // Temporary value, will be updated below
        description,
        title: title || fileName,
        isEmbedded: add_embedding,
      },
    });

    // Update the document with the correct fileUrl that includes the document ID
    const updatedDoc = await prisma.document.update({
      where: { id: document.id },
      data: {
        
        fileUrl: `${process.env.BASE_PATH}/api/documents/${document.id}.pdf`,
        awsFileUrl:document.fileUrl
      },
    });

    // If embeddings are requested, send to backend service
    if (add_embedding) {
      const embedResponse = await fetch(`${process.env.BACKEND_URL}/add_embeddings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "BACKEND-SECRET": process.env.BACKEND_SECRET
        },
        body: JSON.stringify({ 
          azureUrl: updatedDoc.awsFileUrl, 
          userId: user.id,
          
        }),
      });

      if (!embedResponse.ok) {
        console.error("Error adding embeddings");
        const errorData = await embedResponse.json();
        console.error(errorData);
      }
    }

    return NextResponse.json({ 
      success: true, 
      documentId: document.id 
    });
  } catch (error) {
    console.error("Error processing document:", error);
    return NextResponse.json(
      { error: "Error processing document" },
      { status: 500 }
    );
  }
}
