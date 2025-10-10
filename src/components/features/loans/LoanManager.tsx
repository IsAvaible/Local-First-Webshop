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
import { LoanDetail } from "./LoanDetail.tsx";

interface LoanManagerProps {
  userRegistryDoc: UserRegistryDoc;
}

export function LoanManager({ userRegistryDoc }: LoanManagerProps) {
  const loans = Object.entries(userRegistryDoc.documentRegistry).filter(
    ([, meta]) => meta.type === "loan-collection"
  );
  const [selectedLoanColUrl, setSelectedLoanColUrl] =
    useState<AutomergeUrl | null>(
      loans.length > 0 ? (loans[0][0] as AutomergeUrl) : null
    );

  return (
    <div className="space-y-4">
      <Select
        onValueChange={(url) => setSelectedLoanColUrl(url as AutomergeUrl)}
        defaultValue={selectedLoanColUrl ?? undefined}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select a loan collection..." />
        </SelectTrigger>
        <SelectContent>
          {loans.map(([url, meta]) => (
            <SelectItem key={url} value={url}>
              {meta.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedLoanColUrl && (
        <LoanDetail loanCollectionUrl={selectedLoanColUrl} />
      )}
    </div>
  );
}
