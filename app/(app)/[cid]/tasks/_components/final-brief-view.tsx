// in app/(app)/[cid]/tasks/_components/final-brief-view.tsx
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';

interface WizardProps {
  finalBrief: string;
  isPending: boolean;
  handleAcceptBrief: () => void;
}

export function FinalBriefView({ wizard }: { wizard: WizardProps }) {
  return (
    <div className="flex flex-col h-full max-h-[60vh] space-y-4">
      <Card className="flex-1 overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle>Refined Project Brief</CardTitle>
        </CardHeader>
        <CardContent className="overflow-y-auto max-h-[45vh] pr-4">
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{wizard.finalBrief}</p>
        </CardContent>
      </Card>
      <div className="flex-shrink-0 pt-2">
        <Button onClick={wizard.handleAcceptBrief} className="w-full" disabled={wizard.isPending}>
          {wizard.isPending ? 'Generating Board...' : 'Accept & Generate Board'}
          <Sparkles className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}