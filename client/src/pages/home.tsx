import { useAuth } from "@/hooks/useAuth";
import VideoFeed from "@/components/video-feed";
import BottomNavigation from "@/components/bottom-navigation";
import { Button } from "@/components/ui/button";
import { Search, Bell } from "lucide-react";
import { useState } from "react";

export default function Home() {
  const { user } = useAuth();
  const [currentSection, setCurrentSection] = useState("feed");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-bold text-primary">Makubang</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Search Bar */}
            <div className="hidden sm:flex items-center bg-muted rounded-full px-4 py-2 min-w-[300px]">
              <Search className="w-4 h-4 text-muted-foreground mr-2" />
              <input 
                type="text" 
                placeholder="Search food, creators..." 
                className="bg-transparent outline-none text-sm w-full"
                data-testid="input-search"
              />
            </div>
            
            {/* Notifications */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="relative"
              data-testid="button-notifications"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                3
              </span>
            </Button>
            
            {/* Profile */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full overflow-hidden"
              data-testid="button-profile"
            >
              <img 
                src={user?.profileImageUrl || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face"} 
                alt="Profile" 
                className="w-8 h-8 object-cover" 
              />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-16 pb-20">
        {currentSection === "feed" && <VideoFeed />}
        
        {currentSection === "search" && (
          <div className="max-w-md mx-auto p-6">
            <h2 className="text-2xl font-bold mb-4">Search</h2>
            <p className="text-muted-foreground">Search functionality coming soon...</p>
          </div>
        )}
        
        {currentSection === "create" && (
          <div className="max-w-md mx-auto p-6">
            <h2 className="text-2xl font-bold mb-4">Create Content</h2>
            <p className="text-muted-foreground">Content creation tools coming soon...</p>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation currentSection={currentSection} onSectionChange={setCurrentSection} />
    </div>
  );
}
