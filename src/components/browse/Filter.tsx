import { useEffect, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Route, useSetSearch } from "@/routes/search.tsx";
import type { Category, Company, CustomFieldDefinition } from "@/db/schema.ts";
import { useNavigate } from "@tanstack/react-router";
import type { JsonValue } from "@/lib/utils.ts";
import CustomFieldInput from "@/components/browse/CustomFieldInput.tsx";
import { Button } from "@/components/ui/button.tsx";

export default function Filter({
  categories,
  companies,
  customFieldDefinitions
}: {
  categories: (Category & { count: number })[] | undefined;
  companies: (Company & { count: number })[] | undefined;
  customFieldDefinitions?: CustomFieldDefinition[] | undefined;
}) {
  const search = Route.useSearch();
  const setSearch = useSetSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [minPrice, setMinPrice] = useState(search.price_min);
  const [maxPrice, setMaxPrice] = useState(search.price_max);

  useEffect(() => {
    setMinPrice(search.price_min);
    setMaxPrice(search.price_max);
  }, [search.price_min, search.price_max]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setSearch({ price_min: minPrice, price_max: maxPrice });
    }, 500);
    return () => clearTimeout(handler);
  }, [minPrice, maxPrice, setSearch]);

  const handleCategoryChange = (categoryId: number) => {
    const currentCategories = search.categories ?? [];
    const newCategories = currentCategories.includes(categoryId)
      ? currentCategories.filter((id) => id !== categoryId)
      : [...currentCategories, categoryId];
    setSearch({ categories: newCategories });
  };

  const handleCompanyChange = (companyId: number) => {
    const currentCompanies = search.companies ?? [];
    const newCompanies = currentCompanies.includes(companyId)
      ? currentCompanies.filter((id) => id !== companyId)
      : [...currentCompanies, companyId];
    setSearch({ companies: newCompanies });
  };

  const resetFilters = () => {
    void navigate({ search: (prev) => ({ q: prev.q }) });
  };

  // --- Custom Field Handling ---
  // Show custom field inputs filtered to selected categories (if any)
  const selectedCategoryIds = search.categories ?? [];
  const visibleCustomFields = customFieldDefinitions
    ?.filter((def) =>
      selectedCategoryIds.length > 0
        ? selectedCategoryIds.includes(def.category_id)
        : true
    )
    .sort((a, b) => a.field_name.localeCompare(b.field_name));

  const setCustomFieldValue = (
    fieldName: string,
    value: JsonValue | undefined
  ) => {
    const prev = search.custom_fields ?? {};
    setSearch({ custom_fields: { ...prev, [fieldName]: value } });
  };

  const clearCustomField = (fieldName: string) => {
    const prev = { ...(search.custom_fields ?? {}) };
    delete prev[fieldName];
    setSearch({ custom_fields: prev });
  };

  const clearAllCustomFields = () => {
    setSearch({ custom_fields: {} });
  };

  return (
    <div className="sticky h-fit w-80 space-y-6 rounded-lg bg-white p-4 shadow-md dark:bg-slate-800">
      <h3 className="text-xl font-semibold">Filters</h3>
      <Accordion
        type="multiple"
        defaultValue={["item-1", "item-2", "item-3", "item-4"]}
      >
        <AccordionItem value="item-2">
          <AccordionTrigger>Categories</AccordionTrigger>
          <AccordionContent className="space-y-2">
            {categories?.map((c) => (
              <div key={c.id} className="flex items-center gap-2">
                <Checkbox
                  id={c.name}
                  checked={search.categories?.includes(c.id) ?? false}
                  onCheckedChange={() => handleCategoryChange(c.id)}
                />
                <Label htmlFor={c.name} className="flex-grow">
                  {c.name}
                </Label>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  ({c.count})
                </span>
              </div>
            ))}
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-3">
          <AccordionTrigger>Companies</AccordionTrigger>
          <AccordionContent className="space-y-2">
            {companies?.map((c) => (
              <div key={c.id} className="flex items-center gap-2">
                <Checkbox
                  id={c.name}
                  checked={search.companies?.includes(c.id) ?? false}
                  onCheckedChange={() => handleCompanyChange(c.id)}
                />
                <Label htmlFor={c.name} className="flex-grow">
                  {c.name}
                </Label>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  ({c.count})
                </span>
              </div>
            ))}
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-4">
          <AccordionTrigger>Price Range</AccordionTrigger>
          <AccordionContent>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="Min"
                value={minPrice ?? ""}
                onChange={(e) =>
                  setMinPrice(Number(e.target.value) || undefined)
                }
              />
              <span>-</span>
              <Input
                type="number"
                placeholder="Max"
                value={maxPrice ?? ""}
                onChange={(e) =>
                  setMaxPrice(Number(e.target.value) || undefined)
                }
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        {visibleCustomFields && visibleCustomFields.length > 0 && (
          <AccordionItem value="item-5">
            <AccordionTrigger>Additional Properties</AccordionTrigger>
            <AccordionContent className="space-y-3">
              {visibleCustomFields.map((def) => {
                const currentValue = search.custom_fields?.[def.field_name];
                return (
                  <CustomFieldInput
                    key={def.id}
                    def={def}
                    currentValue={currentValue}
                    onChange={(v) => setCustomFieldValue(def.field_name, v)}
                    onClear={() => clearCustomField(def.field_name)}
                  />
                );
              })}
              <div className="flex justify-end">
                <Button variant="outline" onClick={clearAllCustomFields}>
                  Clear Custom Filters
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
      <Button className="w-full" onClick={resetFilters}>
        Reset Filters
      </Button>
    </div>
  );
}
