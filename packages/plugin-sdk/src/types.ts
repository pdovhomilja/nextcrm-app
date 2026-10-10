import type { ReactNode } from "react";
import type { z } from "zod";

export const LOCALES = ["en", "cz", "de", "uk"] as const;
export type Locale = (typeof LOCALES)[number];

export type Role = "user" | "manager" | "admin";

export const ENTITIES = ["account", "contact", "lead", "opportunity", "order"] as const;
export type Entity = (typeof ENTITIES)[number];

export type BeforeOperation = "beforeCreate" | "beforeUpdate" | "beforeDelete";
export type AfterOperation = "created" | "updated" | "deleted";

export const PERMISSIONS = [
  "accounts:read", "accounts:write",
  "contacts:read", "contacts:write",
  "leads:read", "leads:write",
  "opportunities:read", "opportunities:write",
  "orders:read", "orders:write",
  "activities:read", "users:read", "products:read",
  "notify", "http",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export type Actor =
  | { type: "user"; userId: string; role: Role }
  | { type: "token"; userId: string; role: Role }
  | { type: "system" }
  | { type: "plugin"; pluginId: string };

export type RecordData = Record<string, unknown>;

export interface FindArgs {
  where?: RecordData;
  orderBy?: RecordData | RecordData[];
  take?: number;
  skip?: number;
}

export interface ReadApi {
  get(id: string): Promise<RecordData | null>;
  find(args?: FindArgs): Promise<RecordData[]>;
}

export interface EntityApi extends ReadApi {
  create(data: RecordData): Promise<RecordData>;
  update(id: string, data: RecordData): Promise<RecordData>;
}

export type PluginOrderStatus = "SENT" | "CONFIRMED" | "DELIVERED" | "INVOICED" | "PAID" | "SYNC_FAILED" | "CANCELLED";
export interface OrderLineInput { productId: string; quantity: number | string; unitPrice: number | string }
export interface ExternalOrderInput {
  accountId: string;
  externalRef: string;
  status: Exclude<PluginOrderStatus, "SYNC_FAILED">;
  currency?: string;
  /** ISO day (YYYY-MM-DD) of the order in the external system; defaults to today. */
  orderDate?: string;
  note?: string | null;
  lines: OrderLineInput[];
}
export interface OrderUpdateInput {
  status?: PluginOrderStatus;
  externalRef?: string;
  /** EXTERNAL orders only. */
  orderDate?: string;
  note?: string | null;
  /** EXTERNAL orders only: replaces all lines. */
  lines?: OrderLineInput[];
}
/** Orders: `get` includes `lines`; plugins create only EXTERNAL orders and set only forward or failure statuses. */
export interface OrdersApi extends ReadApi {
  create(data: ExternalOrderInput): Promise<RecordData>;
  update(id: string, data: OrderUpdateInput): Promise<RecordData>;
}

export interface ActivityQuery {
  types?: string[];
  status?: "scheduled" | "completed" | "cancelled";
  since?: Date;
  take?: number;
  skip?: number;
}

export interface ActivitiesApi extends Pick<ReadApi, "find"> {
  /** Activities linked to the record (crm_ActivityLinks), newest first, soft-deleted excluded, at most 100. */
  findForRecord(entity: Entity, id: string, query?: ActivityQuery): Promise<RecordData[]>;
}

export interface DataApi {
  accounts: EntityApi;
  contacts: EntityApi;
  leads: EntityApi;
  opportunities: EntityApi;
  orders: OrdersApi;
  activities: ActivitiesApi;
  users: ReadApi;
  products: ReadApi;
}

export interface StoreEntry { key: string; value: unknown }

export interface RecordStore {
  get<T = unknown>(key: string): Promise<T | null>;
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
  list(prefix?: string): Promise<StoreEntry[]>;
}

export interface PluginStore extends RecordStore {
  forRecord(entity: Entity, id: string): RecordStore;
}

export interface PluginLogger {
  debug(message: string, context?: RecordData): void;
  info(message: string, context?: RecordData): void;
  warn(message: string, context?: RecordData): void;
  error(message: string, context?: RecordData): void;
}

export interface PluginHttp {
  fetch(url: string, init?: RequestInit & { timeoutMs?: number }): Promise<Response>;
}

export interface NotifyInput {
  userIds?: string[];
  roles?: Role[];
  subject: string;
  text: string;
}

export type MessageParams = Record<string, string | number>;

export interface PluginContext<S = RecordData, K = RecordData> {
  plugin: { id: string; version: string };
  actor: Actor;
  locale: Locale;
  settings: S;
  secrets: K;
  data: DataApi;
  store: PluginStore;
  http: PluginHttp;
  notify(input: NotifyInput): Promise<void>;
  log: PluginLogger;
  t(key: string, params?: MessageParams): string;
}

export type RuleResult =
  | { kind: "allow" }
  | { kind: "reject"; messageKey: string; params?: MessageParams }
  | { kind: "modify"; patch: RecordData };

export interface RuleInput {
  entity: Entity;
  operation: BeforeOperation;
  recordId: string | null;
  data: RecordData;
  existing: RecordData | null;
}

export type RuleHandler<S = RecordData, K = RecordData> =
  (input: RuleInput, ctx: PluginContext<S, K>) => RuleResult | Promise<RuleResult>;

export interface RuleOptions { onError?: "block" | "allow"; priority?: number }

export interface AfterInput {
  entity: Entity;
  operation: AfterOperation;
  recordId: string;
  /** Who made the write. */
  actor?: Actor;
  /** Updates only: keys of the update data whose value differs from the stored row ("v" excluded). */
  changed?: string[];
}
export type AfterHandler<S = RecordData, K = RecordData> =
  (input: AfterInput, ctx: PluginContext<S, K>) => Promise<void> | void;

export type EventHandler<S = RecordData, K = RecordData> =
  (data: RecordData, ctx: PluginContext<S, K>) => Promise<void> | void;

export type JobHandler<S = RecordData, K = RecordData> =
  (ctx: PluginContext<S, K>) => Promise<void> | void;

export interface AccountSlotProps<S = RecordData, K = RecordData> {
  accountId: string;
  ctx: PluginContext<S, K>;
}

export interface OrderSlotProps<S = RecordData, K = RecordData> {
  orderId: string;
  ctx: PluginContext<S, K>;
}

export interface PageProps<S = RecordData, K = RecordData> {
  path: string[];
  searchParams: Record<string, string | string[] | undefined>;
  ctx: PluginContext<S, K>;
}

export interface AdminSectionProps<S = RecordData, K = RecordData> { ctx: PluginContext<S, K> }

export type ServerComponent<P> = (props: P) => ReactNode | Promise<ReactNode>;

export interface CompanyRecord {
  name: string;
  registrationNumber: string;
  country: string;           // ISO 3166-1 alpha-2, upper case
  vat?: string;
  street?: string;
  city?: string;
  postalCode?: string;
}

export interface CompanyRegistryProvider<S = RecordData, K = RecordData> {
  countries: string[];       // ISO 3166-1 alpha-2, upper case
  lookup(registrationNumber: string, country: string, ctx: PluginContext<S, K>): Promise<CompanyRecord | null>;
  validateVat?(vat: string, ctx: PluginContext<S, K>): Promise<boolean>;
}

export interface RuleRegistration { entity: Entity; operation: BeforeOperation; handler: RuleHandler<any, any>; onError: "block" | "allow"; priority: number }
export interface AfterRegistration { entity: Entity; operation: AfterOperation; handler: AfterHandler<any, any> }
export interface EventRegistration { event: string; handler: EventHandler<any, any> }
export interface CronRegistration { id: string; schedule: string; handler: JobHandler<any, any> }
export interface AccountTabRegistration { id: string; title: string; component: ServerComponent<AccountSlotProps<any, any>>; roles: Role[] }
export interface AccountPanelRegistration { id: string; component: ServerComponent<AccountSlotProps<any, any>>; roles: Role[] }
export interface OrderPanelRegistration { id: string; component: ServerComponent<OrderSlotProps<any, any>>; roles: Role[] }
export interface PageRegistration { path: string; title: string; component: ServerComponent<PageProps<any, any>>; roles: Role[]; nav?: { label: string } }
/** A button on the plugin's admin page; the host runs the handler with the plugin's context and shows the returned text. */
export interface AdminActionRegistration { id: string; label: string; handler: (ctx: PluginContext<any, any>) => Promise<string | void> }

export interface PluginExtensions {
  rules: RuleRegistration[];
  afters: AfterRegistration[];
  events: EventRegistration[];
  crons: CronRegistration[];
  accountTabs: AccountTabRegistration[];
  accountPanels: AccountPanelRegistration[];
  orderPanels: OrderPanelRegistration[];
  pages: PageRegistration[];
  adminSections: ServerComponent<AdminSectionProps<any, any>>[];
  adminActions: AdminActionRegistration[];
  companyRegistries: CompanyRegistryProvider<any, any>[];
}

export interface ExtensionBuilder<S, K> {
  rule(entity: Entity, operation: BeforeOperation, handler: RuleHandler<S, K>, options?: RuleOptions): void;
  after(entity: Entity, operation: AfterOperation, handler: AfterHandler<S, K>): void;
  on(event: string, handler: EventHandler<S, K>): void;
  cron(id: string, schedule: string, handler: JobHandler<S, K>): void;
  accountTab(tab: { id: string; title: string; component: ServerComponent<AccountSlotProps<S, K>>; roles?: Role[] }): void;
  accountPanel(panel: { id: string; component: ServerComponent<AccountSlotProps<S, K>>; roles?: Role[] }): void;
  orderPanel(panel: { id: string; component: ServerComponent<OrderSlotProps<S, K>>; roles?: Role[] }): void;
  page(page: { path: string; title: string; component: ServerComponent<PageProps<S, K>>; roles?: Role[]; nav?: { label: string } }): void;
  adminSection(component: ServerComponent<AdminSectionProps<S, K>>): void;
  adminAction(action: { id: string; label: string; handler: (ctx: PluginContext<S, K>) => Promise<string | void> }): void;
  companyRegistry(provider: CompanyRegistryProvider<S, K>): void;
}

type AnyObject = z.ZodObject<any>;

export interface PluginManifest<S extends AnyObject, K extends AnyObject> {
  id: string;
  name: string;
  version: string;
  sdk: string;
  description: string;
  permissions: Permission[];
  settings?: S;
  secrets?: K;
  extensions: (x: ExtensionBuilder<z.infer<S>, z.infer<K>>) => void;
  onInstall?: (ctx: PluginContext<z.infer<S>, z.infer<K>>) => Promise<void> | void;
  onUpgrade?: (ctx: PluginContext<z.infer<S>, z.infer<K>>, fromVersion: string) => Promise<void> | void;
  onUninstall?: (ctx: PluginContext<z.infer<S>, z.infer<K>>) => Promise<void> | void;
}

export interface PluginDefinition {
  id: string;
  name: string;
  version: string;
  sdk: string;
  description: string;
  permissions: Permission[];
  settings: AnyObject;
  secrets: AnyObject;
  extensions: PluginExtensions;
  onInstall?: (ctx: PluginContext<any, any>) => Promise<void> | void;
  onUpgrade?: (ctx: PluginContext<any, any>, fromVersion: string) => Promise<void> | void;
  onUninstall?: (ctx: PluginContext<any, any>) => Promise<void> | void;
}
