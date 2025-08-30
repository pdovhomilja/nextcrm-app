'use client';

import React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AccountSwitcherProps {
  accounts: {
    id: string;
    email: string;
  }[];
}

export const AccountSwitcher = ({ accounts }: AccountSwitcherProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedAccount = searchParams.get('account');

  const handleValueChange = (value: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('account', value);
    params.delete('folder'); // Reset folder when account changes
    params.delete('email'); // Reset email when account changes
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <Select onValueChange={handleValueChange} value={selectedAccount || ''}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select an account" />
      </SelectTrigger>
      <SelectContent>
        {accounts.map((account) => (
          <SelectItem key={account.id} value={account.id}>
            {account.email}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
