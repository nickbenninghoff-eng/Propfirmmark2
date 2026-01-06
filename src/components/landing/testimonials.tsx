import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Michael Chen",
    role: "Funded Trader",
    content:
      "I've been trading with PropFirm for 6 months now. The rules are fair, and I've already received multiple payouts. Best decision I made for my trading career.",
    rating: 5,
    initials: "MC",
  },
  {
    name: "Sarah Williams",
    role: "Day Trader",
    content:
      "The evaluation process was straightforward. No crazy rules or hidden gotchas. Passed my $50K account in 2 weeks and got funded the same day.",
    rating: 5,
    initials: "SW",
  },
  {
    name: "James Rodriguez",
    role: "Futures Trader",
    content:
      "What I love most is the no time limit policy. I could take my time, learn the rules, and pass without any pressure. Now I'm trading with $100K of their capital.",
    rating: 5,
    initials: "JR",
  },
  {
    name: "Emily Thompson",
    role: "Swing Trader",
    content:
      "The support team is incredible. Had a question about the drawdown rules and got a detailed response within an hour. They really care about their traders.",
    rating: 5,
    initials: "ET",
  },
  {
    name: "David Park",
    role: "Funded Trader",
    content:
      "Already received over $15K in payouts. The 80% profit split is real - no hidden fees or deductions. Highly recommend to any serious trader.",
    rating: 5,
    initials: "DP",
  },
  {
    name: "Lisa Anderson",
    role: "NQ Trader",
    content:
      "Switched from another prop firm and the difference is night and day. Better rules, faster payouts, and actual transparency about everything.",
    rating: 5,
    initials: "LA",
  },
];

export function Testimonials() {
  return (
    <section className="py-20 md:py-32 bg-muted/30">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Trusted by Thousands of Traders
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Join our community of successful funded traders. Here&apos;s what they have to say.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="bg-background">
              <CardContent className="pt-6">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-muted-foreground mb-6">&ldquo;{testimonial.content}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {testimonial.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
