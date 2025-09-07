import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown } from "lucide-react";

const stripePromise = import.meta.env.VITE_STRIPE_PUBLIC_KEY 
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)
  : null;

const SubscribeForm = () => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin,
      },
    });

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Payment Successful",
        description: "You are subscribed to the Restaurant Starter Plan!",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <Button 
        type="submit" 
        disabled={!stripe} 
        className="w-full bg-primary hover:bg-primary/90"
        data-testid="button-subscribe"
      >
        Subscribe to Restaurant Plan
      </Button>
    </form>
  );
};

export default function Subscription() {
  const [clientSecret, setClientSecret] = useState("");
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (showPaymentForm) {
      apiRequest("POST", "/api/create-subscription")
        .then((res) => res.json())
        .then((data) => {
          setClientSecret(data.clientSecret);
        })
        .catch((error) => {
          console.error("Error creating subscription:", error);
        });
    }
  }, [showPaymentForm]);

  if (showPaymentForm && !clientSecret) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (showPaymentForm && clientSecret && stripePromise) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto pt-8">
          <Card>
            <CardHeader>
              <CardTitle>Complete Your Subscription</CardTitle>
            </CardHeader>
            <CardContent>
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <SubscribeForm />
              </Elements>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-xl font-bold text-primary">Restaurant Plans</h1>
          <Button variant="ghost" onClick={() => window.history.back()}>
            ← Back
          </Button>
        </div>
      </header>

      <main className="pt-16 px-4 pb-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-4">Choose Your Restaurant Plan</h2>
            <p className="text-muted-foreground">
              Grow your restaurant business with our powerful video marketing platform
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Starter Plan */}
            <Card className="relative">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Starter Plan
                  <Badge variant="secondary">Current</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <div className="flex items-baseline">
                    <span className="text-3xl font-bold text-primary">₹1,000</span>
                    <span className="text-muted-foreground ml-2">/month</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Perfect for getting started</p>
                </div>
                
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-accent" />
                    <span className="text-sm">Track up to 20 orders</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-accent" />
                    <span className="text-sm">Basic analytics dashboard</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-accent" />
                    <span className="text-sm">Creator collaboration tools</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-accent" />
                    <span className="text-sm">Standard payment processing</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-accent" />
                    <span className="text-sm">Email support</span>
                  </li>
                </ul>
                
                <Button 
                  variant="outline" 
                  className="w-full" 
                  disabled
                  data-testid="button-current-plan"
                >
                  Current Plan
                </Button>
              </CardContent>
            </Card>

            {/* Premium Plan */}
            <Card className="relative border-primary shadow-lg">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground px-4 py-1">
                  <Crown className="w-3 h-3 mr-1" />
                  POPULAR
                </Badge>
              </div>
              
              <CardHeader>
                <CardTitle className="text-primary">Premium Plan</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <div className="flex items-baseline">
                    <span className="text-3xl font-bold text-primary">₹3,999</span>
                    <span className="text-muted-foreground ml-2">/month</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">For growing restaurants</p>
                </div>
                
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-accent" />
                    <span className="text-sm">Unlimited orders tracking</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-accent" />
                    <span className="text-sm">Advanced analytics & insights</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-accent" />
                    <span className="text-sm">Priority creator partnerships</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-accent" />
                    <span className="text-sm">Custom promotional campaigns</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-accent" />
                    <span className="text-sm">Dedicated account manager</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-accent" />
                    <span className="text-sm">Priority customer support</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-accent" />
                    <span className="text-sm">Advanced reporting tools</span>
                  </li>
                </ul>
                
                <Button 
                  className="w-full bg-primary hover:bg-primary/90"
                  onClick={() => {
                    if (!stripePromise) {
                      toast({
                        title: "Payment Processing Unavailable",
                        description: "Payment system is currently being configured. Please try again later.",
                        variant: "destructive",
                      });
                      return;
                    }
                    setShowPaymentForm(true);
                  }}
                  data-testid="button-upgrade-premium"
                >
                  Upgrade to Premium
                </Button>
              </CardContent>
            </Card>
          </div>
          
          {/* FAQ Section */}
          <div className="mt-12">
            <h3 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardContent className="p-6">
                  <h4 className="font-semibold mb-2">Can I change plans anytime?</h4>
                  <p className="text-sm text-muted-foreground">
                    Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <h4 className="font-semibold mb-2">What payment methods do you accept?</h4>
                  <p className="text-sm text-muted-foreground">
                    We accept all major credit/debit cards, UPI, net banking, and digital wallets.
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <h4 className="font-semibold mb-2">Is there a setup fee?</h4>
                  <p className="text-sm text-muted-foreground">
                    No setup fees! You only pay the monthly subscription cost for your chosen plan.
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <h4 className="font-semibold mb-2">Can I cancel anytime?</h4>
                  <p className="text-sm text-muted-foreground">
                    Yes, you can cancel your subscription anytime. Your plan remains active until the billing period ends.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
