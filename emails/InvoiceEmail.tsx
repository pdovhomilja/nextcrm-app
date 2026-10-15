import { Heading, Text } from "@react-email/components";

import { VensaiEmailShell } from "@/emails/components/VensaiEmailShell";
import { emailHeading, emailText } from "@/emails/components/transactional-email-styles";

interface InvoiceEmailProps {
  number: string;
  message?: string;
  userLanguage?: string;
}

export const InvoiceEmail = ({
  number,
  message,
  userLanguage,
}: InvoiceEmailProps) => {
  const isEn = userLanguage !== "cz";

  const previewText = isEn ? `Invoice ${number}` : `Faktura ${number}`;

  const defaultMessage = isEn
    ? "Please find attached your invoice as a PDF."
    : "V příloze naleznete fakturu ve formátu PDF.";

  return (
    <VensaiEmailShell preview={previewText}>
      <Heading style={emailHeading}>
        {isEn ? `Invoice ${number}` : `Faktura ${number}`}
      </Heading>
      <Text style={emailText}>{message ?? defaultMessage}</Text>
    </VensaiEmailShell>
  );
};

export default InvoiceEmail;
