"use client";

import DocumentViewModal from "@/components/modals/document-view-modal";
import { Button } from "@/components/ui/button";
import FileUploader from "@/components/ui/file-uploader";
import { FileUploaderDropzone } from "@/components/ui/file-uploader-dropzone";
import ModalDocumentView from "@/components/ui/modal-document-view";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

type Props = {};

const ModalDropzone = (props: Props) => {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <div>
      <Button onClick={() => setOpen(true)}>Upload</Button>
      <ModalDocumentView
        isOpen={open}
        onClose={() => {
          setOpen(false);
          router.refresh();
        }}
      >
        <div className="flex w-full pb-5 space-x-5">
          <div className="w-1/2">
            <FileUploaderDropzone uploader={"docUploader"} />
          </div>
          <div className="w-1/2">
            <FileUploaderDropzone uploader={"pdfUploader"} />
          </div>
        </div>
      </ModalDocumentView>
    </div>
  );
};

export default ModalDropzone;
