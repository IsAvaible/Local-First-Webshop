import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const conditions = ["New", "Very Good", "Good", "Used"];
const shippingOptions = ["Free", "Express", "Standard"];

export default function Filter() {
  return (
    <div className="sticky h-fit w-80 space-y-6 rounded-lg bg-white p-4 shadow-md dark:bg-slate-800">
      <h3 className="text-xl font-semibold">Filters</h3>
      <Accordion type="multiple" defaultValue={["item-1", "item-2", "item-3"]}>
        <AccordionItem value="item-1">
          <AccordionTrigger>Condition</AccordionTrigger>
          <AccordionContent className="space-y-2">
            {conditions.map((c) => (
              <div key={c} className="flex items-center gap-2">
                <Checkbox id={c} />
                <Label htmlFor={c}>{c}</Label>
              </div>
            ))}
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-2">
          <AccordionTrigger>Categories</AccordionTrigger>
          <AccordionContent>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cars">Cars</SelectItem>
                <SelectItem value="parts">Parts</SelectItem>
              </SelectContent>
            </Select>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-3">
          <AccordionTrigger>Price Range</AccordionTrigger>
          <AccordionContent>
            <div className="flex items-center gap-2">
              <Input type="number" placeholder="Min" />
              <span>-</span>
              <Input type="number" placeholder="Max" />
            </div>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-4">
          <AccordionTrigger>Shipping</AccordionTrigger>
          <AccordionContent className="space-y-2">
            {shippingOptions.map((s) => (
              <div key={s} className="flex items-center gap-2">
                <Checkbox id={s} />
                <Label htmlFor={s}>{s}</Label>
              </div>
            ))}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      <Button className="w-full">Reset Filters</Button>
    </div>
  );
}
