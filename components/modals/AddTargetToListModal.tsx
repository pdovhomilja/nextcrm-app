"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getTargets } from "@/actions/crm/get-targets";
import { addTargetsToList } from "@/actions/crm/target-lists/add-targets-to-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Target {
  id: string;
  first_name: string | null;
  last_name: string;
  email: string | null;
  company: string | null;
}

interface AddTargetToListModalProps {
  targetListId: string;
  existingTargetIds: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AddTargetToListModal = ({
  targetListId,
  existingTargetIds,
  open,
  onOpenChange,
}: AddTargetToListModalProps) => {
  const router = useRouter();
  const [targets, setTargets] = useState<Target[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    if (!open) return;
    setIsFetching(true);
    getTargets()
      .then((all) => {
        setTargets(all.filter((t) => !existingTargetIds.includes(t.id)));
      })
      .catch(() => {
        toast.error("Failed to load targets");
      })
      .finally(() => setIsFetching(false));
  }, [open]);

  const filtered = targets.filter((t) => {
    const q = search.toLowerCase();
    return (
      t.first_name?.toLowerCase().includes(q) ||
      t.last_name?.toLowerCase().includes(q) ||
      t.email?.toLowerCase().includes(q) ||
      t.company?.toLowerCase().includes(q)
    );
  });

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((t) => selected.includes(t.id));
  const someFilteredSelected = filtered.some((t) => selected.includes(t.id));

  const toggleAll = () => {
    if (allFilteredSelected) {
      setSelected((prev) => prev.filter((id) => !filtered.some((t) => t.id === id)));
    } else {
      const newIds = filtered.map((t) => t.id);
      setSelected((prev) => Array.from(new Set([...prev, ...newIds])));
    }
  };

  const handleSubmit = async () => {
    if (selected.length === 0) return;
    setIsLoading(true);
    const result = await addTargetsToList(targetListId, selected);
    setIsLoading(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(`Added ${selected.length} target(s) to the list`);
    setSelected([]);
    setSearch("");
    onOpenChange(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Targets to List</DialogTitle>
          <DialogDescription>
            Select targets to add to this list. Already-added targets are not shown.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            placeholder="Search by name, email or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={isFetching}
          />
          {!isFetching && filtered.length > 0 && (
            <div
              className="flex items-center space-x-3 rounded-md px-2 py-1.5 hover:bg-accent cursor-pointer"
              onClick={toggleAll}
            >
              <Checkbox
                checked={allFilteredSelected ? true : someFilteredSelected ? "indeterminate" : false}
                onCheckedChange={toggleAll}
              />
              <span className="text-sm font-medium">Select all ({filtered.length})</span>
            </div>
          )}
          <ScrollArea className="h-72 rounded-md border p-2">
            {isFetching ? (
              <p className="text-sm text-muted-foreground p-2">Loading targets...</p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground p-2">No targets available.</p>
            ) : (
              <div className="space-y-1">
                {filtered.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center space-x-3 rounded-md px-2 py-1.5 hover:bg-accent cursor-pointer"
                    onClick={() => toggle(t.id)}
                  >
                    <Checkbox
                      checked={selected.includes(t.id)}
                      onCheckedChange={() => toggle(t.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {t.first_name} {t.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {t.email || t.company || "No contact info"}
                      </p>
                    </div>
                    {t.company && (
                      <span className="text-xs text-muted-foreground shrink-0">{t.company}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          {selected.length > 0 && (
            <p className="text-xs text-muted-foreground">{selected.length} target(s) selected</p>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || selected.length === 0}
          >
            {isLoading ? "Adding..." : `Add Selected (${selected.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddTargetToListModal;
