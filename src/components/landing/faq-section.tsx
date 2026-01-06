import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "How does the evaluation work?",
    answer:
      "Our evaluation is simple: hit your profit target while staying within the drawdown rules. There's no time limit, so you can trade at your own pace. Once you pass, you'll receive your funded account within 24 hours.",
  },
  {
    question: "What is the trailing drawdown?",
    answer:
      "The trailing drawdown starts at your initial balance and trails up with your equity at end-of-day. For example, if you start with $50K and end the day at $52K profit, your new drawdown threshold becomes $49.5K ($52K - $2.5K max drawdown). The drawdown stops trailing once you hit your profit target.",
  },
  {
    question: "What markets can I trade?",
    answer:
      "You can trade all major futures markets including ES, NQ, YM, RTY (indices), CL, GC (commodities), and many more. We provide access to CME, CBOT, NYMEX, and COMEX exchanges.",
  },
  {
    question: "How do payouts work?",
    answer:
      "Once you're funded, you can request a payout after maintaining a profit buffer. We process payouts weekly and offer multiple payment methods including bank transfer, PayPal, and cryptocurrency. You keep 80% of all profits.",
  },
  {
    question: "Is there a minimum trading day requirement?",
    answer:
      "Yes, you need to trade for a minimum of 5 days during the evaluation. A trading day is counted when you make at least one trade. There's no maximum limit - take as long as you need.",
  },
  {
    question: "Can I hold positions overnight or over the weekend?",
    answer:
      "You can hold positions overnight during weekdays. However, all positions must be closed before the weekend market close (Friday 4:00 PM CT). This is to protect both you and us from weekend gap risk.",
  },
  {
    question: "What happens if I fail the evaluation?",
    answer:
      "If you hit the maximum drawdown, your evaluation ends. However, you can purchase a reset at a discounted price to try again. Your trading data and account history are preserved for your reference.",
  },
  {
    question: "Do you offer a free trial?",
    answer:
      "We occasionally run promotions and free trial offers. Join our Discord community or subscribe to our newsletter to be notified of upcoming promotions.",
  },
];

export function FaqSection() {
  return (
    <section id="faq" className="py-20 md:py-32">
      <div className="container max-w-3xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-muted-foreground">
            Everything you need to know about getting funded.
          </p>
        </div>

        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`}>
              <AccordionTrigger className="text-left">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
