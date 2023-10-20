"use client";

import Image from "next/image";

import { Users } from "@prisma/client";

import { FileUploaderDropzone } from "@/components/ui/file-uploader-dropzone";
import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";

interface ProfileFormProps {
  data: Users;
}

export function ProfilePhotoForm({ data }: ProfileFormProps) {
  const [avatar, setAvatar] = useState(data.avatar);

  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    setAvatar(data.avatar);
  }, [data.avatar, toast]);

  const handleUploadSuccess = (newAvatar: string) => {
    try {
      setAvatar(newAvatar);
      toast({
        title: "Profile photo updated.",
        description: "Your profile photo has been updated.",
        duration: 5000,
      });
    } catch (e) {
      console.log(e);
    } finally {
      router.refresh();
    }
  };

  return (
    <div className="flex items-center space-x-5">
      <div>
        <Image
          src={avatar || "/images/nouser.png"}
          alt="avatar"
          width={100}
          height={100}
        />
      </div>
      <div>
        <FileUploaderDropzone
          uploader={"profilePhotoUploader"}
          onUploadSuccess={handleUploadSuccess}
        />
      </div>
    </div>
  );
}
