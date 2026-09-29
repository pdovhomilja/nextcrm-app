// The importable/exportable crm_Targets fields. Used by the import
// mapping UI and by CSV/XLSX export so the two stay in sync.
export interface TargetField {
  key: string;
  label: string;
  required: boolean;
}

export const TARGET_FIELDS: TargetField[] = [
  { key: "type", label: "Type", required: false },
  { key: "last_name", label: "Last Name", required: false },
  { key: "first_name", label: "First Name", required: false },
  { key: "email", label: "Email", required: false },
  { key: "mobile_phone", label: "Mobile Phone", required: false },
  { key: "office_phone", label: "Office Phone", required: false },
  { key: "company", label: "Company", required: false },
  { key: "position", label: "Position", required: false },
  { key: "company_website", label: "Company Website", required: false },
  { key: "personal_website", label: "Personal Website", required: false },
  { key: "social_linkedin", label: "LinkedIn", required: false },
  { key: "social_x", label: "X / Twitter", required: false },
  { key: "social_instagram", label: "Instagram", required: false },
  { key: "social_facebook", label: "Facebook", required: false },
  { key: "personal_email", label: "Personal Email", required: false },
  { key: "company_email",  label: "Company Email",  required: false },
  { key: "company_phone",  label: "Company Phone",  required: false },
  { key: "city",           label: "City",           required: false },
  { key: "country",        label: "Country",        required: false },
  { key: "industry",       label: "Industry",       required: false },
  { key: "employees",      label: "Employees",      required: false },
  { key: "description",    label: "Description",    required: false },
];
