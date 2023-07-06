import Heading from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import React from "react";

type Props = {};

const ProfilePage = (props: Props) => {
  return (
    <div className="p-10 space-y-5">
      <Heading title="Profile" description="Here you can edit your profile" />
      <Separator />
    </div>
  );
};

export default ProfilePage;
