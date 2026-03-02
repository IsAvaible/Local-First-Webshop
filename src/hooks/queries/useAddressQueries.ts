import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAddressById,
  getUserAddresses,
  createUserAddress
} from "@/server/functions/address.ts";
import type { UserAddress } from "@/db/schema.ts";

export function useAddressByIdQuery(addressId: string | null) {
  return useQuery({
    queryKey: ["address", addressId],
    queryFn: () => getAddressById({ data: { addressId: addressId! } }),
    enabled: !!addressId
  });
}

export function useUserAddressesQuery(userId: string | undefined) {
  return useQuery({
    queryKey: ["addresses", userId],
    queryFn: () => getUserAddresses({ data: { userId: userId! } }),
    enabled: !!userId
  });
}

export function useCreateUserAddressMutation(
  userId: string | undefined,
  onSuccessCallback?: (newAddress: UserAddress) => void
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      newAddressData: Parameters<typeof createUserAddress>[0]["data"]
    ) => createUserAddress({ data: newAddressData }),
    onSuccess: async (newAddress) => {
      if (userId) {
        await queryClient.invalidateQueries({
          queryKey: ["addresses", userId]
        });
      }
      if (onSuccessCallback) {
        onSuccessCallback(newAddress);
      }
    },
    onError: (error) => {
      console.error("Failed to save address:", error);
    }
  });
}
