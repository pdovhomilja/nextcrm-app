"use client";

import Image from "next/image";
import { Users } from "@prisma/client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { toast } from "sonner";
import { FileUploaderDropzone } from "@/components/ui/file-uploader-dropzone";
import { Button } from "@/components/ui/button";

import useAvatarStore from "@/store/useAvatarStore";
import { updateProfilePhoto } from "@/actions/user/update-profile-photo";
import { useTranslations } from "next-intl";

interface ProfileFormProps {
  data: Users;
}

export function ProfilePhotoForm({ data }: ProfileFormProps) {
  const [avatar, setAvatar] = useState(data.avatar);
  const [pendingAvatar, setPendingAvatar] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const t = useTranslations("ProfileForm");

  const router = useRouter();
  const setAvatarStore = useAvatarStore((state) => state.setAvatar);

  useEffect(() => {
    setAvatar(data.avatar);
  }, [data.avatar]);

  // Upload completes — show preview, wait for user to confirm
  const handleUploadSuccess = (newAvatar: string, _key: string) => {
    setPendingAvatar(newAvatar);
  };

  // Save button — persist to DB
  const handleSave = async () => {
    if (!pendingAvatar) return;
    setSaving(true);
    try {
      await updateProfilePhoto(pendingAvatar);
      setAvatar(pendingAvatar);
      setAvatarStore(pendingAvatar);
      setPendingAvatar(null);
      toast.success(t("photoUpdatedDescription"), { duration: 5000 });
      router.refresh();
    } catch (e) {
      console.log(e);
      toast.error(t("photoErrorDescription"), { duration: 5000 });
    } finally {
      setSaving(false);
    }
  };

  // Cancel — discard pending upload
  const handleCancel = () => {
    setPendingAvatar(null);
  };

  const previewUrl = pendingAvatar ?? avatar ?? "/images/nouser.png";

  return (
    <div className="flex items-start gap-6">
      <div className="flex flex-col items-center gap-2">
        <Image
          src={previewUrl}
          alt="avatar"
          width={100}
          height={100}
          className="rounded-full object-cover border border-border"
        />
        {pendingAvatar !== null && (
          <span className="text-xs text-muted-foreground">Preview</span>
        )}
      </div>
      <div className="flex flex-col gap-3">
        <FileUploaderDropzone
          uploader={"profilePhotoUploader"}
          onUploadSuccess={handleUploadSuccess}
        />
        {pendingAvatar !== null && (
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving} size="sm">
              {saving ? "Saving..." : "Save photo"}
            </Button>
            <Button onClick={handleCancel} variant="outline" size="sm" disabled={saving}>
              Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
