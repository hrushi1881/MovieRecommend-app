import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MovieGrid from "@/components/MovieGrid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search } from "lucide-react";
import { Movie } from "@shared/api";
import { searchMovies } from "@/lib/tmdb";

export default function SearchPage() {
  const [location, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  
  // Parse query parameters from URL
  useEffect(() => {
    const params = new URLSearchParams(location.split("?")[1]);
    const query = params.get("q");
    if (query) {
      setSearchQuery(query);
      setDebouncedQuery(query);
    }
  }, [location]);
  
  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        setDebouncedQuery(searchQuery);
        // Update URL with search query
        const newUrl = `/search?q=${encodeURIComponent(searchQuery)}`;
        if (location !== newUrl) {
          window.history.pushState(null, "", newUrl);
        }
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [searchQuery, location]);
  
  // Query search results
  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/tmdb/search", debouncedQuery, currentPage],
    queryFn: async () => {
      if (!debouncedQuery) return { results: [], page: 1, total_pages: 0, total_results: 0 };
      return searchMovies(debouncedQuery, currentPage);
    },
    enabled: !!debouncedQuery,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setDebouncedQuery(searchQuery);
      setCurrentPage(1);
      // Update URL with search query
      const newUrl = `/search?q=${encodeURIComponent(searchQuery)}`;
      if (location !== newUrl) {
        setLocation(newUrl);
      }
    }
  };
  
  const movies = data?.results || [];
  const totalPages = data?.total_pages || 0;
  const totalResults = data?.total_results || 0;
  
  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
      window.scrollTo(0, 0);
    }
  };
  
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
      window.scrollTo(0, 0);
    }
  };
  
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 pt-24 pb-8">
        <div className="max-w-4xl mx-auto mb-8">
          <h1 className="text-3xl font-bold mb-6">Search Movies</h1>
          
          <form onSubmit={handleSearchSubmit} className="relative mb-8">
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for movies by title, actor, or director..."
              className="w-full h-12 pl-4 pr-16 text-base rounded-full"
            />
            <Button 
              type="submit" 
              size="icon" 
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-10 w-10 rounded-full"
            >
              <Search className="h-5 w-5" />
            </Button>
          </form>
          
          {debouncedQuery && (
            <div className="mb-6">
              {isLoading ? (
                <div className="flex items-center">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  <span>Searching for "{debouncedQuery}"...</span>
                </div>
              ) : error ? (
                <div className="text-destructive">
                  Error searching for movies. Please try again.
                </div>
              ) : (
                <div className="text-muted-foreground">
                  {totalResults === 0 ? (
                    <span>No results found for "{debouncedQuery}"</span>
                  ) : (
                    <span>Found {totalResults.toLocaleString()} results for "{debouncedQuery}"</span>
                  )}
                </div>
              )}
            </div>
          )}
          
          {isLoading ? (
            <div className="min-h-[300px] flex items-center justify-center">
              <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
            </div>
          ) : movies.length > 0 ? (
            <>
              <MovieGrid movies={movies} />
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-8">
                  <Button
                    variant="outline"
                    onClick={handlePrevPage}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  
                  <span className="text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
                  
                  <Button
                    variant="outline"
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          ) : debouncedQuery ? (
            <div className="min-h-[300px] flex flex-col items-center justify-center text-center p-8 bg-card rounded-lg border">
              <h3 className="text-xl font-medium mb-2">No results found</h3>
              <p className="text-muted-foreground mb-4">
                We couldn't find any movies matching "{debouncedQuery}". Try a different search term.
              </p>
            </div>
          ) : null}
        </div>
      </main>
      
      <Footer />
    </div>
  );
}