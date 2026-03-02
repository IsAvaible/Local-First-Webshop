import { useMutation } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { updateSettingsFn } from "@/server/functions/profile.ts";

export function useUpdateProfileSettingsMutation() {
  const router = useRouter();

  return useMutation({
    mutationFn: (data: Parameters<typeof updateSettingsFn>[0]["data"]) =>
      updateSettingsFn({ data }),
    onSuccess: async () => {
      toast("Settings updated successfully");
      // Invalidate the router to refetch the SSR data in the parent profile loader
      await router.invalidate();
    },
    onError: (error) => {
      console.error(error);
      toast(`Failed to update settings: ${error.message}`);
    }
  });
}
