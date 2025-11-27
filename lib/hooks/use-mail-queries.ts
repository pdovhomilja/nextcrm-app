"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getMailList,
  getMailContent,
  getMailFolders,
  searchMail,
} from "@/actions/mail/read-actions";

// Cache configuration constants
const MAIL_LIST_STALE_TIME = 15 * 60 * 1000; // 15 minutes
const MAIL_LIST_GC_TIME = 30 * 60 * 1000; // 30 minutes
const MAIL_CONTENT_STALE_TIME = 15 * 60 * 1000; // 15 minutes
const MAIL_CONTENT_GC_TIME = 60 * 60 * 1000; // 1 hour for content
const FOLDER_STALE_TIME = 30 * 60 * 1000; // 30 minutes (folders rarely change)
const SEARCH_STALE_TIME = 5 * 60 * 1000; // 5 minutes for search

// Email list hook
export function useMailList(
  accountId: string | null,
  folderName: string | null
) {
  return useQuery({
    queryKey: ["mail", "list", accountId, folderName],
    queryFn: () => getMailList(accountId!, folderName!, 1),
    enabled: !!accountId && !!folderName,
    staleTime: MAIL_LIST_STALE_TIME,
    gcTime: MAIL_LIST_GC_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

// Individual email content hook
export function useMailContent(
  accountId: string | null,
  folderName: string | null,
  mailUid: string | null
) {
  return useQuery({
    queryKey: ["mail", "content", accountId, folderName, mailUid],
    queryFn: () => getMailContent(accountId!, folderName!, mailUid!),
    enabled: !!accountId && !!folderName && !!mailUid,
    staleTime: MAIL_CONTENT_STALE_TIME,
    gcTime: MAIL_CONTENT_GC_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

// Folder list hook
export function useMailFolders(accountId: string | null) {
  return useQuery({
    queryKey: ["mail", "folders", accountId],
    queryFn: () => getMailFolders(accountId!),
    enabled: !!accountId,
    staleTime: FOLDER_STALE_TIME,
    gcTime: FOLDER_STALE_TIME * 2,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

// Search mail hook (with shorter cache time)
export function useSearchMail(
  accountId: string | null,
  folderName: string | null,
  searchQuery: string
) {
  const trimmedQuery = searchQuery.trim();

  return useQuery({
    queryKey: ["mail", "search", accountId, folderName, trimmedQuery],
    queryFn: () => searchMail(accountId!, folderName!, trimmedQuery),
    enabled: !!accountId && !!folderName && trimmedQuery.length > 0,
    staleTime: SEARCH_STALE_TIME,
    gcTime: SEARCH_STALE_TIME * 2,
    refetchOnWindowFocus: false,
  });
}

// Hook to invalidate mail queries (for reload button)
export function useInvalidateMailQueries() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: ["mail"] }),
    invalidateList: (accountId?: string, folderName?: string) => {
      if (accountId && folderName) {
        queryClient.invalidateQueries({
          queryKey: ["mail", "list", accountId, folderName],
        });
      } else {
        queryClient.invalidateQueries({ queryKey: ["mail", "list"] });
      }
    },
    invalidateFolders: (accountId?: string) => {
      queryClient.invalidateQueries({
        queryKey: accountId
          ? ["mail", "folders", accountId]
          : ["mail", "folders"],
      });
    },
  };
}
