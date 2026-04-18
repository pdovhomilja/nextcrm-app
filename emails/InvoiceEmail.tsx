import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";

interface InvoiceEmailProps {
  number: string;
  message?: string;
  userLanguage?: string;
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL;

export const InvoiceEmail = ({
  number,
  message,
  userLanguage,
}: InvoiceEmailProps) => {
  const isEn = userLanguage !== "cz";

  const previewText = isEn
    ? `Invoice ${number}`
    : `Faktura ${number}`;

  const defaultMessage = isEn
    ? "Please find attached your invoice as a PDF."
    : "V priloze naleznete fakturu ve formatu PDF.";

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="bg-white my-auto mx-auto font-sans">
          <Container className="border border-solid border-slate-300 rounded-md my-[40px] mx-auto p-[20px] w-[465px]">
            <Heading className="text-black text-2xl font-normal text-center p-0 my-[30px] mx-0">
              {isEn ? `Invoice ${number}` : `Faktura ${number}`}
            </Heading>
            <Text className="text-black text-sm leading-[24px]">
              {message ?? defaultMessage}
            </Text>
            <Hr className="border border-solid border-[#eaeaea] my-[26px] mx-0 w-full" />
            <Section>
              <Text className="text-slate-500 text-muted-foreground text-xs leading-[24px]">
                {isEn
                  ? "This email was sent from "
                  : "Tento e-mail byl odeslan z "}
                <strong>{process.env.NEXT_PUBLIC_APP_NAME ?? "NextCRM"}</strong>
                {baseUrl ? ` (${baseUrl})` : ""}
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default InvoiceEmail;
