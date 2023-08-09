"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

import UploadFileModal from "@/components/modals/upload-file-modal";
import { Button } from "@/components/ui/button";

import { FileInput } from "./FileInput";

type Props = {
  buttonLabel: string;
};

const ModalDropzone = ({ buttonLabel }: Props) => {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <div>
      <Button onClick={() => setOpen(true)}>{buttonLabel}</Button>
      <UploadFileModal
        isOpen={open}
        onClose={() => {
          router.refresh();
          setOpen(false);
        }}
      >
        <FileInput onClose={() => setOpen(false)} />
      </UploadFileModal>
    </div>
  );
};

export default ModalDropzone;
