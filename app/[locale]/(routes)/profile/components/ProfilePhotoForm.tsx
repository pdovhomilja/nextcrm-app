"use client";

import Image from "next/image";
import { Users } from "@prisma/client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useToast } from "@/components/ui/use-toast";
import { FileUploaderDropzone } from "@/components/ui/file-uploader-dropzone";

import useAvatarStore from "@/store/useAvatarStore";
import axios from "axios";
import { useTranslations } from "next-intl";

interface ProfileFormProps {
  data: Users;
}

export function ProfilePhotoForm({ data }: ProfileFormProps) {
  const [avatar, setAvatar] = useState(data.avatar);
  const t = useTranslations("ProfileForm");

  const { toast } = useToast();
  const router = useRouter();
  const setAvatarStore = useAvatarStore((state) => state.setAvatar);

  useEffect(() => {
    setAvatar(data.avatar);
  }, [data.avatar, toast]);

  const handleUploadSuccess = async (newAvatar: string) => {
    try {
      setAvatar(newAvatar);
      setAvatarStore(newAvatar);
      await axios.put("/api/profile/updateProfilePhoto", { avatar: newAvatar });
      toast({
        title: t("photoUpdated"),
        description: t("photoUpdatedDescription"),
        duration: 5000,
      });
    } catch (e) {
      console.log(e);
      toast({
        variant: "default",
        title: t("photoError"),
        description: t("photoErrorDescription"),
        duration: 5000,
      });
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
