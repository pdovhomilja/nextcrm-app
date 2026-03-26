"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TargetContact {
  id: string;
  name: string | null;
  email: string | null;
  title: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  source: string;
  enrichStatus: string;
}

interface Props {
  targetId: string;
  contacts: TargetContact[];
}

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  COMPLETED: { label: "Enriched", variant: "default" },
  RUNNING:   { label: "Running", variant: "secondary" },
  PENDING:   { label: "Pending", variant: "outline" },
  FAILED:    { label: "Failed", variant: "destructive" },
  SKIPPED:   { label: "Skipped", variant: "outline" },
};

export function TargetContactsTable({ targetId, contacts: initialContacts }: Props) {
  const [contacts, setContacts] = useState(initialContacts);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "" });
  const [saving, setSaving] = useState(false);

  async function handleAddContact(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/crm/targets/${targetId}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(await res.text());
      const created: TargetContact = await res.json();
      setContacts((prev) => [...prev, created]);
      setOpen(false);
      setForm({ name: "", email: "" });
      toast.success("Contact added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add contact");
    } finally {
      setSaving(false);
    }
  }

  async function handleEnrichContact(contactId: string) {
    try {
      const res = await fetch(`/api/crm/targets/${targetId}/contacts/${contactId}/enrich`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(await res.text());
      setContacts((prev) =>
        prev.map((c) => c.id === contactId ? { ...c, enrichStatus: "RUNNING" } : c)
      );
      toast.success("Enrichment started — you'll be notified when done");
    } catch {
      toast.error("Failed to start enrichment");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Contacts</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">Add Contact</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Contact</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddContact} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Jane Smith"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="jane@acme.com"
                />
              </div>
              <Button type="submit" disabled={saving} className="w-full">
                {saving ? "Adding…" : "Add Contact"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {contacts.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No contacts yet. Run enrichment to discover C-level contacts, or add one manually.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.map((contact) => {
              const badge = STATUS_BADGE[contact.enrichStatus] ?? STATUS_BADGE.PENDING;
              return (
                <TableRow key={contact.id}>
                  <TableCell className="font-medium">{contact.name ?? "—"}</TableCell>
                  <TableCell>{contact.title ?? "—"}</TableCell>
                  <TableCell>{contact.email ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                  </TableCell>
                  <TableCell>
                    {(contact.enrichStatus === "PENDING" || contact.enrichStatus === "FAILED") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEnrichContact(contact.id)}
                      >
                        Enrich
                      </Button>
                    )}
                    {contact.linkedinUrl && (
                      <a
                        href={contact.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 text-sm text-blue-600 hover:underline"
                      >
                        LinkedIn
                      </a>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
