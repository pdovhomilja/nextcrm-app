"use client";

import { UploadDropzone } from "@uploadthing/react";
import { OurFileRouter } from "@/app/api/uploadthing/core";

import "@uploadthing/react/styles.css";

interface Props {
  uploader: "pdfUploader" | "imageUploader" | "docUploader";
}

export const FileUploaderDropzone = ({ uploader }: Props) => (
  <UploadDropzone<OurFileRouter>
    endpoint={uploader}
    onClientUploadComplete={(res) => {
      // Do something with the response

      console.log("Files: ", res);
    }}
    onUploadError={(error: Error) => {
      alert(`ERROR! ${error.message}`);
    }}
  />
);
