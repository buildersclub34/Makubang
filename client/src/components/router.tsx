
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Home from "@/pages/home";
import Landing from "@/pages/landing";
import NotFound from "@/pages/not-found";
import UserProfile from "@/pages/user-profile";
import RestaurantProfile from "@/pages/restaurant-profile";
import CreatorProfile from "@/pages/creator-profile";
import DeliveryPartner from "@/pages/delivery-partner";
import Subscription from "@/pages/subscription";
import AdminDashboard from "@/pages/admin-dashboard";
import RestaurantDashboard from "@/pages/restaurant-dashboard";
import OrderTracking from "@/pages/order-tracking";
import Search from "@/pages/search";
import CreateContent from "@/pages/create-content";
import CreatorMarketplace from "@/pages/creator-marketplace";
import InventoryManagement from "@/pages/inventory-management";
import Settings from "@/pages/settings";
import MobileApp from "@/pages/mobile-app";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Landing />,
    errorElement: <NotFound />,
  },
  {
    path: "/home",
    element: <Home />,
  },
  {
    path: "/profile",
    element: <UserProfile />,
  },
  {
    path: "/restaurant/:id",
    element: <RestaurantProfile />,
  },
  {
    path: "/creator/:id",
    element: <CreatorProfile />,
  },
  {
    path: "/delivery-partner",
    element: <DeliveryPartner />,
  },
  {
    path: "/subscription",
    element: <Subscription />,
  },
  {
    path: "/admin",
    element: <AdminDashboard />,
  },
  {
    path: "/restaurant-dashboard",
    element: <RestaurantDashboard />,
  },
  {
    path: "/order/:id",
    element: <OrderTracking />,
  },
  {
    path: "/search",
    element: <Search />,
  },
  {
    path: "/create",
    element: <CreateContent />,
  },
  {
    path: "/marketplace",
    element: <CreatorMarketplace />,
  },
  {
    path: "/inventory",
    element: <InventoryManagement />,
  },
  {
    path: "/settings",
    element: <Settings />,
  },
  {
    path: "/mobile",
    element: <MobileApp />,
  },
]);

export default function Router() {
  return <RouterProvider router={router} />;
}
