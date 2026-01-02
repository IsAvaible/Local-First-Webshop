import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, User, Bell } from "lucide-react";
import { userSettingsCollection } from "@/lib/collections";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
  FieldSet,
  FieldLegend
} from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { CurrencySelect } from "@/components/ui/currency-select";
import type { UserSettings } from "@/db/schema";

// --- Zod Schema Definition ---
const userSettingsSchema = z.object({
  first_name: z
    .string()
    .trim()
    .min(2, "First name must be at least 2 characters"),
  last_name: z
    .string()
    .trim()
    .min(2, "Last name must be at least 2 characters"),
  phone_number: z
    .string()
    .trim()
    .refine(
      (val) => val === "" || /^[\d+\-\s()]+$/.test(val),
      "Invalid phone number format"
    )
    .optional(),
  birthday: z.string().optional(),
  currency: z.string().min(1, "Please select a currency"),
  language: z.string().min(1, "Please select a language"),
  notify_order_updates: z.boolean(),
  notify_newsletter: z.boolean(),
  notify_price_changes: z.boolean()
});

type UserSettingsFormValues = z.infer<typeof userSettingsSchema>;

interface ProfileSettingsProps {
  userSettings: UserSettings;
}

export function ProfileSettings({ userSettings }: ProfileSettingsProps) {
  const form = useForm<UserSettingsFormValues>({
    resolver: zodResolver(userSettingsSchema),
    values: {
      first_name: userSettings.first_name ?? "",
      last_name: userSettings.last_name ?? "",
      phone_number: userSettings.phone_number ?? "",
      birthday: userSettings.birthday ?? "",
      currency: userSettings.currency ?? "EUR",
      language: userSettings.language ?? "en",
      notify_order_updates: userSettings.notify_order_updates ?? true,
      notify_newsletter: userSettings.notify_newsletter ?? false,
      notify_price_changes: userSettings.notify_price_changes ?? false
    }
  });

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting, dirtyFields }
  } = form;

  const onSubmit = async (data: UserSettingsFormValues) => {
    if (!userSettings.user_id) return;

    // 1. Get keys of dirty fields only
    const dirtyKeys = Object.keys(
      dirtyFields
    ) as (keyof UserSettingsFormValues)[];

    if (dirtyKeys.length === 0) return;

    // 2. Construct updates object
    const updates = Object.fromEntries(
      dirtyKeys.map((key) => [key, data[key]])
    );

    try {
      const tx = userSettingsCollection.update(
        userSettings.user_id,
        (settings) => {
          // 3. Merges updates directly into settings
          return Object.assign(settings, updates);
        }
      );
      await tx.isPersisted.promise;
      toast("Settings updated successfully");
    } catch (error) {
      const message = `Failed to update settings:${JSON.stringify(error)}`;
      console.error(message);
      toast(message);
    }
  };

  return (
    <div className="max-w-2xl space-y-8">
      <form onSubmit={handleSubmit(onSubmit)}>
        <div>
          <h2 className="mb-6 text-2xl font-bold tracking-tight">
            Account Settings
          </h2>

          {/* Profile Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5" /> Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FieldSet className="space-y-6">
                <FieldLegend className="sr-only">Personal Info</FieldLegend>
                <FieldGroup>
                  {/* Row 1: Names */}
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <Field data-invalid={!!errors.first_name}>
                      <FieldLabel htmlFor="first_name">First Name</FieldLabel>
                      <Input
                        id="first_name"
                        aria-invalid={!!errors.first_name}
                        {...register("first_name")}
                      />
                      <FieldError>{errors.first_name?.message}</FieldError>
                    </Field>

                    <Field data-invalid={!!errors.last_name}>
                      <FieldLabel htmlFor="last_name">Last Name</FieldLabel>
                      <Input
                        id="last_name"
                        aria-invalid={!!errors.last_name}
                        {...register("last_name")}
                      />
                      <FieldError>{errors.last_name?.message}</FieldError>
                    </Field>
                  </div>

                  {/* Row 2: Contact */}
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <Field data-invalid={!!errors.phone_number}>
                      <FieldLabel htmlFor="phone">Phone Number</FieldLabel>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+1 (555) 000-0000"
                        aria-invalid={!!errors.phone_number}
                        {...register("phone_number")}
                      />
                      <FieldError>{errors.phone_number?.message}</FieldError>
                    </Field>

                    <Field data-invalid={!!errors.birthday}>
                      <FieldLabel htmlFor="birthday">Birthday</FieldLabel>
                      <Input
                        id="birthday"
                        type="date"
                        aria-invalid={!!errors.birthday}
                        {...register("birthday")}
                      />
                      <FieldError>{errors.birthday?.message}</FieldError>
                    </Field>
                  </div>

                  <Separator />

                  {/* Row 3: Preferences (Using Controller for Select) */}
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <Field data-invalid={!!errors.currency}>
                      <FieldLabel htmlFor="currency">Currency</FieldLabel>
                      <Controller
                        name="currency"
                        control={control}
                        render={({ field }) => (
                          <CurrencySelect
                            defaultValue={field.value}
                            onValueChange={field.onChange}
                            name="currency"
                            placeholder="Select currency"
                            currencies="custom"
                            variant="default"
                          />
                        )}
                      />
                      <FieldError>{errors.currency?.message}</FieldError>
                    </Field>

                    <Field data-invalid={!!errors.language}>
                      <FieldLabel htmlFor="language">Language</FieldLabel>
                      <Controller
                        name="language"
                        control={control}
                        render={({ field }) => (
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            name={field.name}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select language" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="en">English</SelectItem>
                              <SelectItem value="de">German</SelectItem>
                              <SelectItem value="fr">French</SelectItem>
                              <SelectItem value="es">Spanish</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                      <FieldError>{errors.language?.message}</FieldError>
                    </Field>
                  </div>
                </FieldGroup>
              </FieldSet>
            </CardContent>
          </Card>
        </div>

        {/* Notifications */}
        <div className="mt-8">
          <Card className="pb-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Bell className="h-5 w-5" /> Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Notify Order Updates */}
              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-0.5">
                  <FieldLabel className="text-base font-medium">
                    Order Updates
                  </FieldLabel>
                  <p className="text-muted-foreground text-sm">
                    Receive updates about your order status.
                  </p>
                </div>
                <Controller
                  name="notify_order_updates"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
              </div>
              <Separator />

              {/* Notify Newsletter */}
              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-0.5">
                  <FieldLabel className="text-base font-medium">
                    Newsletter
                  </FieldLabel>
                  <p className="text-muted-foreground text-sm">
                    Receive emails about new products and sales.
                  </p>
                </div>
                <Controller
                  name="notify_newsletter"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
              </div>
              <Separator />

              {/* Notify Price Changes */}
              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-0.5">
                  <FieldLabel className="text-base font-medium">
                    Price Changes
                  </FieldLabel>
                  <p className="text-muted-foreground text-sm">
                    Get notified when items in your wishlist change price.
                  </p>
                </div>
                <Controller
                  name="notify_price_changes"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end p-6">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </form>
    </div>
  );
}
