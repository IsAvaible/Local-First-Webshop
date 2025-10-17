import { useState } from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

const colors = ["Black", "White", "Silver"];
const storage = ["128GB", "256GB", "512GB"];

export default function ProductConfigurator() {
  const [selectedColor, setSelectedColor] = useState(colors[0]);
  const [selectedStorage, setSelectedStorage] = useState(storage[0]);

  return (
    <div className="mt-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100">
        Configuration
      </h3>
      <Separator className="my-4" />
      <div className="space-y-6">
        <div>
          <Label className="text-base">Color</Label>
          <RadioGroup
            value={selectedColor}
            onValueChange={setSelectedColor}
            className="mt-2"
          >
            <div className="flex items-center space-x-4">
              {colors.map((color) => (
                <div key={color} className="flex items-center space-x-2">
                  <RadioGroupItem value={color} id={`color-${color}`} />
                  <Label htmlFor={`color-${color}`}>{color}</Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        </div>
        <div>
          <Label htmlFor="storage-select" className="text-base">
            Storage
          </Label>
          <Select value={selectedStorage} onValueChange={setSelectedStorage}>
            <SelectTrigger id="storage-select" className="mt-2 w-full">
              <SelectValue placeholder="Select storage" />
            </SelectTrigger>
            <SelectContent>
              {storage.map((size) => (
                <SelectItem key={size} value={size}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
