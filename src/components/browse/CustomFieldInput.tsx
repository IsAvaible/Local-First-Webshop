import { useState } from "react";
import type { CustomFieldDefinition } from "@/db/schema.ts";
import type { JsonValue } from "@/lib/utils.ts";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover.tsx";
import { Calendar } from "@/components/ui/calendar.tsx";
import { ChevronDownIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
  SelectItem
} from "@/components/ui/select.tsx";
import { humanizeCustomFieldValue } from "@/lib/utils.ts";

interface Props {
  def: CustomFieldDefinition;
  currentValue?: JsonValue;
  onChange: (v: JsonValue | undefined) => void;
  onClear: () => void;
}

export default function CustomFieldInput({
  def,
  currentValue,
  onChange,
  onClear
}: Props) {
  const [open, setOpen] = useState(false);

  switch (def.field_type) {
    case "number": {
      return (
        <div className="flex items-center gap-2">
          <Label className="w-40">{def.field_name}</Label>
          <Input
            type="number"
            value={(currentValue as number) ?? ""}
            onChange={(e) =>
              onChange(
                e.target.value === "" ? undefined : Number(e.target.value)
              )
            }
          />
          {currentValue !== undefined && (
            <Button variant="ghost" onClick={onClear}>
              Clear
            </Button>
          )}
        </div>
      );
    }

    case "boolean": {
      return (
        <div className="flex items-center gap-2">
          <Checkbox
            id={def.field_name}
            checked={!!currentValue}
            onCheckedChange={(v) => onChange(!!v)}
          />
          <Label htmlFor={def.field_name}>{def.field_name}</Label>
          {currentValue !== undefined && (
            <Button variant="ghost" onClick={onClear}>
              Clear
            </Button>
          )}
        </div>
      );
    }

    case "date": {
      const dateValue = currentValue
        ? new Date(currentValue as string)
        : undefined;
      return (
        <div className="flex items-center gap-2">
          <Label className="w-40">{def.field_name}</Label>
          <Popover open={open} onOpenChange={(isOpen) => setOpen(isOpen)}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-48 justify-between font-normal"
              >
                {dateValue
                  ? humanizeCustomFieldValue(currentValue, "date")
                  : "Select date"}
                <ChevronDownIcon className="ml-2 h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateValue}
                onSelect={(date) => {
                  onChange(date ? date.toISOString() : undefined);
                  setOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>
          {currentValue !== undefined && (
            <Button variant="ghost" size="sm" onClick={onClear}>
              Clear
            </Button>
          )}
        </div>
      );
    }

    case "select": {
      return (
        <div className="flex items-center gap-2">
          <Label className="w-40">{def.field_name}</Label>
          <Select onValueChange={onChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select Value" />
            </SelectTrigger>
            <SelectContent>
              {def.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    case "text": {
      return (
        <div className="flex items-center gap-2">
          <Label className="w-40">{def.field_name}</Label>
          <Input
            type="text"
            value={(currentValue as string) ?? ""}
            onChange={(e) => onChange(e.target.value || undefined)}
          />
          {currentValue !== undefined && (
            <Button variant="ghost" onClick={onClear}>
              Clear
            </Button>
          )}
        </div>
      );
    }

    default:
      return null;
  }
}
