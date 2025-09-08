import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Bell, Search, Menu, ShoppingCart, User, Settings, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function TopNavigation() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">M</span>
          </div>
          <span className="text-xl font-bold text-primary">Makubang</span>
        </Link>

        {/* Search Bar (Desktop) */}
        <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <input
              type="text"
              placeholder="Search food, restaurants..."
              className="w-full pl-10 pr-4 py-2 border border-border rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          {/* Search (Mobile) */}
          <Button variant="ghost" size="sm" className="md:hidden">
            <Search className="w-5 h-5" />
          </Button>

          {/* Notifications */}
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="w-5 h-5" />
            <Badge className="absolute -top-1 -right-1 w-5 h-5 text-xs p-0 flex items-center justify-center">
              3
            </Badge>
          </Button>

          {/* Cart */}
          <Button variant="ghost" size="sm" className="relative">
            <ShoppingCart className="w-5 h-5" />
            <Badge className="absolute -top-1 -right-1 w-5 h-5 text-xs p-0 flex items-center justify-center">
              2
            </Badge>
          </Button>

          {/* User Menu */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback>{user.name?.charAt(0) || 'U'}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                    <Badge variant="secondary" className="w-fit text-xs">
                      {user.role}
                    </Badge>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>

                {user.role === 'restaurant' && (
                  <DropdownMenuItem asChild>
                    <Link to="/restaurant" className="cursor-pointer">
                      <Menu className="mr-2 h-4 w-4" />
                      <span>Dashboard</span>
                    </Link>
                  </DropdownMenuItem>
                )}

                {user.role === 'admin' && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link to="/admin" className="cursor-pointer">
                        <Menu className="mr-2 h-4 w-4" />
                        <span>Admin Dashboard</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/admin/moderation" className="cursor-pointer">
                        <Menu className="mr-2 h-4 w-4" />
                        <span>Content Moderation</span>
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}

                {(user.role === 'influencer' || user.role === 'creator') && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link to="/influencer" className="cursor-pointer">
                        <Menu className="mr-2 h-4 w-4" />
                        <span>Influencer Dashboard</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/creator" className="cursor-pointer">
                        <Menu className="mr-2 h-4 w-4" />
                        <span>Creator Studio</span>
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}

                <DropdownMenuItem asChild>
                  <Link to="/orders" className="cursor-pointer">
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    <span>Order History</span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link to="/settings" className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="cursor-pointer"
                  onSelect={() => logout()}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center space-x-2">
              <Button asChild variant="ghost" size="sm">
                <Link to="/login">Login</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/register">Sign Up</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
