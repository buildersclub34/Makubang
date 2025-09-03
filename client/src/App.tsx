import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import RestaurantProfile from "@/pages/restaurant-profile";
import CreatorProfile from "@/pages/creator-profile";
import AdminDashboard from "@/pages/admin-dashboard";
import UserProfile from "@/pages/user-profile";
import Subscription from "@/pages/subscription";
import DeliveryPartner from "@/pages/delivery-partner";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={Home} />
          <Route path="/restaurant/:id" component={RestaurantProfile} />
          <Route path="/creator/:id" component={CreatorProfile} />
          <Route path="/admin" component={AdminDashboard} />
          <Route path="/profile" component={UserProfile} />
          <Route path="/subscription" component={Subscription} />
          <Route path="/delivery-partner" component={DeliveryPartner} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
