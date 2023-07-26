"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { useToast } from "@/components/ui/use-toast";

import { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";

import Image from "next/image";
import { FileUploaderDropzone } from "@/components/ui/file-uploader-dropzone";

interface ProfileFormProps {
  data: any;
}

const FormSchema = z.object({
  avatar: z.string().min(3).max(150),
});

export function ProfilePhotoForm({ data }: ProfileFormProps) {
  return (
    <div className="flex items-center space-x-5">
      <div>
        <Image
          src={data?.avatar || "/images/nouser.png"}
          alt="avatar"
          width={100}
          height={100}
        />
      </div>
      <div>
        <FileUploaderDropzone uploader={"profilePhotoUploader"} />
      </div>
    </div>
  );
}
