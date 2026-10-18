// Partner read scope (partner-role spec, ticket 2). A partner reads only
// the accounts he is the partner of, plus his own company account
// (Users.partnerAccountId, read-only), and their child records. Never through
// createdBy, assigned_to, watchers or public visibility. Callers must check
// `user.role === "partner"` first: the link alone grants nothing.

export function partnerAccountWhere(userId: string) {
  return {
    deletedAt: null,
    OR: [
      { partnerUserId: userId },
      { partner_own_users: { some: { id: userId } } },
    ],
  };
}
