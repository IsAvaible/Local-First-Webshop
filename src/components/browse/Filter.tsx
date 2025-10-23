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
import { Button } from "@/components/ui/button";
import { Route, useSetSearch } from "@/routes/search.tsx";
import type { Category, Company } from "@/db/schema.ts";
import { useNavigate } from "@tanstack/react-router";

export default function Filter({
  categories,
  companies
}: {
  categories: (Category & { count: number })[] | undefined;
  companies: (Company & { count: number })[] | undefined;
}) {
  const search = Route.useSearch();
  const setSearch = useSetSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [minPrice, setMinPrice] = useState(search.price_min);
  const [maxPrice, setMaxPrice] = useState(search.price_max);

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
                  checked={search.categories?.includes(c.id)}
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
                  checked={search.companies?.includes(c.id)}
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
      </Accordion>
      <Button className="w-full" onClick={resetFilters}>
        Reset Filters
      </Button>
    </div>
  );
}
