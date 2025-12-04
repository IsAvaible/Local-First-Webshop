import { useState } from "react";
import { useLiveQuery } from "@tanstack/react-db";
import { userAddressesCollection } from "@/lib/collections";
import { type SubmitHandler, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { createUserAddressSchema as rawCreateUserAddressSchema } from "@/db/schema";

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
import { MapPinIcon, CheckIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client.ts";
import { v4 as uuidv4 } from "uuid";

const createUserAddressSchema = rawCreateUserAddressSchema.omit({
  user_id: true
});

// Helper type for the form values
type UserAddressFormValues = z.infer<typeof createUserAddressSchema>;

interface AddressStepProps {
  selectedAddressId: string | null;
  onSelectAddress: (id: string) => void;
}

function AddressStep({ selectedAddressId, onSelectAddress }: AddressStepProps) {
  const [activeTab, setActiveTab] = useState("saved");
  const { data: session } = authClient.useSession();
  const userId = session?.user.id;

  // 1. Query addresses
  const { data: addresses, isLoading } = useLiveQuery((q) =>
    q.from({ address: userAddressesCollection })
  );

  // 2. Setup React Hook Form
  const form = useForm<UserAddressFormValues>({
    resolver: zodResolver(createUserAddressSchema),
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
    formState: { errors, isSubmitting },
    reset
  } = form;

  // 3. Handle Form Submission
  const onSubmit: SubmitHandler<UserAddressFormValues> = async (data) => {
    try {
      if (userId === undefined) {
        console.error("User not found / not logged in");
      }

      const newId = uuidv4();
      const isFirstAddress = !addresses || addresses.length === 0;

      const tx = userAddressesCollection.insert({
        ...data,
        company_name: data.company_name ?? null,
        line2: data.line2 ?? null,
        state: data.state ?? null,
        phone_number: data.phone_number ?? null,
        email_address: data.email_address ?? null,
        is_default_delivery: isFirstAddress,
        is_default_billing: isFirstAddress,

        id: newId,
        user_id: userId!,
        created_at: new Date(),
        updated_at: new Date()
      });

      await tx.isPersisted.promise;
      onSelectAddress(newId);
      reset();
      setActiveTab("saved");
    } catch (error) {
      console.error("Failed to save address:", error);
    }
  };

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
              <div className="grid gap-4">
                {addresses.map((addr) => (
                  <div
                    key={addr.id}
                    onClick={() => onSelectAddress(addr.id)}
                    className={cn(
                      "relative cursor-pointer rounded-lg border p-4 transition-colors",
                      selectedAddressId === addr.id
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
                          {addr.zip_code} {addr.city},{" "}
                          {addr.state ? `${addr.state}, ` : ""}
                          {addr.country_code}
                        </div>
                      </div>
                      {selectedAddressId === addr.id && (
                        <div className="text-primary flex items-center text-sm font-medium">
                          <CheckIcon className="mr-1 h-4 w-4" /> Selected
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* --- NEW ADDRESS TAB (Using Field Components) --- */}
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
                    <FieldLabel htmlFor="country_code">Country Code</FieldLabel>
                    <Input
                      id="country_code"
                      placeholder="DE"
                      maxLength={2}
                      aria-invalid={!!errors.country_code}
                      {...register("country_code")}
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

export default AddressStep;
