"use client";

import Image from "next/image";
import { Users } from "@prisma/client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useToast } from "@/components/ui/use-toast";
import { FileUploaderDropzone } from "@/components/ui/file-uploader-dropzone";

import useAvatarStore from "@/store/useAvatarStore";
import axios from "axios";

interface ProfileFormProps {
  data: Users;
}

export function ProfilePhotoForm({ data }: ProfileFormProps) {
  const [avatar, setAvatar] = useState(data.avatar);

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
        title: "Profile photo updated.",
        description: "Your profile photo has been updated.",
        duration: 5000,
      });
    } catch (e) {
      console.log(e);
      toast({
        variant: "default",
        title: "Error updating profile photo.",
        description: "There was an error updating your profile photo.",
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
