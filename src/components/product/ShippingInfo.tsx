import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@/components/ui/accordion";

export default function ShippingInfo() {
  return (
    <div className="mt-16">
      <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-slate-100">
        Shipping & Returns
      </h2>
      <Accordion type="single" collapsible className="mt-4 w-full">
        <AccordionItem value="item-1">
          <AccordionTrigger>Shipping</AccordionTrigger>
          <AccordionContent>
            <p>
              We offer free standard shipping on all orders over $50. For orders
              under $50, a flat rate of $5 applies.
            </p>
            <p className="mt-2">
              Orders are typically processed within 1-2 business days. You will
              receive a shipping confirmation email with a tracking number once
              your order has shipped.
            </p>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-2">
          <AccordionTrigger>Returns</AccordionTrigger>
          <AccordionContent>
            <p>
              We accept returns within 30 days of the delivery date. To be
              eligible for a return, your item must be unused and in the same
              condition that you received it.
            </p>
            <p className="mt-2">
              To initiate a return, please contact our customer support team
              with your order number.
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
