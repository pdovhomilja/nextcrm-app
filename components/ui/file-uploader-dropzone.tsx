import { MinioUploader } from "@/components/ui/minio-uploader";

type UploaderEndpoint =
  | "pdfUploader"
  | "imageUploader"
  | "docUploader"
  | "profilePhotoUploader";

interface Props {
  uploader: UploaderEndpoint;
  onUploadSuccess?: (url: string) => void;
}

const UPLOADER_CONFIG: Record<
  UploaderEndpoint,
  { folder: "avatars" | "images" | "documents"; accept: Record<string, string[]>; maxSizeMB: number }
> = {
  profilePhotoUploader: { folder: "avatars", accept: { "image/*": [] }, maxSizeMB: 4 },
  imageUploader: { folder: "images", accept: { "image/*": [] }, maxSizeMB: 4 },
  pdfUploader: { folder: "documents", accept: { "application/pdf": [".pdf"] }, maxSizeMB: 64 },
  docUploader: {
    folder: "documents",
    accept: {
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "text/plain": [".txt"],
    },
    maxSizeMB: 64,
  },
};

export const FileUploaderDropzone = ({ uploader, onUploadSuccess }: Props) => {
  const config = UPLOADER_CONFIG[uploader];
  return (
    <MinioUploader
      folder={config.folder}
      accept={config.accept}
      maxSizeMB={config.maxSizeMB}
      onUploadComplete={(url) => onUploadSuccess?.(url)}
      onUploadError={(err) => alert(`Upload error: ${err}`)}
    />
  );
};
