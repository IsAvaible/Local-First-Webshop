import { useQuery } from "@tanstack/react-query";
import { getSearchSuggestions } from "@/server/functions/search.ts";

export function useSearchSuggestionsQuery(
  trimmedSearch: string,
  isSearchActive: boolean
) {
  return useQuery({
    queryKey: ["search-suggestions", trimmedSearch],
    queryFn: () => getSearchSuggestions({ data: { q: trimmedSearch } }),
    enabled: isSearchActive
  });
}
