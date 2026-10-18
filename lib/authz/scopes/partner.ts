// Partner scope (partner-role spec). A partner works on the accounts he is the
// partner of (`partnerAccountWhere`): the accounts and all their child records.
// His own company account (Users.partnerAccountId) is visible read-only, and
// only the account record, its contacts, orders and invoices
// (`partnerVisibleAccountWhere`, Pavel 2026-10-18). Never through createdBy,
// assigned_to, watchers or public visibility. Callers must check
// `user.role === "partner"` first: the link alone grants nothing.

export function partnerAccountWhere(userId: string) {
  return { deletedAt: null, partnerUserId: userId };
}

export function partnerVisibleAccountWhere(userId: string) {
  return {
    deletedAt: null,
    OR: [
      { partnerUserId: userId },
      { partner_own_users: { some: { id: userId } } },
    ],
  };
}
