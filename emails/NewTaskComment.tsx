import { Button, Heading, Section, Text } from "@react-email/components";
import * as React from "react";

import { VensaiEmailShell } from "@/emails/components/VensaiEmailShell";
import { TransactionalRecipientNote } from "@/emails/components/TransactionalRecipientNote";
import {
  emailCtaButton,
  emailHeading,
  emailText,
} from "@/emails/components/transactional-email-styles";
import { getProductName } from "@/lib/brand/vensai";

interface NewTaskCommentEmailProps {
  commentFromUser: string;
  username: string;
  userLanguage: string;
  comment: string;
  taskId: string;
}

export const NewTaskCommentEmail = ({
  commentFromUser,
  username,
  userLanguage,
  comment,
  taskId,
}: NewTaskCommentEmailProps) => {
  const en = userLanguage === "en";
  const appName = getProductName();
  const taskUrl = `${process.env.NEXT_PUBLIC_APP_URL}/projects/tasks/viewtask/${taskId}`;
  const previewText = en
    ? `New task comment from ${appName}`
    : `Nový komentář k úkolu z aplikace ${appName}`;

  return (
    <VensaiEmailShell preview={previewText}>
      <Heading style={emailHeading}>
        {en
          ? "There is new comment on task you are watching"
          : "Na úkolu, který sledujete, je nový komentář"}
      </Heading>
      <Text style={emailText}>{en ? `Hello ${username},` : `Dobrý den ${username},`}</Text>
      <Text style={emailText}>
        <strong>{commentFromUser}</strong>
        {en
          ? " left a comment on a project board you are watching."
          : " zanechal(a) komentář v projektu (boardu), který sledujete."}
      </Text>
      <Text style={emailText}>
        {en ? "Comment: " : "Komentář: "}
        <strong>{comment}</strong>
      </Text>
      <Text style={emailText}>
        {en ? "Details you can find here: " : "Podrobnosti najdete zde: "}
        <strong>{taskUrl}</strong>
      </Text>
      <Section style={{ margin: "32px 0", textAlign: "center" as const }}>
        <Button href={taskUrl} style={emailCtaButton}>
          {en ? "View task detail" : "Zobrazit úkol"}
        </Button>
      </Section>
      <TransactionalRecipientNote username={username} userLanguage={userLanguage} />
    </VensaiEmailShell>
  );
};

export default NewTaskCommentEmail;
