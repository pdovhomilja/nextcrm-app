import { getContact } from "@/actions/crm/get-contact";

import React from "react";

const ContactView = async ({
  params: { contactId },
}: {
  params: { contactId: string };
}) => {
  const contact = await getContact(contactId);
  return (
    <div>
      ContactView
      <pre>
        <code>{JSON.stringify(contact, null, 2)}</code>
      </pre>
    </div>
  );
};

export default ContactView;
