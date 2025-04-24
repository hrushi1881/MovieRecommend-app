import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Plus, Check, Heart, Calendar, Clock, Film, PlayCircle, ArrowLeft, Loader2 } from "lucide-react";
import { MovieDetails, Genre, Cast, Video } from "@shared/api";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function MovieDetailPage() {
  const { id } = useParams();
  const [_, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [playTrailer, setPlayTrailer] = useState(false);
  
  // Fetch movie details
  const { data: movie, isLoading } = useQuery<MovieDetails>({
    queryKey: [`/api/tmdb/movie/${id}`],
    queryFn: async () => {
      const res = await fetch(`/api/tmdb/movie/${id}`);
      if (!res.ok) {
        throw new Error("Failed to fetch movie details");
      }
      return res.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Check if movie is in watchlist
  const { data: watchlistData } = useQuery<{ isInWatchlist: boolean }>({
    queryKey: [`/api/watchlist/${id}`],
    enabled: !!user && !!id,
    staleTime: 0, // Always refetch this
  });
  
  // Check if movie is liked
  const { data: likeData } = useQuery<{ isLiked: boolean }>({
    queryKey: [`/api/likes/${id}`],
    enabled: !!user && !!id,
    staleTime: 0, // Always refetch this
  });
  
  // Check user rating for this movie
  const { data: ratingData } = useQuery<{ rating: number | null }>({
    queryKey: [`/api/ratings/${id}`],
    enabled: !!user && !!id,
    staleTime: 0, // Always refetch this
  });
  
  // Add/remove from watchlist
  const watchlistMutation = useMutation({
    mutationFn: async () => {
      if (watchlistData?.isInWatchlist) {
        await apiRequest("DELETE", `/api/watchlist/${id}`);
      } else {
        await apiRequest("POST", `/api/watchlist/${id}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/watchlist/${id}`] });
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
        await apiRequest("DELETE", `/api/likes/${id}`);
      } else {
        await apiRequest("POST", `/api/likes/${id}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/likes/${id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/likes"] });
      
      toast({
        title: likeData?.isLiked 
          ? "Removed like" 
          : "Added like",
        description: movie?.title,
      });
    }
  });
  
  // Rate movie
  const rateMutation = useMutation({
    mutationFn: async (rating: number) => {
      await apiRequest("POST", `/api/ratings/${id}`, { rating });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/ratings/${id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/ratings"] });
      
      toast({
        title: "Movie rated",
        description: movie?.title,
      });
    }
  });
  
  // Find trailer
  const trailer = movie?.videos?.results?.find(
    (video) => video.type === "Trailer" && video.site === "YouTube"
  );
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!movie) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Movie not found</h1>
            <Button onClick={() => setLocation("/")}>Go back home</Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }
  
  const formatRuntime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };
  
  const releaseYear = movie.release_date ? new Date(movie.release_date).getFullYear() : "N/A";
  
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />
      
      <main className="flex-grow">
        {/* Hero banner */}
        <div className="relative h-[40vh] md:h-[60vh] overflow-hidden">
          {/* Trailer modal */}
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
                  <span className="sr-only">Close</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </Button>
              </div>
            </div>
          )}
          
          {/* Back button */}
          <Button
            variant="outline"
            size="icon"
            className="absolute top-4 left-4 z-10 rounded-full bg-black/50 hover:bg-black/70"
            onClick={() => setLocation("/")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          {/* Background image with gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent z-10"></div>
          <img 
            src={`https://image.tmdb.org/t/p/original${movie.backdrop_path}`}
            alt={movie.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.src = "https://images.unsplash.com/photo-1574267432553-4b4628081c31?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80";
            }}
          />
          
          {/* Play button */}
          {trailer && (
            <Button
              size="lg"
              className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 rounded-full"
              onClick={() => setPlayTrailer(true)}
            >
              <PlayCircle className="mr-2 h-5 w-5" />
              Play Trailer
            </Button>
          )}
        </div>
        
        {/* Movie content */}
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Movie poster column */}
            <div className="md:w-1/3 lg:w-1/4">
              <div className="rounded-lg overflow-hidden shadow-lg relative -mt-20 z-20 bg-card border">
                <img 
                  src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                  alt={movie.title}
                  className="w-full h-auto"
                  onError={(e) => {
                    e.currentTarget.src = "https://images.unsplash.com/photo-1536440136628-849c177e76a1?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&h=750&q=80";
                  }}
                />
              </div>
              
              {/* Action buttons */}
              <div className="flex flex-col gap-3 mt-4">
                <Button
                  onClick={() => watchlistMutation.mutate()}
                  disabled={watchlistMutation.isPending}
                  variant={watchlistData?.isInWatchlist ? "secondary" : "default"}
                >
                  {watchlistMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : watchlistData?.isInWatchlist ? (
                    <Check className="mr-2 h-4 w-4" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  {watchlistData?.isInWatchlist ? "In Watchlist" : "Add to Watchlist"}
                </Button>
                
                <Button
                  onClick={() => likeMutation.mutate()}
                  disabled={likeMutation.isPending}
                  variant={likeData?.isLiked ? "secondary" : "outline"}
                >
                  {likeMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Heart className={`mr-2 h-4 w-4 ${likeData?.isLiked ? "fill-current" : ""}`} />
                  )}
                  {likeData?.isLiked ? "Liked" : "Like"}
                </Button>
              </div>
              
              {/* Rating stars */}
              <div className="mt-6">
                <h3 className="font-medium mb-2">Rate this movie</h3>
                <div className="flex space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => rateMutation.mutate(star * 2)}
                      className={`text-2xl transition-colors ${
                        (ratingData?.rating || 0) >= star * 2
                          ? "text-yellow-500"
                          : "text-gray-400 hover:text-yellow-500"
                      }`}
                      disabled={rateMutation.isPending}
                    >
                      <Star className={`h-6 w-6 ${(ratingData?.rating || 0) >= star * 2 ? "fill-yellow-500" : ""}`} />
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Movie info */}
              <div className="mt-6 space-y-4">
                <div>
                  <h3 className="text-sm text-muted-foreground">Release Date</h3>
                  <div className="flex items-center mt-1">
                    <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{movie.release_date ? new Date(movie.release_date).toLocaleDateString() : 'N/A'}</span>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm text-muted-foreground">Runtime</h3>
                  <div className="flex items-center mt-1">
                    <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{movie.runtime ? formatRuntime(movie.runtime) : 'N/A'}</span>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm text-muted-foreground">Rating</h3>
                  <div className="flex items-center mt-1">
                    <Star className="h-4 w-4 mr-2 text-yellow-500 fill-yellow-500" />
                    <span>{movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'}/10</span>
                    <span className="text-sm text-muted-foreground ml-2">({movie.vote_count} votes)</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Movie details column */}
            <div className="md:w-2/3 lg:w-3/4">
              <h1 className="text-3xl md:text-4xl font-bold mb-2">{movie.title}</h1>
              
              <div className="flex items-center flex-wrap gap-2 mb-4">
                <div className="text-success font-medium mr-2">
                  {Math.round((movie.vote_average / 10) * 100)}% Match
                </div>
                <div className="mr-2">{releaseYear}</div>
                <div className="border border-muted px-2 py-0.5 text-sm">
                  {movie.adult ? "R" : "PG-13"}
                </div>
              </div>
              
              {/* Genres */}
              <div className="flex flex-wrap gap-2 mb-6">
                {movie.genres?.map((genre: Genre) => (
                  <Badge key={genre.id} variant="secondary">
                    {genre.name}
                  </Badge>
                ))}
              </div>
              
              {/* Overview */}
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-2">Overview</h2>
                <p className="text-muted-foreground">{movie.overview}</p>
              </div>
              
              {/* Cast */}
              {movie.credits?.cast && movie.credits.cast.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-xl font-semibold mb-4">Cast</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {movie.credits.cast.slice(0, 5).map((actor: Cast) => (
                      <div key={actor.id} className="text-center">
                        <div className="rounded-full overflow-hidden w-20 h-20 mx-auto mb-2">
                          {actor.profile_path ? (
                            <img 
                              src={`https://image.tmdb.org/t/p/w200${actor.profile_path}`}
                              alt={actor.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center">
                              <span className="text-xl">👤</span>
                            </div>
                          )}
                        </div>
                        <h3 className="font-medium text-sm">{actor.name}</h3>
                        <p className="text-xs text-muted-foreground">{actor.character}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Similar movies */}
              {movie.similar?.results && movie.similar.results.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold mb-4">Similar Movies</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {movie.similar.results.slice(0, 5).map((similarMovie) => (
                      <div 
                        key={similarMovie.id} 
                        className="cursor-pointer transition-transform hover:scale-105"
                        onClick={() => {
                          setLocation(`/movie/${similarMovie.id}`);
                          // Force a page refresh to load the new movie data
                          window.scrollTo(0, 0);
                        }}
                      >
                        <div className="rounded-lg overflow-hidden mb-2">
                          {similarMovie.poster_path ? (
                            <img 
                              src={`https://image.tmdb.org/t/p/w200${similarMovie.poster_path}`}
                              alt={similarMovie.title}
                              className="w-full h-auto aspect-[2/3] object-cover"
                            />
                          ) : (
                            <div className="w-full h-0 pb-[150%] bg-muted flex items-center justify-center">
                              <Film className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <h3 className="font-medium text-sm truncate">{similarMovie.title}</h3>
                        <p className="text-xs text-muted-foreground">
                          {similarMovie.release_date ? new Date(similarMovie.release_date).getFullYear() : "N/A"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
