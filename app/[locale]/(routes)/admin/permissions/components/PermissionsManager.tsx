"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  clearUserPermissions,
  createPermissionGroup,
  deletePermissionGroup,
  resetRolePermissions,
  setGroupMembers,
  setGroupPermission,
  setRolePermission,
  setUserPermission,
} from "@/actions/admin/permissions";
import {
  resolvePermissions,
  type Effect,
  type FeatureKey,
  type PermissionAction,
  type PermissionMatrix as Matrix,
} from "@/lib/authz/permissions";
import { mapLegacyRole, type AppRole } from "@/lib/authz/roles";
import { cellKey, PermissionMatrix, type CellChoice } from "./PermissionMatrix";

type RoleOverride = { role: string; feature: string; action: string; allowed: boolean };
type EffectRow = { feature: string; action: string; effect: Effect };
type Group = {
  id: string;
  name: string;
  description: string | null;
  memberIds: string[];
  permissions: EffectRow[];
};
type UserRow = { id: string; name: string; email: string; role: string };
type UserOverride = EffectRow & { userId: string };

type Props = {
  roleOverrides: RoleOverride[];
  groups: Group[];
  users: UserRow[];
  userOverrides: UserOverride[];
};

const EDITABLE_ROLES: AppRole[] = ["user", "trainee", "manager"];
const ROLE_LABEL: Record<AppRole, string> = {
  user: "User",
  trainee: "Trainee",
  manager: "Manager",
  admin: "Admin",
};

function toChoices(rows: EffectRow[]): Record<string, CellChoice> {
  return Object.fromEntries(rows.map((r) => [cellKey(r.feature, r.action), r.effect]));
}

function fromChoices(choices: Record<string, CellChoice>): EffectRow[] {
  return Object.entries(choices)
    .filter(([, v]) => v !== "INHERIT")
    .map(([key, effect]) => {
      const [feature, action] = key.split(":");
      return { feature, action, effect: effect as Effect };
    });
}

export function PermissionsManager(props: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [roleOverrides, setRoleOverrides] = useState(props.roleOverrides);
  const [groups, setGroups] = useState(props.groups);
  const [userOverrides, setUserOverrides] = useState(props.userOverrides);

  const run = (action: () => Promise<{ error: string } | { data: unknown }>, rollback: () => void) => {
    startTransition(async () => {
      const result = await action();
      if ("error" in result) {
        rollback();
        toast.error(result.error);
      } else {
        router.refresh();
      }
    });
  };

  return (
    <Tabs defaultValue="roles" className="w-full">
      <TabsList>
        <TabsTrigger value="roles">Role defaults</TabsTrigger>
        <TabsTrigger value="groups">Groups</TabsTrigger>
        <TabsTrigger value="people">People</TabsTrigger>
      </TabsList>

      <p className="mt-3 text-sm text-muted-foreground">
        A personal setting beats group settings, and group settings beat the role default. If any of a
        person&apos;s groups denies something, the deny wins over another group&apos;s allow. Admins always
        have full access.
      </p>

      <TabsContent value="roles" className="mt-4">
        <RoleDefaultsTab
          overrides={roleOverrides}
          pending={pending}
          onToggle={(role, feature, action, allowed) => {
            const previous = roleOverrides;
            setRoleOverrides((rows) => [
              ...rows.filter((r) => !(r.role === role && r.feature === feature && r.action === action)),
              { role, feature, action, allowed },
            ]);
            run(() => setRolePermission(role, feature, action, allowed), () => setRoleOverrides(previous));
          }}
          onReset={(role) => {
            const previous = roleOverrides;
            setRoleOverrides((rows) => rows.filter((r) => r.role !== role));
            run(() => resetRolePermissions(role), () => setRoleOverrides(previous));
          }}
        />
      </TabsContent>

      <TabsContent value="groups" className="mt-4">
        <GroupsTab
          groups={groups}
          users={props.users}
          pending={pending}
          onCreate={(name, description) => {
            startTransition(async () => {
              const result = await createPermissionGroup(name, description);
              if ("error" in result) {
                toast.error(result.error);
                return;
              }
              setGroups((rows) =>
                [...rows, { id: result.data.id, name, description, memberIds: [], permissions: [] }].sort(
                  (a, b) => a.name.localeCompare(b.name)
                )
              );
              toast.success("Group created");
              router.refresh();
            });
          }}
          onDelete={(groupId) => {
            const previous = groups;
            setGroups((rows) => rows.filter((g) => g.id !== groupId));
            run(() => deletePermissionGroup(groupId), () => setGroups(previous));
          }}
          onMembers={(groupId, memberIds) => {
            const previous = groups;
            setGroups((rows) => rows.map((g) => (g.id === groupId ? { ...g, memberIds } : g)));
            run(() => setGroupMembers(groupId, memberIds), () => setGroups(previous));
          }}
          onPermission={(groupId, feature, action, effect) => {
            const previous = groups;
            setGroups((rows) =>
              rows.map((g) => {
                if (g.id !== groupId) return g;
                const choices = { ...toChoices(g.permissions), [cellKey(feature, action)]: effect };
                return { ...g, permissions: fromChoices(choices) };
              })
            );
            run(() => setGroupPermission(groupId, feature, action, effect), () => setGroups(previous));
          }}
        />
      </TabsContent>

      <TabsContent value="people" className="mt-4">
        <PeopleTab
          users={props.users}
          groups={groups}
          roleOverrides={roleOverrides}
          userOverrides={userOverrides}
          pending={pending}
          onPermission={(userId, feature, action, effect) => {
            const previous = userOverrides;
            setUserOverrides((rows) => {
              const rest = rows.filter((r) => !(r.userId === userId && r.feature === feature && r.action === action));
              return effect === "INHERIT" ? rest : [...rest, { userId, feature, action, effect }];
            });
            run(() => setUserPermission(userId, feature, action, effect), () => setUserOverrides(previous));
          }}
          onClear={(userId) => {
            const previous = userOverrides;
            setUserOverrides((rows) => rows.filter((r) => r.userId !== userId));
            run(() => clearUserPermissions(userId), () => setUserOverrides(previous));
          }}
        />
      </TabsContent>
    </Tabs>
  );
}

function roleMatrix(role: AppRole, overrides: RoleOverride[]): Matrix {
  return resolvePermissions({
    role,
    roleOverrides: overrides.filter((o) => o.role === role),
    groupEntries: [],
    userEntries: [],
  });
}

function RoleDefaultsTab({
  overrides,
  pending,
  onToggle,
  onReset,
}: {
  overrides: RoleOverride[];
  pending: boolean;
  onToggle: (role: AppRole, feature: FeatureKey, action: PermissionAction, allowed: boolean) => void;
  onReset: (role: AppRole) => void;
}) {
  const [role, setRole] = useState<AppRole>("user");
  const values = useMemo(() => roleMatrix(role, overrides), [role, overrides]);
  const customised = overrides.some((o) => o.role === role);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-base">Default access by role</CardTitle>
          <CardDescription>
            Everyone with this role starts with these permissions. Admin is not listed because admins always
            have full access.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EDITABLE_ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {ROLE_LABEL[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            disabled={pending || !customised}
            onClick={() => onReset(role)}
          >
            Reset to built-in
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <PermissionMatrix
          mode="boolean"
          values={values}
          disabled={pending}
          onToggle={(feature, action, next) => onToggle(role, feature, action, next)}
        />
      </CardContent>
    </Card>
  );
}

function GroupsTab({
  groups,
  users,
  pending,
  onCreate,
  onDelete,
  onMembers,
  onPermission,
}: {
  groups: Group[];
  users: UserRow[];
  pending: boolean;
  onCreate: (name: string, description: string) => void;
  onDelete: (groupId: string) => void;
  onMembers: (groupId: string, memberIds: string[]) => void;
  onPermission: (groupId: string, feature: FeatureKey, action: PermissionAction, effect: CellChoice) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(groups[0]?.id ?? null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const selected = groups.find((g) => g.id === selectedId) ?? groups[0] ?? null;

  return (
    <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Groups</CardTitle>
          <CardDescription>Give a set of people extra or reduced access together.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim()) return;
              onCreate(name.trim(), description.trim());
              setName("");
              setDescription("");
            }}
          >
            <Input placeholder="Group name, e.g. Finance team" value={name} onChange={(e) => setName(e.target.value)} />
            <Input
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <Button type="submit" size="sm" className="w-full" disabled={pending || name.trim().length < 2}>
              Create group
            </Button>
          </form>
          <div className="space-y-1">
            {groups.length === 0 && <p className="text-sm text-muted-foreground">No groups yet.</p>}
            {groups.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setSelectedId(g.id)}
                className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                  selected?.id === g.id ? "bg-primary/10 text-primary" : "hover:bg-muted"
                }`}
              >
                <span className="truncate">{g.name}</span>
                <Badge variant="secondary" className="gap-1">
                  <Users className="h-3 w-3" />
                  {g.memberIds.length}
                </Badge>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {selected ? (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
            <div className="space-y-1">
              <CardTitle className="text-base">{selected.name}</CardTitle>
              <CardDescription>
                {selected.description || "Inherit leaves the member's role default in place."}
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive"
              disabled={pending}
              onClick={() => {
                if (confirm(`Delete group "${selected.name}"? Members keep their role defaults.`)) {
                  onDelete(selected.id);
                  setSelectedId(null);
                }
              }}
            >
              <Trash2 className="mr-1 h-4 w-4" />
              Delete
            </Button>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <p className="mb-2 text-sm font-medium">Members</p>
              <div className="grid max-h-56 gap-1 overflow-y-auto rounded-md border p-2 sm:grid-cols-2">
                {users.map((u) => {
                  const checked = selected.memberIds.includes(u.id);
                  return (
                    <label key={u.id} className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-muted">
                      <Checkbox
                        checked={checked}
                        disabled={pending}
                        onCheckedChange={(value) => {
                          const next = value
                            ? [...selected.memberIds, u.id]
                            : selected.memberIds.filter((id) => id !== u.id);
                          onMembers(selected.id, next);
                        }}
                      />
                      <span className="truncate">{u.name}</span>
                      <span className="ml-auto text-xs text-muted-foreground">{ROLE_LABEL[mapLegacyRole(u.role)]}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Group permissions</p>
              <PermissionMatrix
                mode="choice"
                choices={toChoices(selected.permissions)}
                disabled={pending}
                onChange={(feature, action, effect) => onPermission(selected.id, feature, action, effect)}
              />
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            Create a group to start.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PeopleTab({
  users,
  groups,
  roleOverrides,
  userOverrides,
  pending,
  onPermission,
  onClear,
}: {
  users: UserRow[];
  groups: Group[];
  roleOverrides: RoleOverride[];
  userOverrides: UserOverride[];
  pending: boolean;
  onPermission: (userId: string, feature: FeatureKey, action: PermissionAction, effect: CellChoice) => void;
  onClear: (userId: string) => void;
}) {
  const [userId, setUserId] = useState<string>(users[0]?.id ?? "");
  const user = users.find((u) => u.id === userId);
  const role = mapLegacyRole(user?.role);
  const memberOf = groups.filter((g) => g.memberIds.includes(userId));
  const personal = userOverrides.filter((o) => o.userId === userId);

  const effective = useMemo(
    () =>
      resolvePermissions({
        role,
        roleOverrides: roleOverrides.filter((o) => o.role === role),
        groupEntries: memberOf.flatMap((g) => g.permissions),
        userEntries: personal,
      }),
    [role, roleOverrides, memberOf, personal]
  );

  if (!user) {
    return <p className="text-sm text-muted-foreground">No users yet.</p>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-base">Personal access</CardTitle>
          <CardDescription>
            Role: {ROLE_LABEL[role]}
            {memberOf.length > 0 ? ` · Groups: ${memberOf.map((g) => g.name).join(", ")}` : " · No groups"}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Select value={userId} onValueChange={setUserId}>
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name} — {u.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            disabled={pending || personal.length === 0}
            onClick={() => onClear(userId)}
          >
            Clear overrides
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {role === "admin" ? (
          <p className="text-sm text-muted-foreground">
            Admins always have full access. Change their role to User or Manager to limit it.
          </p>
        ) : (
          <PermissionMatrix
            mode="choice"
            choices={toChoices(personal)}
            effective={effective}
            disabled={pending}
            onChange={(feature, action, effect) => onPermission(userId, feature, action, effect)}
          />
        )}
      </CardContent>
    </Card>
  );
}

