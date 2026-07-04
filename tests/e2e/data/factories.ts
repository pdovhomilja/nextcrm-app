import { futureDate, randomCurrency, randomEmail, randomInt, unique } from "../helpers/random";


interface Factory<T> {
  build(overrides?: Partial<T>): T;
}

function createFactory<T>(defaults: () => T): Factory<T> {
  return {
    build(overrides?: Partial<T>): T {
      return { ...defaults(), ...overrides };
    },
  };
}


export interface AccountData {
  name: string;
  email: string;
  website: string;
  office_phone: string;
  description: string;
  annual_revenue: string;
  billing_street: string;
  billing_city: string;
  billing_country: string;
}

export const AccountFactory = createFactory<AccountData>(() => ({
  name: unique("Account"),
  email: randomEmail(),
  website: "https://e2e-test.com",
  office_phone: "+541155551234",
  description: "Cuenta creada por factory E2E",
  annual_revenue: String(randomInt(100000, 999999)),
  billing_street: "Av. Corrientes 1234",
  billing_city: "Buenos Aires",
  billing_country: "Argentina",
}));


export interface ContactData {
  last_name: string;
  first_name: string;
  email: string;
  personal_email: string;
  office_phone: string;
  mobile_phone: string;
  position: string;
  description: string;
  website: string;
  assigned_user: string;
  assigned_account: string;
}

export const ContactFactory = createFactory<ContactData>(() => ({
  last_name: unique("Contact"),
  first_name: "Juan",
  email: randomEmail(),
  personal_email: randomEmail(),
  office_phone: "+541166661234",
  mobile_phone: "+541177771234",
  position: "VP de Ventas",
  description: "Contacto creado por factory E2E",
  website: "https://e2e-test.com",
  assigned_user: "Test User",
  assigned_account: "Empresa Demo SAC",
}));


export interface LeadData {
  last_name: string;
  first_name: string;
  email: string;
  phone: string;
  company: string;
  job_title: string;
  description: string;
}

export const LeadFactory = createFactory<LeadData>(() => ({
  last_name: unique("Lead"),
  first_name: "Carlos",
  email: randomEmail(),
  phone: "+541177771234",
  company: unique("LeadCorp"),
  job_title: "Director Comercial",
  description: "Lead creado por factory E2E",
}));


export interface OpportunityData {
  name: string;
  budget: string;
  currency: string;
  close_date: string;
  description: string;
  next_step: string;
}

export const OpportunityFactory = createFactory<OpportunityData>(() => ({
  name: unique("Deal"),
  budget: String(randomInt(10000, 200000)),
  currency: randomCurrency(),
  close_date: futureDate(30),
  description: "Oportunidad creada por factory E2E",
  next_step: "Demo técnica",
}));


export interface ContractData {
  title: string;
  value: string;
  currency: string;
  description: string;
}

export const ContractFactory = createFactory<ContractData>(() => ({
  title: unique("Contract"),
  value: String(randomInt(10000, 300000)),
  currency: randomCurrency(),
  description: "Contrato creado por factory E2E",
}));


export interface ProductData {
  name: string;
  sku: string;
  unit_price: string;
  currency: string;
  type: "PRODUCT" | "SERVICE";
}

export const ProductFactory = createFactory<ProductData>(() => ({
  name: unique("Product"),
  sku: unique("SKU"),
  unit_price: String(randomInt(10, 1000)),
  currency: randomCurrency(),
  type: "PRODUCT",
}));


export interface ActivityData {
  type: "call" | "meeting" | "email" | "note";
  title: string;
  description: string;
  date: string;
  time: string;
  duration: string;
  status: "Scheduled" | "Completed" | "Cancelled";
  outcome: string;
  email_subject: string;
}

export const ActivityFactory = createFactory<ActivityData>(() => ({
  type: "call",
  title: unique("Activity"),
  description: "Actividad creada por factory E2E",
  date: new Date().toISOString().slice(0, 16),
  time: "14:30",
  duration: "30",
  status: "Completed",
  outcome: "Cliente interesado",
  email_subject: "Asunto del email",
}));


export interface TaskData {
  title: string;
  content: string;
  priority: string;
  assignedTo: string;
}

export const TaskFactory = createFactory<TaskData>(() => ({
  title: unique("Task"),
  content: "Contenido de la tarea E2E",
  priority: "high",
  assignedTo: "Test User",
}));


export interface TargetData {
  last_name: string;
  company: string;
  email: string;
}

export const TargetFactory = createFactory<TargetData>(() => ({
  last_name: unique("Target"),
  company: unique("TargetCorp"),
  email: randomEmail(),
}));


export interface TargetListData {
  name: string;
}

export const TargetListFactory = createFactory<TargetListData>(() => ({
  name: unique("TargetList"),
}));
