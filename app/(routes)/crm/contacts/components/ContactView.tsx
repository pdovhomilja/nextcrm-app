import React from "react";

import RightViewModal from "@/components/modals/right-view-modal";

import { getOpportunitiesFull } from "@/actions/crm/get-opportunities-with-includes";
import { getAllCrmData } from "@/actions/crm/get-crm-data";

import { NewContactForm } from "./NewContactForm";
import { ContactsDataTable } from "../table-components/data-table";
import { columns } from "../table-components/columns";
import { getContacts } from "@/actions/crm/get-contacts";

const ContactView = async () => {
  const contacts = await getContacts();
  const crmData = await getAllCrmData();
  const { users, accounts, saleTypes, saleStages, campaigns } = crmData;

  return (
    <div className="border rounded-md p-5 mt-5">
      <div className="flex items-center gap-3">
        <div className="flex w-full h-full">
          <RightViewModal
            label={"Add new Contact"}
            title="Add new Contact"
            description=""
          >
            <NewContactForm users={users} accounts={accounts} />
          </RightViewModal>
        </div>
      </div>
      <div>
        <ContactsDataTable data={contacts} columns={columns} />
      </div>
    </div>
  );
};

export default ContactView;
