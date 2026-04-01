export interface Session {
  id: string;
  _id: string;
  name: string;
  avatar?: string | null | undefined;
  role: string;
  userLanguage: string;
  userStatus: string;
}
