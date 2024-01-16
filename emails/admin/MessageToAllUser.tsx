import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Tailwind,
  Text,
} from "@react-email/components";
import { Markdown } from "@react-email/markdown";
import * as React from "react";

interface VercelInviteUserEmailProps {
  username: string;
  title: string;
  message: string;
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL;

export const MessageToAllUsers = ({
  title,
  message,
  username,
}: VercelInviteUserEmailProps) => {
  const previewText = "Message to all users from:" + baseUrl;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="bg-white my-auto mx-auto font-sans">
          <Container className="border border-solid border-slate-300 rounded-md my-[40px] mx-auto p-[20px] w-[465px]">
            <Heading className="text-black text-[24px] font-normal text-center p-0 my-[30px] mx-0">
              {title}
            </Heading>
            <Text className="text-black text-[14px] leading-[24px]">
              <strong>Message from {baseUrl} Admin</strong>
            </Text>
            <Text className="text-black text-[14px] leading-[24px]">
              {"Hello " + username + ","}
            </Text>
            <Markdown>{message}</Markdown>
            <Hr className="border border-solid border-[#eaeaea] my-[26px] mx-0 w-full" />
            <Text className="text-black text-xs text-muted-foreground">
              You received this email because you are a user of the{" "}
              {process.env.NEXT_PUBLIC_APP_NAME} app:{" "}
              {process.env.NEXT_PUBLIC_APP_URL}. If you think you received this
              email by mistake, please contact us at info@nextcrm.dev
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default MessageToAllUsers;
