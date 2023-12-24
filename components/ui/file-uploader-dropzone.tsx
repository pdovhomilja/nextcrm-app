import { UploadDropzone } from "@uploadthing/react";
import { OurFileRouter } from "@/app/api/uploadthing/core";

import "@uploadthing/react/styles.css";

interface Props {
  uploader:
    | "pdfUploader"
    | "imageUploader"
    | "docUploader"
    | "profilePhotoUploader";
  onUploadSuccess?: (newAvatar: string) => void;
}

export const FileUploaderDropzone = ({ uploader, onUploadSuccess }: Props) => (
  //@ts-ignore
  //TODO: Fix this issue with the type OurFileRouter
  <UploadDropzone<OurFileRouter>
    endpoint={uploader}
    onClientUploadComplete={(res) => {
      // Do something with the response
      console.log("Files: ", res);
      if (onUploadSuccess && res) {
        onUploadSuccess(res[0]?.url);
      }
    }}
    onUploadError={(error: Error) => {
      alert(`ERROR! ${error.message}`);
    }}
  />
);
