import { getServerSession } from "next-auth";
import { authOptions } from "../../api/auth/[...nextauth]/route";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { v4 as uuidv4 } from 'uuid';

export async function POST(request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user from session
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { filename, contentType } = await request.json();
    if (!filename || !contentType) {
      return NextResponse.json(
        { error: "Missing filename or contentType" },
        { status: 400 }
      );
    }

    // Validate file type (PDF and PowerPoint)
    const allowedMimeTypes = [
      'application/pdf',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ];
    
    if (!allowedMimeTypes.includes(contentType)) {
      return NextResponse.json(
        { error: "Invalid file type. Only PDF and PowerPoint files are allowed" },
        { status: 400 }
      );
    }

    // Generate a unique blob name for Azure
    const fileId = uuidv4();
    const fileExtension = filename.split('.').pop();
    const blobName = `uploads/${user.id}/${fileId}.${fileExtension}`;

    // Azure Blob Storage configuration
    const sasUrl = process.env.BLOBSERVICE_SAS_URL;
    const containerName = process.env.DOCUMENT_CONTAINER;
    const storageAccountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;

    if (!sasUrl || !containerName || !storageAccountName) {
      return NextResponse.json(
        { error: "Azure storage configuration missing" },
        { status: 500 }
      );
    }

    // For Azure, we'll use the existing SAS URL which already includes the necessary permissions
    // The SAS URL is valid for a configured period (e.g., 15 minutes to 1 hour)
    const blobServiceUrl = `https://${storageAccountName}.blob.core.windows.net`;
    const fileUrl = `${blobServiceUrl}/${containerName}/${blobName}`;
    
    // The SAS URL already contains the signature and permissions
    // We'll construct the upload URL by combining the blob URL with the SAS token
    const sasToken = sasUrl.split('?')[1] || '';
    const uploadUrl = `${fileUrl}?${sasToken}`;

    return NextResponse.json({
      signedUrl: uploadUrl,
      fileUrl,
      key: blobName
    });
  } catch (error) {
    console.error("Error generating signed URL:", error);
    return NextResponse.json(
      { error: "Failed to generate upload URL" },
      { status: 500 }
    );
  }
}
