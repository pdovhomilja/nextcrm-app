"use client";

import DocumentViewModal from "@/components/modals/document-view-modal";
import { Button } from "@/components/ui/button";
import FileUploader from "@/components/ui/file-uploader";
import { FileUploaderDropzone } from "@/components/ui/file-uploader-dropzone";
import ModalDocumentView from "@/components/ui/modal-document-view";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

type Props = {
  buttonLabel: string;
  fileType:
    | "pdfUploader"
    | "imageUploader"
    | "docUploader"
    | "profilePhotoUploader";
};

const ModalDropzone = ({ buttonLabel, fileType }: Props) => {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <div>
      <Button onClick={() => setOpen(true)}>{buttonLabel}</Button>
      <ModalDocumentView
        isOpen={open}
        onClose={() => {
          setOpen(false);
          router.refresh();
        }}
      >
        <FileUploaderDropzone uploader={fileType} />
      </ModalDocumentView>
    </div>
  );
};

export default ModalDropzone;
