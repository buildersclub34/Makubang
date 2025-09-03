
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Star, Zap, Check, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  orderLimit: number;
  features: string[];
  isPopular?: boolean;
}

interface SubscriptionBannerProps {
  currentPlan?: string;
  ordersRemaining?: number;
  onUpgrade: (planId: string) => void;
  className?: string;
}

const PLANS: SubscriptionPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 1000,
    orderLimit: 20,
    features: [
      'Up to 20 orders per month',
      'Basic analytics',
      'Standard support',
      'Video content promotion'
    ]
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 3000,
    orderLimit: 100,
    features: [
      'Up to 100 orders per month',
      'Advanced analytics',
      'Priority support',
      'Featured video placement',
      'Creator collaboration tools'
    ],
    isPopular: true
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 5000,
    orderLimit: -1,
    features: [
      'Unlimited orders',
      'Premium analytics dashboard',
      '24/7 dedicated support',
      'Top video placement',
      'Custom creator partnerships',
      'White-label options'
    ]
  }
];

const getPlanIcon = (planId: string) => {
  switch (planId) {
    case 'starter':
      return <Star className="w-5 h-5" />;
    case 'premium':
      return <Crown className="w-5 h-5" />;
    case 'enterprise':
      return <Zap className="w-5 h-5" />;
    default:
      return <Star className="w-5 h-5" />;
  }
};

export function SubscriptionBanner({ 
  currentPlan, 
  ordersRemaining, 
  onUpgrade, 
  className 
}: SubscriptionBannerProps) {
  const isLimitReached = ordersRemaining !== undefined && ordersRemaining <= 5;
  const currentPlanData = PLANS.find(p => p.id === currentPlan);

  if (!currentPlan) {
    return (
      <Card className={cn("border-orange-200 bg-orange-50", className)}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <div className="flex-1">
              <h3 className="font-semibold text-orange-900">No Active Subscription</h3>
              <p className="text-sm text-orange-700">Choose a plan to start receiving orders</p>
            </div>
            <Button onClick={() => onUpgrade('starter')} size="sm" className="bg-orange-600 hover:bg-orange-700">
              Get Started
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {isLimitReached && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-900">Low Order Limit</h3>
                <p className="text-sm text-red-700">
                  Only {ordersRemaining} orders remaining. Upgrade to continue receiving orders.
                </p>
              </div>
              <Button 
                onClick={() => onUpgrade('premium')} 
                size="sm" 
                className="bg-red-600 hover:bg-red-700"
              >
                Upgrade Now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        {PLANS.map((plan) => {
          const isCurrent = plan.id === currentPlan;
          const isUpgrade = currentPlanData && PLANS.indexOf(plan) > PLANS.indexOf(currentPlanData);
          
          return (
            <Card
              key={plan.id}
              className={cn(
                "relative transition-all hover:shadow-md",
                isCurrent && "border-blue-500 bg-blue-50",
                plan.isPopular && !isCurrent && "border-green-500",
                isUpgrade && "cursor-pointer hover:border-blue-400"
              )}
              onClick={() => isUpgrade && onUpgrade(plan.id)}
            >
              {plan.isPopular && !isCurrent && (
                <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-green-600">
                  Most Popular
                </Badge>
              )}
              
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  {getPlanIcon(plan.id)}
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  {isCurrent && <Badge variant="secondary">Current</Badge>}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold">₹{plan.price.toLocaleString()}</span>
                  <span className="text-sm text-muted-foreground">/month</span>
                </div>
              </CardHeader>

              <CardContent>
                <div className="space-y-3">
                  <div className="text-sm font-medium">
                    {plan.orderLimit === -1 ? 'Unlimited orders' : `${plan.orderLimit} orders/month`}
                  </div>
                  
                  <div className="space-y-2">
                    {plan.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  {!isCurrent && (
                    <Button
                      className="w-full mt-4"
                      variant={isUpgrade ? "default" : "outline"}
                      onClick={() => onUpgrade(plan.id)}
                    >
                      {isUpgrade ? 'Upgrade' : 'Downgrade'}
                    </Button>
                  )}

                  {isCurrent && ordersRemaining !== undefined && (
                    <div className="mt-4 p-3 bg-blue-100 rounded-lg">
                      <div className="flex justify-between text-sm">
                        <span>Orders remaining:</span>
                        <span className="font-semibold">
                          {plan.orderLimit === -1 ? '∞' : ordersRemaining}
                        </span>
                      </div>
                      {plan.orderLimit !== -1 && (
                        <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{
                              width: `${Math.max(0, (ordersRemaining / plan.orderLimit) * 100)}%`
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
