'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { deleteUserMailAccount } from '@/actions/mail/account-actions';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface RemoveAccountButtonProps {
  accountId: string;
}

export const RemoveAccountButton = ({ accountId }: RemoveAccountButtonProps) => {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteUserMailAccount(accountId);
      if (result.error) {
        toast.error('Failed to remove account', { description: result.error });
      } else {
        toast.success('Mail account removed successfully');
        router.refresh(); // Refresh the page to update the list
      }
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" disabled={isPending}>
          Remove
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete this mail account configuration.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={isPending}>
            Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
