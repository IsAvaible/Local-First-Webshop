// --- Utilities ---
export const formatCurrency = (amount: number | string) => {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR"
  }).format(typeof amount === "string" ? parseFloat(amount) : amount);
};
