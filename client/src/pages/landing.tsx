import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Heart, MessageCircle, Share, ShoppingBag } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-xl font-bold text-primary">Makubang</h1>
          <Button 
            onClick={() => window.location.href = '/api/login'}
            className="bg-primary hover:bg-primary/90"
            data-testid="button-login"
          >
            Login
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-20 pb-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            Discover Food Through 
            <span className="text-primary"> Videos</span>
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Watch short food videos, discover amazing dishes, and order directly from your favorite creators and restaurants.
          </p>
          <Button 
            size="lg" 
            className="bg-primary hover:bg-primary/90 text-lg px-8 py-6"
            onClick={() => window.location.href = '/api/login'}
            data-testid="button-get-started"
          >
            Get Started
          </Button>
        </div>
      </section>

      {/* Feature Preview */}
      <section className="py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-3xl font-bold text-center mb-12">Experience Food Discovery</h3>
          
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Mock Video Interface */}
            <div className="relative">
              <Card className="aspect-[9/16] max-w-sm mx-auto relative overflow-hidden bg-gradient-to-br from-orange-400 to-red-600">
                <CardContent className="p-0 h-full relative">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  
                  {/* Video Controls */}
                  <div className="absolute right-4 bottom-20 space-y-6 text-white">
                    <div className="flex flex-col items-center space-y-1">
                      <Heart className="w-8 h-8" />
                      <span className="text-xs">2.3k</span>
                    </div>
                    <div className="flex flex-col items-center space-y-1">
                      <MessageCircle className="w-8 h-8" />
                      <span className="text-xs">156</span>
                    </div>
                    <div className="flex flex-col items-center space-y-1">
                      <Share className="w-8 h-8" />
                      <span className="text-xs">Share</span>
                    </div>
                    <Button className="bg-primary hover:bg-primary/90 rounded-full px-4 py-2">
                      <ShoppingBag className="w-4 h-4 mr-2" />
                      Order
                    </Button>
                  </div>
                  
                  {/* Video Info */}
                  <div className="absolute bottom-4 left-4 right-20 text-white">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-white/20" />
                      <div>
                        <p className="font-semibold text-sm">@ramen_master</p>
                        <p className="text-xs text-gray-300">125k followers</p>
                      </div>
                      <span className="bg-accent text-accent-foreground px-2 py-1 rounded-full text-xs">Verified</span>
                    </div>
                    <p className="text-sm mb-2">Authentic tonkotsu ramen with perfectly boiled egg! 🍜✨</p>
                    <div className="flex items-center space-x-2 bg-black/30 rounded-full px-3 py-1 w-fit">
                      <span className="text-xs font-medium">Tokyo Ramen House</span>
                      <span className="text-xs text-accent">₹299</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Features List */}
            <div className="space-y-8">
              <div className="flex items-start space-x-4">
                <div className="bg-primary text-primary-foreground rounded-full p-3">
                  <Play className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-xl font-semibold mb-2">Short Food Videos</h4>
                  <p className="text-muted-foreground">Watch engaging mukbangs, cooking tips, and restaurant reviews from verified creators.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="bg-accent text-accent-foreground rounded-full p-3">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-xl font-semibold mb-2">Instant Ordering</h4>
                  <p className="text-muted-foreground">Order directly from videos with one tap. Skip the browsing, get what you see.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="bg-secondary text-secondary-foreground rounded-full p-3">
                  <Heart className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-xl font-semibold mb-2">Personalized Feed</h4>
                  <p className="text-muted-foreground">AI-powered recommendations based on your taste preferences and viewing history.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-muted">
        <div className="max-w-2xl mx-auto text-center">
          <h3 className="text-3xl font-bold mb-4">Ready to Discover?</h3>
          <p className="text-muted-foreground mb-8">
            Join thousands of food lovers discovering their next favorite meal through videos.
          </p>
          <Button 
            size="lg" 
            className="bg-primary hover:bg-primary/90"
            onClick={() => window.location.href = '/api/login'}
            data-testid="button-join-now"
          >
            Join Makubang
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border">
        <div className="max-w-4xl mx-auto text-center text-muted-foreground">
          <p>&copy; 2024 Makubang. Food discovery through videos.</p>
        </div>
      </footer>
    </div>
  );
}
