"use client";
import { signIn } from "next-auth/react";

export default function LoginButton() {
  return (
    <button
      className="bg-black rounded-lg text-white px-3 py-2"
      onClick={() => signIn()}
    >
      Sign in
    </button>
  );
}
