"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type Props = {
  initialData: {
    name?: string;
    description?: string;
    from_name?: string;
    reply_to?: string;
  };
  onNext: (data: {
    name: string;
    description?: string;
    from_name?: string;
    reply_to?: string;
  }) => void;
};

export function Step1Details({ initialData, onNext }: Props) {
  const [name, setName] = useState(initialData.name ?? "");
  const [description, setDescription] = useState(
    initialData.description ?? ""
  );
  const [fromName, setFromName] = useState(initialData.from_name ?? "");
  const [replyTo, setReplyTo] = useState(initialData.reply_to ?? "");
  const [error, setError] = useState("");

  const handleNext = () => {
    if (!name.trim()) {
      setError("Campaign name is required");
      return;
    }
    onNext({
      name: name.trim(),
      description: description || undefined,
      from_name: fromName || undefined,
      reply_to: replyTo || undefined,
    });
  };

  return (
    <div className="flex flex-col gap-4 max-w-lg">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Campaign Name *</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError("");
          }}
          placeholder="e.g. Q2 Product Outreach"
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description..."
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="fromName">From Name</Label>
        <Input
          id="fromName"
          value={fromName}
          onChange={(e) => setFromName(e.target.value)}
          placeholder="e.g. Jane from Acme"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="replyTo">Reply-to Email</Label>
        <Input
          id="replyTo"
          value={replyTo}
          onChange={(e) => setReplyTo(e.target.value)}
          placeholder="reply@yourcompany.com"
        />
      </div>
      <div className="flex justify-end">
        <Button onClick={handleNext}>Next →</Button>
      </div>
    </div>
  );
}
