'use client';

import React, { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { sendMail } from '@/actions/mail/send-actions';
import { toast } from 'sonner';

export const MailCompose = () => {
  const searchParams = useSearchParams();
  const accountId = searchParams.get('account');
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const handleSend = async () => {
    if (!accountId) {
      toast.error('No account selected');
      return;
    }
    const result = await sendMail(accountId, to, subject, body);
    if (result.success) {
      toast.success('Email sent successfully');
    } else {
      toast.error('Failed to send email');
    }
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">New Email</h2>
      </div>
      <div className="mt-4 space-y-4">
        <Input placeholder="To" value={to} onChange={(e) => setTo(e.target.value)} />
        <Input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
        <Textarea placeholder="Body" rows={15} value={body} onChange={(e) => setBody(e.target.value)} />
      </div>
      <div className="mt-4 flex justify-end">
        <Button onClick={handleSend}>Send</Button>
      </div>
    </div>
  );
};
