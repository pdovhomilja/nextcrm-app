/**
 * Junction Table Helpers
 *
 * Standardized utility functions for working with many-to-many relationships
 * through junction tables in the PostgreSQL schema.
 *
 * This library provides helper functions for the 10 junction tables created
 * during the MongoDB to PostgreSQL migration:
 * - DocumentsToInvoices
 * - DocumentsToOpportunities
 * - DocumentsToContacts
 * - DocumentsToTasks
 * - DocumentsToCrmAccountsTasks
 * - DocumentsToLeads
 * - DocumentsToAccounts
 * - AccountWatchers
 * - BoardWatchers
 * - ContactsToOpportunities
 *
 * Usage:
 * ```typescript
 * import { junctionTableHelpers } from '@/lib/junction-helpers';
 *
 * // Connect documents on create
 * const account = await prisma.crm_Accounts.create({
 *   data: {
 *     name: 'Acme Corp',
 *     documents: junctionTableHelpers.connectDocuments(documentIds)
 *   }
 * });
 *
 * // Update documents (replace all)
 * await prisma.crm_Accounts.update({
 *   where: { id },
 *   data: {
 *     documents: junctionTableHelpers.updateDocuments(newDocumentIds)
 *   }
 * });
 *
 * // Query entities with documents
 * const accounts = await prisma.crm_Accounts.findMany({
 *   where: junctionTableHelpers.hasDocument(documentId)
 * });
 * ```
 *
 * @see /docs/POSTGRESQL_MIGRATION_GUIDE.md for detailed examples
 */

/**
 * Junction table helper functions for standardized operations
 */
export const junctionTableHelpers = {
  /**
   * Connect documents to an entity on create
   *
   * Use when creating a new entity that should be linked to documents.
   * Creates new junction table entries linking the entity to the specified documents.
   *
   * @param documentIds - Array of document IDs to connect
   * @returns Prisma create input for document junction tables, or undefined if empty
   *
   * @example
   * ```typescript
   * const account = await prisma.crm_Accounts.create({
   *   data: {
   *     name: 'Acme Corp',
   *     documents: junctionTableHelpers.connectDocuments(['doc-uuid-1', 'doc-uuid-2'])
   *   }
   * });
   * ```
   */
  connectDocuments(documentIds: string[]) {
    if (!documentIds || documentIds.length === 0) return undefined;
    return {
      create: documentIds.map((id) => ({ document_id: id })),
    };
  },

  /**
   * Update documents for an entity (removes all old, adds new)
   *
   * Use when you want to completely replace all document associations.
   * Deletes all existing junction table entries and creates new ones.
   *
   * @param newDocumentIds - Array of document IDs to set
   * @returns Prisma update input for document junction tables
   *
   * @example
   * ```typescript
   * await prisma.crm_Accounts.update({
   *   where: { id: accountId },
   *   data: {
   *     documents: junctionTableHelpers.updateDocuments(['doc-uuid-3', 'doc-uuid-4'])
   *   }
   * });
   * ```
   */
  updateDocuments(newDocumentIds: string[]) {
    return {
      deleteMany: {},
      create: newDocumentIds.map((id) => ({ document_id: id })),
    };
  },

  /**
   * Add documents to an entity without removing existing ones
   *
   * Use when you want to add additional documents to an entity
   * without affecting existing document associations.
   *
   * @param documentIds - Array of document IDs to add
   * @returns Prisma create input for document junction tables, or undefined if empty
   *
   * @example
   * ```typescript
   * await prisma.crm_Accounts.update({
   *   where: { id: accountId },
   *   data: {
   *     documents: junctionTableHelpers.addDocuments(['doc-uuid-5'])
   *   }
   * });
   * ```
   */
  addDocuments(documentIds: string[]) {
    if (!documentIds || documentIds.length === 0) return undefined;
    return {
      create: documentIds.map((id) => ({ document_id: id })),
    };
  },

  /**
   * Remove specific documents from an entity
   *
   * Use when you want to remove specific document associations
   * while keeping other documents linked.
   *
   * @param documentIds - Array of document IDs to remove
   * @returns Prisma delete input for document junction tables, or undefined if empty
   *
   * @example
   * ```typescript
   * await prisma.crm_Accounts.update({
   *   where: { id: accountId },
   *   data: {
   *     documents: junctionTableHelpers.removeDocuments(['doc-uuid-2'])
   *   }
   * });
   * ```
   */
  removeDocuments(documentIds: string[]) {
    if (!documentIds || documentIds.length === 0) return undefined;
    return {
      delete: documentIds.map((id) => ({ document_id: id })),
    };
  },

  /**
   * Connect watchers to an entity on create
   *
   * Use when creating a new entity (Account or Board) that should have watchers.
   * Creates new watcher junction table entries.
   *
   * @param userIds - Array of user IDs to connect as watchers
   * @returns Prisma create input for watcher junction tables, or undefined if empty
   *
   * @example
   * ```typescript
   * const account = await prisma.crm_Accounts.create({
   *   data: {
   *     name: 'Acme Corp',
   *     watchers: junctionTableHelpers.connectWatchers([userId])
   *   }
   * });
   * ```
   */
  connectWatchers(userIds: string[]) {
    if (!userIds || userIds.length === 0) return undefined;
    return {
      create: userIds.map((id) => ({ user_id: id })),
    };
  },

  /**
   * Update watchers for an entity (removes all old, adds new)
   *
   * Use when you want to completely replace all watchers for an entity.
   * Deletes all existing watcher entries and creates new ones.
   *
   * @param newUserIds - Array of user IDs to set as watchers
   * @returns Prisma update input for watcher junction tables
   *
   * @example
   * ```typescript
   * await prisma.crm_Accounts.update({
   *   where: { id: accountId },
   *   data: {
   *     watchers: junctionTableHelpers.updateWatchers([userId1, userId2])
   *   }
   * });
   * ```
   */
  updateWatchers(newUserIds: string[]) {
    return {
      deleteMany: {},
      create: newUserIds.map((id) => ({ user_id: id })),
    };
  },

  /**
   * Add a single watcher to an entity
   *
   * Use when you want to add one watcher without affecting existing watchers.
   * Creates a single new watcher junction table entry.
   *
   * @param userId - User ID to add as watcher
   * @returns Prisma create input for watcher junction tables
   *
   * @example
   * ```typescript
   * await prisma.crm_Accounts.update({
   *   where: { id: accountId },
   *   data: {
   *     watchers: junctionTableHelpers.addWatcher(userId)
   *   }
   * });
   * ```
   */
  addWatcher(userId: string) {
    return {
      create: { user_id: userId },
    };
  },

  /**
   * Remove a single watcher from an account
   *
   * Use when you want to remove a specific watcher from an account.
   * Deletes the watcher junction table entry using the composite primary key.
   *
   * @param accountId - Account ID
   * @param userId - User ID to remove from watchers
   * @returns Prisma delete input for AccountWatchers junction table
   *
   * @example
   * ```typescript
   * await prisma.crm_Accounts.update({
   *   where: { id: accountId },
   *   data: {
   *     watchers: junctionTableHelpers.removeAccountWatcher(accountId, userId)
   *   }
   * });
   * ```
   */
  removeAccountWatcher(accountId: string, userId: string) {
    return {
      delete: {
        account_id_user_id: {
          account_id: accountId,
          user_id: userId,
        },
      },
    };
  },

  /**
   * Remove a single watcher from a board
   *
   * Use when you want to remove a specific watcher from a board.
   * Deletes the watcher junction table entry using the composite primary key.
   *
   * @param boardId - Board ID
   * @param userId - User ID to remove from watchers
   * @returns Prisma delete input for BoardWatchers junction table
   *
   * @example
   * ```typescript
   * await prisma.boards.update({
   *   where: { id: boardId },
   *   data: {
   *     watchers: junctionTableHelpers.removeBoardWatcher(boardId, userId)
   *   }
   * });
   * ```
   */
  removeBoardWatcher(boardId: string, userId: string) {
    return {
      delete: {
        board_id_user_id: {
          board_id: boardId,
          user_id: userId,
        },
      },
    };
  },

  /**
   * Connect contacts to an opportunity on create
   *
   * Use when creating a new opportunity that should be linked to contacts.
   * Creates new ContactsToOpportunities junction table entries.
   *
   * @param contactIds - Array of contact IDs to connect
   * @returns Prisma create input for ContactsToOpportunities junction table, or undefined if empty
   *
   * @example
   * ```typescript
   * const opportunity = await prisma.crm_Opportunities.create({
   *   data: {
   *     name: 'New Deal',
   *     contacts: junctionTableHelpers.connectContactsToOpportunity(['contact-uuid-1', 'contact-uuid-2'])
   *   }
   * });
   * ```
   */
  connectContactsToOpportunity(contactIds: string[]) {
    if (!contactIds || contactIds.length === 0) return undefined;
    return {
      create: contactIds.map((id) => ({ contact_id: id })),
    };
  },

  /**
   * Update contacts for an opportunity (removes all old, adds new)
   *
   * Use when you want to completely replace all contact associations for an opportunity.
   * Deletes all existing ContactsToOpportunities entries and creates new ones.
   *
   * @param newContactIds - Array of contact IDs to set
   * @returns Prisma update input for ContactsToOpportunities junction table
   *
   * @example
   * ```typescript
   * await prisma.crm_Opportunities.update({
   *   where: { id: opportunityId },
   *   data: {
   *     contacts: junctionTableHelpers.updateContactsForOpportunity(['contact-uuid-3', 'contact-uuid-4'])
   *   }
   * });
   * ```
   */
  updateContactsForOpportunity(newContactIds: string[]) {
    return {
      deleteMany: {},
      create: newContactIds.map((id) => ({ contact_id: id })),
    };
  },

  /**
   * Filter condition for entities that have a specific document
   *
   * Use in where clauses to find entities linked to a specific document.
   *
   * @param documentId - Document ID to filter by
   * @returns Prisma where condition for document junction tables
   *
   * @example
   * ```typescript
   * const accounts = await prisma.crm_Accounts.findMany({
   *   where: junctionTableHelpers.hasDocument(documentId)
   * });
   * ```
   */
  hasDocument(documentId: string) {
    return {
      documents: {
        some: {
          document_id: documentId,
        },
      },
    };
  },

  /**
   * Filter condition for entities that have any of the specified documents
   *
   * Use in where clauses to find entities linked to any of the specified documents.
   *
   * @param documentIds - Array of document IDs to filter by
   * @returns Prisma where condition for document junction tables
   *
   * @example
   * ```typescript
   * const accounts = await prisma.crm_Accounts.findMany({
   *   where: junctionTableHelpers.hasAnyDocument([documentId1, documentId2])
   * });
   * ```
   */
  hasAnyDocument(documentIds: string[]) {
    return {
      documents: {
        some: {
          document_id: {
            in: documentIds,
          },
        },
      },
    };
  },

  /**
   * Filter condition for entities watched by a specific user
   *
   * Use in where clauses to find accounts or boards watched by a user.
   *
   * @param userId - User ID to filter by
   * @returns Prisma where condition for watcher junction tables
   *
   * @example
   * ```typescript
   * const accountsWatching = await prisma.crm_Accounts.findMany({
   *   where: junctionTableHelpers.watchedByUser(userId)
   * });
   * ```
   */
  watchedByUser(userId: string) {
    return {
      watchers: {
        some: {
          user_id: userId,
        },
      },
    };
  },

  /**
   * Include watchers with user details
   *
   * Use in include clauses to get watcher junction table entries with user information.
   * Returns a standard set of user fields (id, name, email, avatar).
   *
   * @returns Prisma include for watchers with user data
   *
   * @example
   * ```typescript
   * const account = await prisma.crm_Accounts.findUnique({
   *   where: { id: accountId },
   *   include: junctionTableHelpers.includeWatchersWithUsers()
   * });
   * const watcherUsers = extractWatcherUsers(account.watchers);
   * ```
   */
  includeWatchersWithUsers() {
    return {
      watchers: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
        },
      },
    };
  },

  /**
   * Include documents with full details
   *
   * Use in include clauses to get document junction table entries with document information.
   * Returns document metadata and the user who created it.
   *
   * @returns Prisma include for documents
   *
   * @example
   * ```typescript
   * const account = await prisma.crm_Accounts.findUnique({
   *   where: { id: accountId },
   *   include: junctionTableHelpers.includeDocuments()
   * });
   * const documents = extractDocuments(account.documents);
   * ```
   */
  includeDocuments() {
    return {
      documents: {
        include: {
          document: {
            select: {
              id: true,
              document_name: true,
              document_type: true,
              document_file_url: true,
              document_file_mimeType: true,
              createdAt: true,
              created_by_user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      },
    };
  },
};

/**
 * Extract user objects from watcher junction table query results
 *
 * Converts junction table result (array of { user: User }) to array of User objects.
 *
 * @param watchers - Array of watcher junction table entries from query result
 * @returns Array of user objects
 *
 * @example
 * ```typescript
 * const account = await prisma.crm_Accounts.findUnique({
 *   where: { id },
 *   include: junctionTableHelpers.includeWatchersWithUsers()
 * });
 * const users = extractWatcherUsers(account.watchers || []);
 * // users = [{ id: '...', name: 'John Doe', email: '...', avatar: '...' }, ...]
 * ```
 */
export function extractWatcherUsers(watchers: any[]) {
  if (!watchers || !Array.isArray(watchers)) return [];
  return watchers.map((w) => w.user);
}

/**
 * Extract document objects from document junction table query results
 *
 * Converts junction table result (array of { document: Document }) to array of Document objects.
 *
 * @param documentJunctions - Array of document junction table entries from query result
 * @returns Array of document objects
 *
 * @example
 * ```typescript
 * const account = await prisma.crm_Accounts.findUnique({
 *   where: { id },
 *   include: junctionTableHelpers.includeDocuments()
 * });
 * const documents = extractDocuments(account.documents || []);
 * // documents = [{ id: '...', document_name: '...', ... }, ...]
 * ```
 */
export function extractDocuments(documentJunctions: any[]) {
  if (!documentJunctions || !Array.isArray(documentJunctions)) return [];
  return documentJunctions.map((d) => d.document);
}

/**
 * Extract contact objects from ContactsToOpportunities junction table query results
 *
 * Converts junction table result (array of { contact: Contact }) to array of Contact objects.
 *
 * @param contactJunctions - Array of ContactsToOpportunities junction table entries from query result
 * @returns Array of contact objects
 *
 * @example
 * ```typescript
 * const opportunity = await prisma.crm_Opportunities.findUnique({
 *   where: { id },
 *   include: {
 *     contacts: {
 *       include: { contact: true }
 *     }
 *   }
 * });
 * const contacts = extractContacts(opportunity.contacts || []);
 * // contacts = [{ id: '...', first_name: '...', last_name: '...', ... }, ...]
 * ```
 */
export function extractContacts(contactJunctions: any[]) {
  if (!contactJunctions || !Array.isArray(contactJunctions)) return [];
  return contactJunctions.map((c) => c.contact);
}

/**
 * Extract opportunity objects from ContactsToOpportunities junction table query results
 *
 * Converts junction table result (array of { opportunity: Opportunity }) to array of Opportunity objects.
 *
 * @param opportunityJunctions - Array of ContactsToOpportunities junction table entries from query result
 * @returns Array of opportunity objects
 *
 * @example
 * ```typescript
 * const contact = await prisma.crm_Contacts.findUnique({
 *   where: { id },
 *   include: {
 *     opportunities: {
 *       include: { opportunity: true }
 *     }
 *   }
 * });
 * const opportunities = extractOpportunities(contact.opportunities || []);
 * // opportunities = [{ id: '...', name: '...', ... }, ...]
 * ```
 */
export function extractOpportunities(opportunityJunctions: any[]) {
  if (!opportunityJunctions || !Array.isArray(opportunityJunctions))
    return [];
  return opportunityJunctions.map((o) => o.opportunity);
}
