import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell, Search, User, LogOut, Home, Film, Heart, List, TrendingUp } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Header() {
  const [location, navigate] = useLocation();
  const { user, logoutMutation } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const isMobile = useIsMobile();
  
  // Handle scroll event to change header background
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setShowMobileSearch(false);
    }
  };
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${
      isScrolled ? "bg-background/90 backdrop-blur-sm shadow-md" : "bg-gradient-to-b from-background/80 to-transparent"
    }`}>
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <a 
              href="#" 
              className="text-primary font-bold text-2xl mr-8"
              onClick={(e) => {
                e.preventDefault();
                navigate("/");
              }}
            >
              CineMatch
            </a>
            
            {/* Navigation for desktop */}
            <nav className="hidden md:flex space-x-6">
              <a 
                href="#" 
                className={`${location === "/" ? "text-foreground font-medium" : "text-muted-foreground"} hover:text-foreground transition`}
                onClick={(e) => {
                  e.preventDefault();
                  navigate("/");
                }}
              >
                Home
              </a>
              <a 
                href="#" 
                className={`${location === "/recommendations" ? "text-foreground font-medium" : "text-muted-foreground"} hover:text-foreground transition`}
                onClick={(e) => {
                  e.preventDefault();
                  navigate("/recommendations");
                }}
              >
                Find Movies
              </a>
              <a 
                href="#" 
                className="text-muted-foreground hover:text-foreground transition"
                onClick={(e) => {
                  e.preventDefault();
                  navigate("/profile");
                }}
              >
                My List
              </a>
              <a 
                href="#" 
                className="text-muted-foreground hover:text-foreground transition"
                onClick={(e) => {
                  e.preventDefault();
                  navigate("/recommendations?sort=release_date.desc");
                }}
              >
                New & Popular
              </a>
            </nav>
          </div>
          
          {/* Right side controls */}
          <div className="flex items-center space-x-4">
            {/* Search for desktop */}
            <div className="relative hidden md:block">
              <form onSubmit={handleSearchSubmit}>
                <Input
                  type="text"
                  placeholder="Search for movies..."
                  className="bg-muted text-sm rounded-full w-48 focus-visible:ring-primary"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Button 
                  type="submit"
                  size="icon"
                  variant="ghost"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7"
                >
                  <Search className="h-4 w-4 text-muted-foreground" />
                </Button>
              </form>
            </div>
            
            {/* Mobile search icon */}
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setShowMobileSearch(!showMobileSearch)}
              >
                <Search className="h-5 w-5 text-muted-foreground" />
              </Button>
            )}
            
            {/* Notifications */}
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <span className="absolute -top-1 -right-1 bg-primary text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                3
              </span>
            </Button>
            
            {/* User profile */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80" />
                    <AvatarFallback>{user?.username?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-48" align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  <List className="mr-2 h-4 w-4" />
                  <span>My List</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        {/* Mobile Search Bar (hidden by default) */}
        {showMobileSearch && (
          <div className="mt-3 md:hidden">
            <form onSubmit={handleSearchSubmit} className="relative">
              <Input
                type="text"
                placeholder="Search for movies..."
                className="bg-muted text-sm rounded-full w-full focus-visible:ring-primary pr-12"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="absolute right-0 top-0 h-full flex items-center pr-3">
                <Button 
                  type="submit"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                >
                  <Search className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            </form>
          </div>
        )}
        
        {/* Mobile Navigation */}
        <nav className="md:hidden mt-3 pb-2 overflow-x-auto whitespace-nowrap">
          <div className="flex space-x-6">
            <a 
              href="#" 
              className={`${location === "/" ? "text-foreground font-medium" : "text-muted-foreground"}`}
              onClick={(e) => {
                e.preventDefault();
                navigate("/");
              }}
            >
              Home
            </a>
            <a 
              href="#" 
              className={`${location === "/recommendations" ? "text-foreground font-medium" : "text-muted-foreground"}`}
              onClick={(e) => {
                e.preventDefault();
                navigate("/recommendations");
              }}
            >
              Find Movies
            </a>
            <a 
              href="#" 
              className={`${location === "/profile" ? "text-foreground font-medium" : "text-muted-foreground"}`}
              onClick={(e) => {
                e.preventDefault();
                navigate("/profile");
              }}
            >
              My List
            </a>
            <a 
              href="#" 
              className="text-muted-foreground"
              onClick={(e) => {
                e.preventDefault();
                navigate("/recommendations?sort=release_date.desc");
              }}
            >
              New & Popular
            </a>
          </div>
        </nav>
      </div>
    </header>
  );
}
