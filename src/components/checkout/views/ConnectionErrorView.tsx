import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WifiOff } from "lucide-react";

interface ConnectionErrorViewProps {
  onRetry: () => void;
}

export default function ConnectionErrorView({
  onRetry
}: ConnectionErrorViewProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md text-center shadow-lg">
        <CardHeader>
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-red-100 p-4 dark:bg-red-900/20">
              <WifiOff className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <CardTitle className="text-xl">Connection Required</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground text-sm">
            We need an active internet connection to initialize your secure
            checkout session. Please check your connection and try again.
          </p>
          <Button onClick={onRetry} className="w-full">
            Try Again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
