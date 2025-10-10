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
import { LedgerDetail } from "./LedgerDetail.tsx";

interface LedgerManagerProps {
  userRegistryDoc: UserRegistryDoc;
}

export function LedgerManager({ userRegistryDoc }: LedgerManagerProps) {
  const ledgers = Object.entries(userRegistryDoc.documentRegistry).filter(
    ([, meta]) => meta.type === "ledger"
  );
  const [selectedLedgerUrl, setSelectedLedgerUrl] =
    useState<AutomergeUrl | null>(
      ledgers.length > 0 ? (ledgers[0][0] as AutomergeUrl) : null
    );

  return (
    <div className="space-y-4">
      <Select
        onValueChange={(url) => setSelectedLedgerUrl(url as AutomergeUrl)}
        defaultValue={selectedLedgerUrl ?? undefined}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select a ledger..." />
        </SelectTrigger>
        <SelectContent>
          {ledgers.map(([url, meta]) => (
            <SelectItem key={url} value={url}>
              {meta.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedLedgerUrl && <LedgerDetail ledgerUrl={selectedLedgerUrl} />}
    </div>
  );
}
