import { Text } from "@react-email/components";

import { VENSAI_BRAND } from "@/lib/brand/vensai";
import { emailFinePrint } from "@/emails/components/transactional-email-styles";

type Props = {
  username: string;
  userLanguage: string;
};

export function TransactionalRecipientNote({ username, userLanguage }: Props) {
  const en = userLanguage === "en";
  return (
    <Text style={emailFinePrint}>
      {en ? "This message was intended for " : "Tato zpráva byla určena pro "}
      <span style={{ color: VENSAI_BRAND.colors.text }}>{username}</span>.
      {en
        ? " If you were not expecting this message, you can ignore this email. If you are concerned about your account's safety, please reply to get in touch with us."
        : " Pokud jste tuto zprávu neočekávali, můžete tento e-mail ignorovat. Pokud se obáváte o bezpečnost svého účtu, odpovězte na tento e-mail, abyste se s námi spojili."}
    </Text>
  );
}
