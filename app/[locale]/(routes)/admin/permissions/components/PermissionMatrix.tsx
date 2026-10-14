"use client";

import { Check, Minus, X } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  FEATURES,
  PERMISSION_ACTIONS,
  type FeatureKey,
  type PermissionAction,
  type PermissionMatrix as Matrix,
} from "@/lib/authz/permissions";

export type CellChoice = "INHERIT" | "ALLOW" | "DENY";

const ACTION_LABELS: Record<PermissionAction, string> = {
  view: "View",
  create: "Create",
  edit: "Edit",
  delete: "Delete",
};

const NEXT_CHOICE: Record<CellChoice, CellChoice> = {
  INHERIT: "ALLOW",
  ALLOW: "DENY",
  DENY: "INHERIT",
};

type BooleanProps = {
  mode: "boolean";
  values: Matrix;
  onToggle: (feature: FeatureKey, action: PermissionAction, next: boolean) => void;
};

type ChoiceProps = {
  mode: "choice";
  choices: Partial<Record<string, CellChoice>>;
  /** Result after all rules, shown under each cell. */
  effective?: Matrix;
  onChange: (feature: FeatureKey, action: PermissionAction, next: CellChoice) => void;
};

type Props = (BooleanProps | ChoiceProps) & { disabled?: boolean };

export const cellKey = (feature: string, action: string) => `${feature}:${action}`;

export function PermissionMatrix(props: Props) {
  const groups = Array.from(new Set(FEATURES.map((f) => f.group)));

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Feature</th>
            {PERMISSION_ACTIONS.map((action) => (
              <th key={action} className="w-28 px-2 py-2 text-center font-medium">
                {ACTION_LABELS[action]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <GroupRows key={group} group={group} {...props} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GroupRows({ group, ...props }: Props & { group: string }) {
  const features = FEATURES.filter((f) => f.group === group);
  return (
    <>
      <tr className="border-t bg-muted/20">
        <td colSpan={PERMISSION_ACTIONS.length + 1} className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {group}
        </td>
      </tr>
      {features.map((feature) => (
        <tr key={feature.key} className="border-t">
          <td className="px-3 py-2">{feature.label}</td>
          {PERMISSION_ACTIONS.map((action) => (
            <td key={action} className="px-2 py-1.5 text-center">
              <Cell feature={feature.key} action={action} {...props} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function Cell({
  feature,
  action,
  ...props
}: Props & { feature: FeatureKey; action: PermissionAction }) {
  if (props.mode === "boolean") {
    const value = props.values[feature][action];
    return (
      <button
        type="button"
        disabled={props.disabled}
        aria-label={`${feature} ${action}: ${value ? "allowed" : "not allowed"}`}
        onClick={() => props.onToggle(feature, action, !value)}
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-md border transition-colors disabled:opacity-60",
          value
            ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
            : "border-border bg-background text-muted-foreground"
        )}
      >
        {value ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
      </button>
    );
  }

  const choice = props.choices[cellKey(feature, action)] ?? "INHERIT";
  const effective = props.effective?.[feature][action];
  return (
    <div className="flex flex-col items-center gap-0.5">
      <button
        type="button"
        disabled={props.disabled}
        title="Click to cycle: Inherit, Allow, Deny"
        onClick={() => props.onChange(feature, action, NEXT_CHOICE[choice])}
        className={cn(
          "inline-flex h-7 min-w-[4.5rem] items-center justify-center gap-1 rounded-md border px-2 text-xs font-medium transition-colors disabled:opacity-60",
          choice === "ALLOW" && "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
          choice === "DENY" && "border-red-500/40 bg-red-500/15 text-red-700 dark:text-red-400",
          choice === "INHERIT" && "border-dashed border-border text-muted-foreground"
        )}
      >
        {choice === "ALLOW" && <Check className="h-3 w-3" />}
        {choice === "DENY" && <X className="h-3 w-3" />}
        {choice === "INHERIT" && <Minus className="h-3 w-3" />}
        {choice === "INHERIT" ? "Inherit" : choice === "ALLOW" ? "Allow" : "Deny"}
      </button>
      {effective !== undefined && (
        <span className={cn("text-[10px]", effective ? "text-emerald-600" : "text-muted-foreground")}>
          {effective ? "has access" : "no access"}
        </span>
      )}
    </div>
  );
}
