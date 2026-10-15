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

interface NewTaskFromCRMToWatchersEmailProps {
  taskFromUser: string;
  username: string;
  userLanguage: string;
  taskData: { id: string };
}

export const NewTaskFromCRMToWatchersEmail = ({
  taskFromUser,
  username,
  userLanguage,
  taskData,
}: NewTaskFromCRMToWatchersEmailProps) => {
  const en = userLanguage === "en";
  const appName = getProductName();
  const taskUrl = `${process.env.NEXT_PUBLIC_APP_URL}/crm/tasks/viewtask/${taskData.id}`;
  const previewText = en ? `New task from ${appName}` : `Nový úkol z aplikace ${appName}`;

  return (
    <VensaiEmailShell preview={previewText}>
      <Heading style={emailHeading}>
        {en
          ? "There is new task in CRM — Account where you are watcher"
          : "Nový úkol v modulu CRM — Accounts, kde jste pozorovatel"}
      </Heading>
      <Text style={emailText}>{en ? `Hello ${username},` : `Dobrý den ${username},`}</Text>
      <Text style={emailText}>
        <strong>{taskFromUser}</strong>
        {en
          ? " has created a task and we are notifying you because you are an Account watcher."
          : " vytvořil úkol a my vás o tom informujeme, protože sledujete tento Account."}
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

export default NewTaskFromCRMToWatchersEmail;
