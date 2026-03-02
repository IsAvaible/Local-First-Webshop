import { useState, useEffect } from "react";
import { Controller, type SubmitHandler, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

// TanStack Start & React Query
import { createServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Drizzle ORM
import { eq } from "drizzle-orm";
import { db } from "@/db/connection";
import { userAddressesTable, type UserAddress } from "@/db/schema";

// UI & Utils
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
  FieldSet,
  FieldLegend
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { MapPinIcon, CheckIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import { CountryDropdown } from "@/components/ui/country-dropdown";

// --- Server Functions ---

const getUserAddresses = createServerFn({ method: "GET" })
  .inputValidator(z.object({ userId: z.string() }))
  .handler(async ({ data: { userId } }) => {
    return await db
      .select()
      .from(userAddressesTable)
      .where(eq(userAddressesTable.user_id, userId));
  });

const createUserAddress = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      user_id: z.string(),
      recipient_name: z.string(),
      company_name: z.string().nullable().optional(),
      line1: z.string(),
      line2: z.string().nullable().optional(),
      city: z.string(),
      state: z.string().nullable().optional(),
      zip_code: z.string(),
      country_code: z.string(),
      phone_number: z.string().nullable().optional(),
      email_address: z.string().nullable().optional(),
      is_default_delivery: z.boolean().optional(),
      is_default_billing: z.boolean().optional()
    })
  )
  .handler(async ({ data }) => {
    // The database schema uses defaultRandom() for IDs, so Drizzle handles generation
    const [newAddress] = await db
      .insert(userAddressesTable)
      .values(data)
      .returning();

    return newAddress;
  });

// --- Client Validation Schema ---

const addressFormSchema = z.object({
  recipient_name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name is too long"),
  company_name: z.string().trim().optional(),
  line1: z.string().trim().min(5, "Address must be at least 5 characters"),
  line2: z.string().trim().optional(),
  city: z.string().trim().min(2, "City name is too short"),
  state: z.string().trim().optional(),
  zip_code: z
    .string()
    .trim()
    .min(3, "Zip code must be at least 3 characters")
    .max(20, "Zip code is too long"),
  country_code: z
    .string()
    .trim()
    .length(2, "Please use a 2-letter Country Code (e.g., DE, US)")
    .transform((val) => val.toUpperCase()),
  phone_number: z
    .string()
    .trim()
    .refine(
      (val) => val === "" || /^[\d+\-\s()]+$/.test(val),
      "Invalid phone number format"
    )
    .optional(),
  email_address: z.email().optional()
});

type UserAddressFormValues = z.infer<typeof addressFormSchema>;

interface AddressStepProps {
  selectedAddressId: string | null;
  onSelectAddress: (id: string) => void;
  billingAddressId: string | null;
  onSelectBillingAddress: (id: string | null) => void;
}

// --- Client Component ---

export default function AddressStep({
  selectedAddressId,
  onSelectAddress,
  billingAddressId,
  onSelectBillingAddress
}: AddressStepProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("saved");
  const [sameAsShipping, setSameAsShipping] = useState(true);

  const { data: session } = authClient.useSession();
  const userId = session?.user.id;

  // 1. Fetch Addresses via React Query
  const { data: addresses, isLoading } = useQuery({
    queryKey: ["addresses", userId],
    queryFn: () => getUserAddresses({ data: { userId: userId! } }),
    enabled: !!userId // Only run if we actually have a logged-in user
  });

  // 2. Setup Address Creation Mutation
  const createMutation = useMutation({
    mutationFn: (
      newAddressData: Parameters<typeof createUserAddress>[0]["data"]
    ) => createUserAddress({ data: newAddressData }),
    onSuccess: async (newAddress) => {
      // Refresh the address list immediately
      await queryClient.invalidateQueries({ queryKey: ["addresses", userId] });

      // Auto-select the newly generated address
      onSelectAddress(newAddress.id);
      reset();
      setActiveTab("saved");
    },
    onError: (error) => {
      console.error("Failed to save address:", error);
    }
  });

  useEffect(() => {
    if (billingAddressId && billingAddressId !== selectedAddressId) {
      setSameAsShipping(false);
    } else if (billingAddressId === null && selectedAddressId) {
      setSameAsShipping(true);
    }
  }, [billingAddressId, selectedAddressId]);

  // 3. Setup React Hook Form
  const form = useForm<UserAddressFormValues>({
    resolver: zodResolver(addressFormSchema),
    defaultValues: {
      recipient_name: "",
      company_name: "",
      line1: "",
      line2: "",
      city: "",
      state: "",
      zip_code: "",
      country_code: "DE",
      phone_number: "",
      email_address: ""
    }
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = form;

  // 4. Handle Form Submission
  // eslint-disable-next-line @typescript-eslint/require-await
  const onSubmit: SubmitHandler<UserAddressFormValues> = async (data) => {
    if (!userId) {
      console.error("User not found / not logged in");
      return;
    }

    const isFirstAddress = !addresses || addresses.length === 0;

    // Helper to convert empty strings to null for DB consistency
    const toNull = (val?: string | null) =>
      val && val.trim() !== "" ? val : null;

    // Fire the serverFn mutation
    createMutation.mutate({
      ...data,
      user_id: userId,
      company_name: toNull(data.company_name),
      line2: toNull(data.line2),
      state: toNull(data.state),
      phone_number: toNull(data.phone_number),
      email_address: toNull(data.email_address),
      is_default_delivery: isFirstAddress,
      is_default_billing: isFirstAddress
    });
  };

  const isSubmitting = createMutation.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPinIcon className="h-5 w-5" /> Shipping & Billing
        </CardTitle>
        <CardDescription>
          Select where you want your order delivered.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="saved">Saved Addresses</TabsTrigger>
            <TabsTrigger value="new-address">New Address</TabsTrigger>
          </TabsList>

          {/* --- SAVED ADDRESSES TAB --- */}
          <TabsContent value="saved" className="mt-4 space-y-4">
            {isLoading ? (
              <div className="flex justify-center p-4">
                <Loader2 className="text-muted-foreground animate-spin" />
              </div>
            ) : !addresses || addresses.length === 0 ? (
              <div className="text-muted-foreground py-8 text-center">
                <p>No saved addresses found.</p>
                <Button
                  variant="link"
                  onClick={() => setActiveTab("new-address")}
                >
                  Add your first address
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* SHIPPING ADDRESS LIST */}
                <div className="space-y-3">
                  <h3 className="text-muted-foreground text-sm font-medium">
                    Shipping Address
                  </h3>
                  <div className="grid gap-4">
                    {addresses.map((addr) => (
                      <AddressCard
                        key={`shipping-${addr.id}`}
                        addr={addr}
                        isSelected={selectedAddressId === addr.id}
                        onClick={() => {
                          onSelectAddress(addr.id);
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* BILLING TOGGLE */}
                <div className="flex items-center space-x-2 border-t pt-4">
                  <Checkbox
                    id="billing-same"
                    checked={sameAsShipping}
                    onCheckedChange={(checked) => {
                      setSameAsShipping(checked === true);
                      if (checked) {
                        onSelectBillingAddress(null);
                      }
                    }}
                  />
                  <Label
                    htmlFor="billing-same"
                    className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Use shipping address as billing address
                  </Label>
                </div>

                {/* BILLING ADDRESS LIST */}
                {!sameAsShipping && (
                  <div className="animate-in fade-in slide-in-from-top-2 space-y-3 pt-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-muted-foreground text-sm font-medium">
                        Billing Address
                      </h3>
                    </div>

                    <div className="grid gap-4">
                      {addresses.map((addr) => (
                        <AddressCard
                          key={`billing-${addr.id}`}
                          addr={addr}
                          isSelected={billingAddressId === addr.id}
                          onClick={() => {
                            onSelectBillingAddress(addr.id);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* --- NEW ADDRESS TAB --- */}
          <TabsContent value="new-address" className="mt-4">
            <form
              onSubmit={handleSubmit(onSubmit, (errors) =>
                console.log("Validation Errors:", errors)
              )}
            >
              <FieldSet className="space-y-6">
                <FieldLegend className="sr-only">Address Details</FieldLegend>

                <FieldGroup>
                  {/* Row 1: Identity */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field data-invalid={!!errors.recipient_name}>
                      <FieldLabel htmlFor="recipient_name">
                        Full Name
                      </FieldLabel>
                      <Input
                        id="recipient_name"
                        placeholder="Simon Conrad"
                        aria-invalid={!!errors.recipient_name}
                        {...register("recipient_name")}
                      />
                      <FieldError>{errors.recipient_name?.message}</FieldError>
                    </Field>

                    <Field data-invalid={!!errors.company_name}>
                      <FieldLabel htmlFor="company_name">
                        Company (Optional)
                      </FieldLabel>
                      <Input
                        id="company_name"
                        placeholder="FH Aachen"
                        aria-invalid={!!errors.company_name}
                        {...register("company_name")}
                      />
                      <FieldError>{errors.company_name?.message}</FieldError>
                    </Field>
                  </div>

                  {/* Row 2: Contact Info */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field data-invalid={!!errors.email_address}>
                      <FieldLabel htmlFor="email">Email (Optional)</FieldLabel>
                      <Input
                        id="email"
                        type="email"
                        placeholder="simon@example.com"
                        aria-invalid={!!errors.email_address}
                        {...register("email_address")}
                      />
                      <FieldError>{errors.email_address?.message}</FieldError>
                    </Field>

                    <Field data-invalid={!!errors.phone_number}>
                      <FieldLabel htmlFor="phone_number">
                        Phone (Optional)
                      </FieldLabel>
                      <Input
                        id="phone_number"
                        type="tel"
                        placeholder="+1 234 567 890"
                        aria-invalid={!!errors.phone_number}
                        {...register("phone_number")}
                      />
                      <FieldError>{errors.phone_number?.message}</FieldError>
                    </Field>
                  </div>

                  {/* Row 3: Street Address */}
                  <Field data-invalid={!!errors.line1}>
                    <FieldLabel htmlFor="line1">Street Address</FieldLabel>
                    <Input
                      id="line1"
                      placeholder="Eupener Str. 70"
                      aria-invalid={!!errors.line1}
                      {...register("line1")}
                    />
                    <FieldError>{errors.line1?.message}</FieldError>
                  </Field>

                  <Field data-invalid={!!errors.line2}>
                    <FieldLabel htmlFor="line2">
                      Apartment, Suite, etc. (Optional)
                    </FieldLabel>
                    <Input
                      id="line2"
                      placeholder="Room E 137"
                      aria-invalid={!!errors.line2}
                      {...register("line2")}
                    />
                    <FieldError>{errors.line2?.message}</FieldError>
                  </Field>

                  {/* Row 4: City/State/Zip */}
                  <div className="grid gap-4 md:grid-cols-3">
                    <Field data-invalid={!!errors.city}>
                      <FieldLabel htmlFor="city">City</FieldLabel>
                      <Input
                        id="city"
                        placeholder="Aachen"
                        aria-invalid={!!errors.city}
                        {...register("city")}
                      />
                      <FieldError>{errors.city?.message}</FieldError>
                    </Field>

                    <Field data-invalid={!!errors.state}>
                      <FieldLabel htmlFor="state">State / Province</FieldLabel>
                      <Input
                        id="state"
                        placeholder="NRW"
                        aria-invalid={!!errors.state}
                        {...register("state")}
                      />
                      <FieldError>{errors.state?.message}</FieldError>
                    </Field>

                    <Field data-invalid={!!errors.zip_code}>
                      <FieldLabel htmlFor="zip_code">Postal Code</FieldLabel>
                      <Input
                        id="zip_code"
                        placeholder="52064"
                        aria-invalid={!!errors.zip_code}
                        {...register("zip_code")}
                      />
                      <FieldError>{errors.zip_code?.message}</FieldError>
                    </Field>
                  </div>

                  {/* Row 5: Country */}
                  <Field data-invalid={!!errors.country_code}>
                    <FieldLabel htmlFor="country_code">Country</FieldLabel>
                    <Controller
                      name="country_code"
                      control={form.control}
                      rules={{ required: "Please select a country" }}
                      render={({
                        field: { onChange, value, ref, ...props }
                      }) => (
                        <CountryDropdown
                          ref={ref}
                          defaultValue={value}
                          placeholder="Select country"
                          aria-invalid={!!errors.country_code}
                          onChange={(country) => {
                            onChange(country.alpha2);
                          }}
                          {...props}
                        />
                      )}
                    />
                    <FieldError>{errors.country_code?.message}</FieldError>
                  </Field>
                </FieldGroup>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-4 w-full"
                >
                  {isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save & Use Address
                </Button>
              </FieldSet>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// --- Subcomponents ---

interface AddressCardProps {
  addr: UserAddress;
  isSelected: boolean;
  onClick: () => void;
}

const AddressCard = ({ addr, isSelected, onClick }: AddressCardProps) => {
  if (!addr.id) console.warn("Address missing ID:", addr);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "relative cursor-pointer rounded-lg border p-4 transition-colors",
        isSelected
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/50"
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="font-medium">{addr.recipient_name}</div>
          {addr.company_name && (
            <div className="text-muted-foreground text-sm">
              {addr.company_name}
            </div>
          )}
          <div className="text-muted-foreground mt-1 text-sm">
            {addr.line1}
            <br />
            {addr.line2 && (
              <>
                {addr.line2}
                <br />
              </>
            )}
            {addr.zip_code} {addr.city}, {addr.state ? `${addr.state}, ` : ""}
            {addr.country_code}
          </div>
        </div>
        {isSelected && (
          <div className="text-primary flex items-center text-sm font-medium">
            <CheckIcon className="mr-1 h-4 w-4" /> Selected
          </div>
        )}
      </div>
    </div>
  );
};
