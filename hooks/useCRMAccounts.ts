import { create } from "zustand";

import { getAccounts } from "@/actions/crm/get-accounts";

interface CrmAccountsStore {
  accounts: any[];
}

const useAccountsStore = create<CrmAccountsStore>((set) => ({
  accounts: [],
  getAccounts: async () => {
    const accounts = await getAccounts();
    set({ accounts });
  },
}));

export default useAccountsStore;
