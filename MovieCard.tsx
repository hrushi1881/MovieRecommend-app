import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Movie } from "@shared/api";
import { Play, Plus, Check, ThumbsUp, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

interface MovieCardProps {
  movie: Movie;
}

export default function MovieCard({ movie }: MovieCardProps) {
  const [_, navigate] = useLocation();
  const { user } = useAuth();
  const [isHovered, setIsHovered] = useState(false);
  
  // Calculate match percentage
  const match = Math.round((movie.vote_average / 10) * 100);
  
  // Format release year
  const releaseYear = movie.release_date ? new Date(movie.release_date).getFullYear() : "";
  
  // Check if movie is in watchlist
  const { data: watchlistData } = useQuery<{ isInWatchlist: boolean }>({
    queryKey: [`/api/watchlist/${movie.id}`],
    enabled: !!user,
    staleTime: 0, // Always refetch this
  });
  
  // Add/remove from watchlist
  const watchlistMutation = useMutation({
    mutationFn: async () => {
      if (watchlistData?.isInWatchlist) {
        await apiRequest("DELETE", `/api/watchlist/${movie.id}`);
      } else {
        await apiRequest("POST", `/api/watchlist/${movie.id}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/watchlist/${movie.id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
    }
  });
  
  const handleWatchlistClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigating to movie details
    if (user) {
      watchlistMutation.mutate();
    } else {
      navigate("/auth");
    }
  };
  
  const navigateToMovie = () => {
    navigate(`/movie/${movie.id}`);
  };
  
  return (
    <div 
      className="movie-card bg-card rounded-lg overflow-hidden transition-transform duration-300 hover:scale-105 hover:shadow-lg"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={navigateToMovie}
    >
      <div className="relative">
        <img 
          src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
          alt={movie.title}
          className="w-full h-auto aspect-[2/3] object-cover"
          onError={(e) => {
            e.currentTarget.src = "https://via.placeholder.com/500x750?text=No+Image";
          }}
        />
        
        {/* Overlay that shows on hover */}
        <div 
          className={`absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent flex items-end transition-opacity duration-300 ${
            isHovered ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="p-3 w-full">
            <div className="flex justify-between items-center mb-2">
              <Button
                size="icon"
                className="rounded-full bg-white text-black hover:bg-gray-200 h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  navigateToMovie();
                }}
              >
                <Play className="h-4 w-4" />
              </Button>
              
              <div className="flex space-x-2">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-white hover:text-primary hover:bg-transparent"
                  onClick={handleWatchlistClick}
                >
                  {watchlistData?.isInWatchlist ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </Button>
                
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-white hover:text-primary hover:bg-transparent"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ThumbsUp className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="flex items-center text-xs">
              <span className="text-green-500 font-medium mr-2">{match}% Match</span>
              {movie.adult && <span className="border border-gray-500 px-1 mr-1">R</span>}
              {releaseYear && <span>{releaseYear}</span>}
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-3">
        <h3 className="font-medium text-sm truncate">{movie.title}</h3>
      </div>
    </div>
  );
}
