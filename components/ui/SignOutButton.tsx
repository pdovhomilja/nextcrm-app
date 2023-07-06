"use client";

import { signOut } from "next-auth/react";
import { Button } from "./button";

const SignOutButton = () => {
  return <Button onClick={() => signOut()}>Signout</Button>;
};

export default SignOutButton;
