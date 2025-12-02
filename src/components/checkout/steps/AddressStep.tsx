import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPinIcon } from "lucide-react";

function AddressStep() {
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
        <Tabs defaultValue="new-address" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="saved">Saved Addresses</TabsTrigger>
            <TabsTrigger value="new-address">New Address</TabsTrigger>
          </TabsList>
          <TabsContent value="saved" className="mt-4 space-y-4">
            <div className="hover:border-primary border-primary bg-primary/5 cursor-pointer rounded-lg border p-4">
              <div className="font-medium">John Doe (Home)</div>
              <div className="text-muted-foreground text-sm">
                123 Main St, New York, NY 10001
              </div>
            </div>
          </TabsContent>
          <TabsContent value="new-address" className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First name</Label>
                <Input placeholder="John" />
              </div>
              <div className="space-y-2">
                <Label>Last name</Label>
                <Input placeholder="Doe" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Street Address</Label>
              <Input placeholder="123 Main St" />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default AddressStep;
