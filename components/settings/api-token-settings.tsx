"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createApiTokenAction,
  revokeApiTokenAction,
  listApiTokensAction,
} from "@/actions/api-tokens";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Copy, Download, Plus, Trash2 } from "lucide-react";

interface ApiToken {
  id: string;
  name: string;
  tokenPrefix: string;
  scope: string;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
}

export function ApiTokenSettings() {
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [loading, setLoading] = useState(true);

  // Create dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [tokenName, setTokenName] = useState("");
  const [expiration, setExpiration] = useState("never");
  const [creating, setCreating] = useState(false);

  // Reveal dialog state
  const [revealedToken, setRevealedToken] = useState<string | null>(null);
  const [revealOpen, setRevealOpen] = useState(false);

  const loadTokens = useCallback(async () => {
    try {
      const result = await listApiTokensAction();
      setTokens(result);
    } catch {
      toast.error("Failed to load tokens");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTokens();
  }, [loadTokens]);

  async function handleCreate() {
    if (!tokenName.trim()) {
      toast.error("Token name is required");
      return;
    }

    setCreating(true);
    try {
      const expiresMap: Record<string, number | undefined> = {
        never: undefined,
        "30": 30,
        "90": 90,
        "365": 365,
      };

      const { rawToken } = await createApiTokenAction(
        tokenName.trim(),
        expiresMap[expiration]
      );

      setRevealedToken(rawToken);
      setCreateOpen(false);
      setRevealOpen(true);
      setTokenName("");
      setExpiration("never");
      await loadTokens();
      toast.success("Token created");
    } catch {
      toast.error("Failed to create token");
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(tokenId: string) {
    try {
      await revokeApiTokenAction(tokenId);
      await loadTokens();
      toast.success("Token revoked");
    } catch {
      toast.error("Failed to revoke token");
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  }

  function downloadSkillMd() {
    const link = document.createElement("a");
    link.href = "/SKILL.md";
    link.download = "SKILL.md";
    link.click();
  }

  function formatDate(date: Date | null) {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>API Tokens</CardTitle>
            <CardDescription>
              Generate tokens for external AI agents (e.g. OpenClaw) to access
              TaskHQ via MCP endpoints.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={downloadSkillMd}>
              <Download className="mr-2 h-4 w-4" />
              SKILL.md
            </Button>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  New Token
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create API Token</DialogTitle>
                  <DialogDescription>
                    This token will allow external agents to manage boards and
                    tasks in your company.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="token-name">Token Name</Label>
                    <Input
                      id="token-name"
                      placeholder="e.g. OpenClaw Agent"
                      value={tokenName}
                      onChange={(e) => setTokenName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expiration">Expiration</Label>
                    <Select value={expiration} onValueChange={setExpiration}>
                      <SelectTrigger id="expiration">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="never">Never</SelectItem>
                        <SelectItem value="30">30 days</SelectItem>
                        <SelectItem value="90">90 days</SelectItem>
                        <SelectItem value="365">1 year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setCreateOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleCreate} disabled={creating}>
                    {creating ? "Creating..." : "Create Token"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Token reveal dialog */}
        <Dialog open={revealOpen} onOpenChange={setRevealOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Token Created</DialogTitle>
              <DialogDescription>
                Copy this token now — you will not be able to see it again.
              </DialogDescription>
            </DialogHeader>
            <div className="my-4">
              <code className="block w-full break-all rounded-md bg-muted p-3 text-sm font-mono">
                {revealedToken}
              </code>
            </div>
            <DialogFooter>
              <Button
                onClick={() => {
                  if (revealedToken) copyToClipboard(revealedToken);
                }}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy Token
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setRevealOpen(false);
                  setRevealedToken(null);
                }}
              >
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {loading ? (
          <p className="text-sm text-muted-foreground py-4">Loading tokens...</p>
        ) : tokens.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            No tokens yet. Create one to let external agents interact with
            TaskHQ.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Token</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Last Used</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {tokens.map((token) => (
                <TableRow key={token.id}>
                  <TableCell className="font-medium">{token.name}</TableCell>
                  <TableCell>
                    <code className="text-xs text-muted-foreground">
                      {token.tokenPrefix}...
                    </code>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{token.scope}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(token.lastUsedAt)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {token.expiresAt ? formatDate(token.expiresAt) : "Never"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(token.createdAt)}
                  </TableCell>
                  <TableCell>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Revoke Token</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will immediately revoke &quot;{token.name}
                            &quot;. Any agents using this token will lose access.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleRevoke(token.id)}
                          >
                            Revoke
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
