import { Button } from "@/components/ui/button";
import { Home, Search, PlusCircle, Store, User } from "lucide-react";
import { useLocation } from "wouter";

interface BottomNavigationProps {
  currentSection: string;
  onSectionChange: (section: string) => void;
}

const navigationItems = [
  { id: "feed", label: "Home", icon: Home, path: "/" },
  { id: "search", label: "Search", icon: Search, path: "/search" },
  { id: "create", label: "Create", icon: PlusCircle, path: "/create" },
  { id: "restaurant", label: "Restaurant", icon: Store, path: "/restaurant" },
  { id: "profile", label: "Profile", icon: User, path: "/profile" },
];

export default function BottomNavigation({ currentSection, onSectionChange }: BottomNavigationProps) {
  const [location, setLocation] = useLocation();

  const handleNavigation = (item: typeof navigationItems[0]) => {
    onSectionChange(item.id);
    
    // Handle actual navigation for specific sections
    if (item.id === "profile") {
      setLocation("/profile");
    } else if (item.id === "restaurant") {
      // For demo, stay on current page but change section
      // In real app, this would navigate to restaurant dashboard
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-40">
      <div className="flex justify-around py-3 px-2">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentSection === item.id;
          
          return (
            <Button
              key={item.id}
              variant="ghost"
              className={`flex flex-col items-center space-y-1 px-3 py-2 h-auto transition-colors ${
                isActive 
                  ? "text-primary border-t-2 border-primary rounded-none" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => handleNavigation(item)}
              data-testid={`nav-${item.id}`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </Button>
          );
        })}
      </div>
    </nav>
  );
}
