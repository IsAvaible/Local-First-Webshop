import { useDocument, type AutomergeUrl } from "@automerge/react";
import type { BudgetDoc } from "@/lib/automerge-helpers.ts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card.tsx";
import { CreateBudgetDialog } from "./CreateBudgetDialog.tsx";
import { CreateGoalDialog } from "./CreateGoalDialog.tsx";

export function BudgetDetail({ budgetUrl }: { budgetUrl: AutomergeUrl }) {
  const [budgetDoc] = useDocument<BudgetDoc>(budgetUrl);

  if (!budgetDoc) return <div>Loading budget...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{budgetDoc.meta.name}</CardTitle>
        <CardDescription>Manage your budgets and goals.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">Budgets</h3>
            <CreateBudgetDialog budgetUrl={budgetUrl} />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Object.values(budgetDoc.budgets).map((budget) => (
              <Card key={budget.id}>
                <CardHeader>
                  <CardTitle>{budget.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>
                    Amount:{" "}
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: budget.currency
                    }).format(budget.amount)}
                  </p>
                  <p>Span: {budget.span.type}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">Goals</h3>
            <CreateGoalDialog budgetUrl={budgetUrl} />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Object.values(budgetDoc.goals).map((goal) => (
              <Card key={goal.id}>
                <CardHeader>
                  <CardTitle>{goal.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>
                    Target:{" "}
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: goal.currency
                    }).format(goal.targetAmount)}
                  </p>
                  <p>
                    Current:{" "}
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: goal.currency
                    }).format(goal.currentAmount)}
                  </p>
                  <p>Status: {goal.status}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
