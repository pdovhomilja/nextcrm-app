import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import * as React from "react";

interface VercelInviteUserEmailProps {
  username?: string;
  avatar?: string | null;
  email: string;
  password: string;
  userLanguage: string;
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL;

export const PasswordResetEmail = ({
  username,
  avatar,
  email,
  password,
  userLanguage,
}: VercelInviteUserEmailProps) => {
  const previewText = `Password reset from ${process.env.NEXT_PUBLIC_APP_NAME}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="bg-white my-auto mx-auto font-sans">
          <Container className="border border-solid border-[#eaeaea] rounded my-[40px] mx-auto p-[20px] w-[465px]">
            <Section className="mt-[32px]">
              <Img
                src={avatar || `${baseUrl}/images/nouser.png`}
                width="50"
                height="50"
                alt="User Avatar"
                className="my-0 mx-auto rounded-full"
              />
            </Section>
            <Heading className="text-black text-[24px] font-normal text-center p-0 my-[30px] mx-0">
              Password reset for: <strong>{username}</strong>
            </Heading>
            <Text className="text-black text-[14px] leading-[24px]">
              Hello {username},
            </Text>
            <Text className="text-black text-[14px] leading-[24px]">
              {userLanguage === "en"
                ? "Your password was reset,"
                : "Vaše heslo bylo resetováno,"}
            </Text>
            <Text className="text-black text-[14px] leading-[24px]">
              {userLanguage === "en"
                ? "Your username: "
                : "Vaše uživatelské jméno: "}
              <strong>{email}</strong>
            </Text>
            <Text className="text-black text-[14px] leading-[24px]">
              {userLanguage === "en"
                ? "Your new password: "
                : "Vaše nové heslo: "}

              <strong>{password}</strong>
            </Text>
            <Text className="text-black text-[14px] leading-[24px]">
              {userLanguage === "en"
                ? "Please login to "
                : "Prosíme přihlašte se na "}
              <Link
                href={process.env.NEXT_PUBLIC_APP_URL}
                className="text-blue-500 underline"
              >
                {process.env.NEXT_PUBLIC_APP_URL}
              </Link>
            </Text>
            <Text className="text-black text-[14px] leading-[24px]">
              {userLanguage === "en" ? "Thank you, " : "Děkujeme, "}
              {process.env.NEXT_PUBLIC_APP_NAME}
            </Text>
            <Hr className="border border-solid border-[#eaeaea] my-[26px] mx-0 w-full" />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default PasswordResetEmail;
