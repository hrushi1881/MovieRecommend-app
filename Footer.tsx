import { useLocation } from "wouter";

export default function Footer() {
  const [_, navigate] = useLocation();
  
  return (
    <footer className="bg-background py-8 px-4 mt-8 border-t border-border">
      <div className="container mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <h4 className="text-foreground font-medium mb-4">CineMatch</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#" className="text-muted-foreground hover:text-foreground transition">
                  About Us
                </a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-foreground transition">
                  Contact
                </a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-foreground transition">
                  Careers
                </a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-foreground transition">
                  Blog
                </a>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-foreground font-medium mb-4">Help</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#" className="text-muted-foreground hover:text-foreground transition">
                  FAQ
                </a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-foreground transition">
                  Support Center
                </a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-foreground transition">
                  Device Support
                </a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-foreground transition">
                  Privacy
                </a>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-foreground font-medium mb-4">Account</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a 
                  href="#" 
                  className="text-muted-foreground hover:text-foreground transition"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate("/profile");
                  }}
                >
                  Your Account
                </a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-foreground transition">
                  Settings
                </a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-foreground transition">
                  Subscriptions
                </a>
              </li>
              <li>
                <a 
                  href="#" 
                  className="text-muted-foreground hover:text-foreground transition"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate("/profile");
                  }}
                >
                  Watchlist
                </a>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-foreground font-medium mb-4">Connect</h4>
            <div className="flex space-x-4 mb-4">
              <a href="#" className="text-muted-foreground hover:text-foreground transition">
                <i className="fab fa-facebook-f"></i>
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition">
                <i className="fab fa-twitter"></i>
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition">
                <i className="fab fa-instagram"></i>
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition">
                <i className="fab fa-youtube"></i>
              </a>
            </div>
            <p className="text-sm text-muted-foreground">
              Download our mobile app
            </p>
            <div className="flex space-x-2 mt-2">
              <a href="#" className="block">
                <i className="fab fa-apple text-foreground text-lg"></i>
              </a>
              <a href="#" className="block">
                <i className="fab fa-android text-foreground text-lg"></i>
              </a>
            </div>
          </div>
        </div>
        
        <div className="border-t border-border mt-8 pt-8 text-center text-xs text-muted-foreground">
          <p>Powered by TMDB API. All movie-related information is sourced from The Movie Database (TMDB).</p>
          <p className="mt-2">© {new Date().getFullYear()} CineMatch. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
