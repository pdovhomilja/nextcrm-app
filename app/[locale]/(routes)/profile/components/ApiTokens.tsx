"use client";
import { useState, useEffect } from "react";
import { createApiToken, getApiTokens, deleteApiToken } from "@/actions/api-tokens";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type TokenRow = {
  id: string;
  name: string;
  tokenPrefix: string;
  createdAt: Date;
  expiresAt: Date | null;
  revokedAt: Date | null;
};

export function ApiTokens() {
  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [name, setName] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function load() {
    const res = await getApiTokens();
    if (res.data) setTokens(res.data as TokenRow[]);
  }

  useEffect(() => { load(); }, []);

  async function handleCreate() {
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    const res = await createApiToken({
      name: name.trim(),
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    });
    setLoading(false);
    if (res.error) { setError(res.error); return; }
    setNewToken(res.data!.rawToken);
    setName("");
    setExpiresAt("");
    await load();
  }

  async function handleRevoke(tokenId: string) {
    if (!confirm("Revoke this token? This cannot be undone.")) return;
    await deleteApiToken(tokenId);
    await load();
  }

  function handleCopy() {
    if (!newToken) return;
    navigator.clipboard.writeText(newToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const active = tokens.filter(
    (t) => !t.revokedAt && (!t.expiresAt || new Date(t.expiresAt) > new Date())
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>API Tokens</CardTitle>
        <CardDescription>
          Generate tokens to connect AI agents via MCP. Token prefix: <code>nxtc__</code>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Generate form */}
        <div className="flex gap-2">
          <Input
            placeholder="Token name (e.g. Claude Desktop)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="max-w-xs"
          />
          <Input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="max-w-[160px]"
            title="Optional expiry date"
          />
          <Button onClick={handleCreate} disabled={loading || !name.trim()}>
            {loading ? "Generating…" : "Generate"}
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}

        {/* Token list */}
        {active.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Prefix</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {active.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>{t.name}</TableCell>
                  <TableCell className="font-mono text-sm">
                    nxtc__{t.tokenPrefix}…
                  </TableCell>
                  <TableCell>{new Date(t.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {t.expiresAt ? new Date(t.expiresAt).toLocaleDateString() : "Never"}
                  </TableCell>
                  <TableCell>
                    <Button variant="destructive" size="sm" onClick={() => handleRevoke(t.id)}>
                      Revoke
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* New token reveal modal */}
        <Dialog open={!!newToken} onOpenChange={() => setNewToken(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Token Created</DialogTitle>
              <DialogDescription>
                Copy this token now. It will not be shown again.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <code className="block break-all rounded bg-muted p-3 text-sm">
                {newToken}
              </code>
              <Button onClick={handleCopy} className="w-full">
                {copied ? "Copied!" : "Copy to clipboard"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
