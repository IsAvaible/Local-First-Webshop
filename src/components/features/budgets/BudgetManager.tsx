import { useState } from "react";
import type { AutomergeUrl } from "@automerge/react";
import type { UserRegistryDoc } from "@/lib/automerge-helpers.ts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select.tsx";
import { BudgetDetail } from "./BudgetDetail.tsx";

interface BudgetManagerProps {
  userRegistryDoc: UserRegistryDoc;
}

export function BudgetManager({ userRegistryDoc }: BudgetManagerProps) {
  const budgets = Object.entries(userRegistryDoc.documentRegistry).filter(
    ([, meta]) => meta.type === "budget"
  );
  const [selectedBudgetUrl, setSelectedBudgetUrl] =
    useState<AutomergeUrl | null>(
      budgets.length > 0 ? (budgets[0][0] as AutomergeUrl) : null
    );

  return (
    <div className="space-y-4">
      <Select
        onValueChange={(url) => setSelectedBudgetUrl(url as AutomergeUrl)}
        defaultValue={selectedBudgetUrl ?? undefined}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select a budget document..." />
        </SelectTrigger>
        <SelectContent>
          {budgets.map(([url, meta]) => (
            <SelectItem key={url} value={url}>
              {meta.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedBudgetUrl && <BudgetDetail budgetUrl={selectedBudgetUrl} />}
    </div>
  );
}
