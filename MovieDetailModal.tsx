import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Plus, Check, Heart, X, Play } from "lucide-react";
import { MovieDetails, Genre, Cast, Video } from "@shared/api";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";

interface MovieDetailModalProps {
  movieId: number;
  isOpen: boolean;
  onClose: () => void;
}

export default function MovieDetailModal({ movieId, isOpen, onClose }: MovieDetailModalProps) {
  const [_, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [playTrailer, setPlayTrailer] = useState(false);
  
  // Fetch movie details
  const { data: movie, isLoading } = useQuery<MovieDetails>({
    queryKey: [`/api/tmdb/movie/${movieId}`],
    queryFn: async () => {
      const res = await fetch(`/api/tmdb/movie/${movieId}`);
      if (!res.ok) {
        throw new Error("Failed to fetch movie details");
      }
      return res.json();
    },
    enabled: isOpen && !!movieId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Check if movie is in watchlist
  const { data: watchlistData } = useQuery<{ isInWatchlist: boolean }>({
    queryKey: [`/api/watchlist/${movieId}`],
    enabled: isOpen && !!user && !!movieId,
    staleTime: 0, // Always refetch this
  });
  
  // Check if movie is liked
  const { data: likeData } = useQuery<{ isLiked: boolean }>({
    queryKey: [`/api/likes/${movieId}`],
    enabled: isOpen && !!user && !!movieId,
    staleTime: 0, // Always refetch this
  });
  
  // Add/remove from watchlist
  const watchlistMutation = useMutation({
    mutationFn: async () => {
      if (watchlistData?.isInWatchlist) {
        await apiRequest("DELETE", `/api/watchlist/${movieId}`);
      } else {
        await apiRequest("POST", `/api/watchlist/${movieId}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/watchlist/${movieId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
      
      toast({
        title: watchlistData?.isInWatchlist 
          ? "Removed from watchlist" 
          : "Added to watchlist",
        description: movie?.title,
      });
    }
  });
  
  // Like/unlike movie
  const likeMutation = useMutation({
    mutationFn: async () => {
      if (likeData?.isLiked) {
        await apiRequest("DELETE", `/api/likes/${movieId}`);
      } else {
        await apiRequest("POST", `/api/likes/${movieId}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/likes/${movieId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/likes"] });
      
      toast({
        title: likeData?.isLiked 
          ? "Removed like" 
          : "Added like",
        description: movie?.title,
      });
    }
  });
  
  // Find trailer
  const trailer = movie?.videos?.results?.find(
    (video) => video.type === "Trailer" && video.site === "YouTube"
  );
  
  // Close trailer when modal closes
  useEffect(() => {
    if (!isOpen) {
      setPlayTrailer(false);
    }
  }, [isOpen]);
  
  const handleViewFullDetails = () => {
    navigate(`/movie/${movieId}`);
    onClose();
  };
  
  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-4xl">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  
  if (!movie) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Error</DialogTitle>
            <DialogDescription>
              Failed to load movie details. Please try again later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={onClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
  
  const releaseYear = movie.release_date ? new Date(movie.release_date).getFullYear() : "N/A";
  const match = Math.round((movie.vote_average / 10) * 100);
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl p-0 gap-0 overflow-hidden">
        {/* Movie Header/Banner */}
        <div className="relative h-64">
          <img 
            src={`https://image.tmdb.org/t/p/original${movie.backdrop_path}`}
            alt={movie.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.src = "https://images.unsplash.com/photo-1574267432553-4b4628081c31?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80";
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent"></div>
          
          {/* Play Button */}
          {trailer && (
            <Button
              variant="secondary"
              className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-black rounded-full"
              onClick={() => setPlayTrailer(true)}
            >
              <Play className="h-5 w-5" />
            </Button>
          )}
          
          {/* Trailer Modal */}
          {playTrailer && trailer && (
            <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
              <div className="relative w-full max-w-5xl aspect-video">
                <iframe
                  src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1`}
                  className="absolute inset-0 w-full h-full"
                  title={`${movie.title} trailer`}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute top-4 right-4 rounded-full bg-black/50 hover:bg-black/70"
                  onClick={() => setPlayTrailer(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
        
        {/* Movie Content */}
        <div className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Movie Poster (left side) */}
            <div className="md:w-1/3">
              <img 
                src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                alt={movie.title}
                className="w-full h-auto rounded-lg shadow-lg"
                onError={(e) => {
                  e.currentTarget.src = "https://via.placeholder.com/300x450?text=No+Image";
                }}
              />
              
              {/* Action Buttons */}
              <div className="flex justify-between mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 mr-2"
                  onClick={() => {
                    if (user) {
                      watchlistMutation.mutate();
                    } else {
                      navigate("/auth");
                      onClose();
                    }
                  }}
                  disabled={watchlistMutation.isPending}
                >
                  {watchlistMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : watchlistData?.isInWatchlist ? (
                    <Check className="mr-1 h-4 w-4" />
                  ) : (
                    <Plus className="mr-1 h-4 w-4" />
                  )}
                  {watchlistData?.isInWatchlist ? "In List" : "Watchlist"}
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    if (user) {
                      likeMutation.mutate();
                    } else {
                      navigate("/auth");
                      onClose();
                    }
                  }}
                  disabled={likeMutation.isPending}
                >
                  {likeMutation.isPending ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <Heart 
                      className={`mr-1 h-4 w-4 ${likeData?.isLiked ? "fill-primary text-primary" : ""}`} 
                    />
                  )}
                  {likeData?.isLiked ? "Liked" : "Like"}
                </Button>
              </div>
            </div>
            
            {/* Movie Details (right side) */}
            <div className="md:w-2/3">
              <h2 className="text-2xl font-bold mb-2">{movie.title}</h2>
              
              <div className="flex items-center mb-4">
                <div className="text-success font-medium mr-3">{match}% Match</div>
                <div className="mr-3">{releaseYear}</div>
                <div className="border border-muted px-1 mr-3">
                  {movie.adult ? "R" : "PG-13"}
                </div>
                {movie.runtime && (
                  <div>{Math.floor(movie.runtime / 60)}h {movie.runtime % 60}m</div>
                )}
              </div>
              
              <div className="flex items-center mb-4 text-sm">
                <div className="flex mr-4">
                  <Star className="h-4 w-4 text-yellow-500 mr-1 fill-yellow-500" />
                  <span>{movie.vote_average.toFixed(1)}/10</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  ({movie.vote_count.toLocaleString()} votes)
                </div>
              </div>
              
              <p className="text-muted-foreground mb-6">
                {movie.overview}
              </p>
              
              {/* Genres */}
              <div className="mb-4">
                <div className="text-sm text-muted-foreground mb-1">Genres:</div>
                <div className="flex flex-wrap gap-2 mt-1">
                  {movie.genres?.map((genre: Genre) => (
                    <Badge key={genre.id} variant="secondary">
                      {genre.name}
                    </Badge>
                  ))}
                </div>
              </div>
              
              {/* Cast */}
              {movie.credits?.cast && movie.credits.cast.length > 0 && (
                <div className="mb-4">
                  <div className="text-sm text-muted-foreground mb-1">Cast:</div>
                  <div>
                    {movie.credits.cast
                      .slice(0, 5)
                      .map((person: Cast) => person.name)
                      .join(", ")}
                  </div>
                </div>
              )}
              
              {/* Director */}
              {movie.credits?.crew && (
                <div className="mb-4">
                  <div className="text-sm text-muted-foreground mb-1">Director:</div>
                  <div>
                    {movie.credits.crew
                      .filter((person) => person.job === "Director")
                      .map((person) => person.name)
                      .join(", ") || "Unknown"}
                  </div>
                </div>
              )}
              
              <Button 
                variant="default" 
                className="mt-4"
                onClick={handleViewFullDetails}
              >
                View Full Details
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
