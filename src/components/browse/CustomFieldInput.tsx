import { useState, useId } from "react";
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

  // Unique ID to link labels and inputs reliably
  const id = useId();
  const labelId = `${id}-label`;

  let fieldContent: React.ReactNode;

  switch (def.field_type) {
    case "number": {
      fieldContent = (
        <>
          <Label htmlFor={id} className="w-40">
            {def.field_name}
          </Label>
          <Input
            id={id}
            type="number"
            value={(currentValue as number) ?? ""}
            onChange={(e) =>
              onChange(
                e.target.value === "" ? undefined : Number(e.target.value)
              )
            }
          />
          {currentValue !== undefined && (
            <Button
              variant="ghost"
              onClick={onClear}
              aria-label={`Clear ${def.field_name}`}
            >
              Clear
            </Button>
          )}
        </>
      );
      break;
    }

    case "boolean": {
      fieldContent = (
        <>
          <Label htmlFor={id}>{def.field_name}</Label>
          <div className="flex items-center gap-2">
            <Checkbox
              id={id}
              checked={!!currentValue}
              onCheckedChange={(v) => onChange(!!v)}
            />
            <Button
              variant="ghost"
              onClick={onClear}
              aria-label={`Clear ${def.field_name}`}
              className={currentValue !== undefined ? "" : "invisible"}
              aria-hidden={`${currentValue !== undefined}`}
            >
              Clear
            </Button>
          </div>
        </>
      );
      break;
    }

    case "date": {
      const dateValue = currentValue
        ? new Date(currentValue as string)
        : undefined;
      fieldContent = (
        <>
          <Label id={labelId} className="w-40">
            {def.field_name}
          </Label>
          <Popover open={open} onOpenChange={(isOpen) => setOpen(isOpen)}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-48 justify-between font-normal"
                aria-labelledby={labelId}
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
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              aria-label={`Clear ${def.field_name}`}
            >
              Clear
            </Button>
          )}
        </>
      );
      break;
    }

    case "select": {
      fieldContent = (
        <>
          <Label id={labelId} className="w-40">
            {def.field_name}
          </Label>
          <Select onValueChange={onChange}>
            <SelectTrigger aria-labelledby={labelId}>
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
        </>
      );
      break;
    }

    case "text": {
      fieldContent = (
        <>
          <Label htmlFor={id} className="w-40">
            {def.field_name}
          </Label>
          <Input
            id={id}
            type="text"
            value={(currentValue as string) ?? ""}
            onChange={(e) => onChange(e.target.value || undefined)}
          />
          {currentValue !== undefined && (
            <Button
              variant="ghost"
              onClick={onClear}
              aria-label={`Clear ${def.field_name}`}
            >
              Clear
            </Button>
          )}
        </>
      );
      break;
    }

    default:
      return null;
  }

  return <div className="flex flex-col gap-1 [&>*]:w-full">{fieldContent}</div>;
}
