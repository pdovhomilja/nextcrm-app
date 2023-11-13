import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing();

const auth = async (req: Request) => {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return false;
  return { id: userId };
};

// FileRouter for your app, can contain multiple FileRoutes
export const ourFileRouter = {
  // Define as many FileRoutes as you like, each with a unique routeSlug

  //FileRoute for uploading images
  imageUploader: f({ image: { maxFileSize: "4MB" } })
    // Set permissions and file types for this FileRoute
    .middleware(async ({ req }) => {
      // This code runs on your server before upload
      const user = await auth(req);

      // If you throw, the user will not be able to upload
      if (!user) throw new Error("Unauthorized");

      // Whatever is returned here is accessible in onUploadComplete as `metadata`
      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // This code RUNS ON YOUR SERVER after upload

      await prismadb.documents.create({
        data: {
          v: 0,
          document_name: file.name,
          description: "new document",
          document_file_url: file.url,
          key: file.key,
          size: file.size,
          document_file_mimeType: `image/${file.name.split(".").pop()}`,
          createdBy: metadata.userId,
          assigned_user: metadata.userId,
        },
      });

      console.log("Upload complete for userId:", metadata.userId);
      console.log("file data:", file);
      //TODO: save file.url to database
    }),

  //FileRoute for uploading profile photos
  profilePhotoUploader: f({ image: { maxFileSize: "4MB" } })
    // Set permissions and file types for this FileRoute
    .middleware(async ({ req }) => {
      // This code runs on your server before upload
      const user = await auth(req);

      // If you throw, the user will not be able to upload
      if (!user) throw new Error("Unauthorized");

      // Whatever is returned here is accessible in onUploadComplete as `metadata`
      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {}),

  //FileRoute for documents
  pdfUploader: f({ pdf: { maxFileSize: "64MB", maxFileCount: 1 } })
    // Set permissions and file types for this FileRoute
    .middleware(async ({ req }) => {
      // This code runs on your server before upload
      const user = await auth(req);

      // If you throw, the user will not be able to upload
      if (!user) throw new Error("Unauthorized");

      // Whatever is returned here is accessible in onUploadComplete as `metadata`
      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // This code RUNS ON YOUR SERVER after upload
      //console.log("Upload complete for userId:", metadata.userId);
      //console.log("file url", file);
      //TODO: save file.url to database
      await prismadb.documents.create({
        data: {
          v: 0,
          document_name: file.name,
          description: "new document",
          document_file_url: file.url,
          key: file.key,
          size: file.size,
          document_file_mimeType: "application/pdf",
          createdBy: metadata.userId,
          assigned_user: metadata.userId,
        },
      });
    }),

  //FileRoute for documents
  docUploader: f({ blob: { maxFileSize: "64MB", maxFileCount: 1 } })
    // Set permissions and file types for this FileRoute
    .middleware(async ({ req }) => {
      // This code runs on your server before upload
      const user = await auth(req);

      // If you throw, the user will not be able to upload
      if (!user) throw new Error("Unauthorized");

      // Whatever is returned here is accessible in onUploadComplete as `metadata`
      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // This code RUNS ON YOUR SERVER after upload
      //console.log("Upload complete for userId:", metadata.userId);
      //console.log("file url", file);
      //TODO: save file.url to database
      await prismadb.documents.create({
        data: {
          v: 0,
          document_name: file.name,
          description: "new document",
          document_file_url: file.url,
          key: file.key,
          size: file.size,
          document_file_mimeType: "application/docs",
          createdBy: metadata.userId,
          assigned_user: metadata.userId,
        },
      });
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
