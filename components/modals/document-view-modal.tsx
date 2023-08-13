"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import ModalDocumentView from "../ui/modal-document-view";
import DocViewer, { DocViewerRenderers } from "react-doc-viewer";
import Link from "next/link";

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  loading: boolean;
  document: any;
}

const DocumentViewModal = ({
  isOpen,
  onClose,
  loading,
  document,
}: AlertModalProps) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  if (
    document.document_file_mimeType !== "application/png" ||
    document.document_file_mimeType !== "application/jpg" ||
    document.document_file_mimeType !== "application/jpeg" ||
    document.document_file_mimeType !== "application/gif" ||
    document.document_file_mimeType !== "images/png" ||
    document.document_file_mimeType !== "images/jpg" ||
    document.document_file_mimeType !== "images/jpeg" ||
    document.document_file_mimeType !== "images/gif"
  ) {
    return (
      <ModalDocumentView isOpen={isOpen} onClose={onClose}>
        <div className="flex flex-col h-full ">
          {/*           <DocViewer
            documents={docs}
            pluginRenderers={DocViewerRenderers}
            style={{ height: 800 }}
          /> */}
          <img
            style={{
              width: "100%",
              height: "100%",
            }}
            src={document.document_file_url}
          />
          <div className="pt-6 space-x-2 flex items-center justify-end w-full ">
            <Button disabled={loading} variant={"outline"} onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </ModalDocumentView>
    );
  }

  if (document.document_file_mimeType === "application/pdf") {
    return (
      <ModalDocumentView isOpen={isOpen} onClose={onClose}>
        <div className="flex flex-col h-full ">
          <embed
            style={{
              width: "100%",
              height: "100%",
            }}
            type="application/pdf"
            src={document.document_file_url}
          />
          <div className="pt-6 space-x-2 flex items-center justify-end w-full ">
            <Button disabled={loading} variant={"outline"} onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </ModalDocumentView>
    );
  } else {
    return (
      <ModalDocumentView isOpen={isOpen} onClose={onClose}>
        <div className="flex flex-col h-full ">
          {/*           <DocViewer
           documents={docs}
           pluginRenderers={DocViewerRenderers}
           style={{ height: 800 }}
         /> */}
          This file can not be previewed.
          <div className="pt-6 space-x-2 flex items-center justify-end w-full ">
            <Button disabled={loading} variant={"outline"} onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </ModalDocumentView>
    );
  }
};

export default DocumentViewModal;
