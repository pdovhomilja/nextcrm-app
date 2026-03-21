"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import UploadFileModal from "@/components/modals/upload-file-modal";
import { Button } from "@/components/ui/button";
import { FileUploaderDropzone } from "@/components/ui/file-uploader-dropzone";
import { createDocument } from "@/actions/documents/create-document";
import { toast } from "sonner";

type Props = {
  buttonLabel: string;
  fileType:
    | "pdfUploader"
    | "imageUploader"
    | "docUploader"
    | "profilePhotoUploader";
};

const MIME_MAP: Record<string, string> = {
  pdfUploader: "application/pdf",
  imageUploader: "image/*",
  docUploader: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  profilePhotoUploader: "image/*",
};

const ModalDropzone = ({ buttonLabel, fileType }: Props) => {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleUploadSuccess = async (url: string) => {
    try {
      const filename = url.split("/").pop() ?? "document";
      await createDocument({
        name: filename,
        url,
        key: url.split("/").slice(-2).join("/"), // folder/uuid.ext
        size: 0, // size not available from presigned URL flow
        mimeType: MIME_MAP[fileType] ?? "application/octet-stream",
      });
      toast.success("Document uploaded successfully");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error("Failed to save document");
    }
  };

  return (
    <div>
      <Button onClick={() => setOpen(true)}>{buttonLabel}</Button>
      <UploadFileModal isOpen={open} onClose={() => setOpen(false)}>
        <FileUploaderDropzone uploader={fileType} onUploadSuccess={handleUploadSuccess} />
      </UploadFileModal>
    </div>
  );
};

export default ModalDropzone;
