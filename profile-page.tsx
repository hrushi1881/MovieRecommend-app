import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { UserPreferences } from "@shared/schema";
import { Movie } from "@shared/api";
import MovieCard from "@/components/MovieCard";
import UserProgressBar from "@/components/UserProgressBar";
import UserChallenges from "@/components/UserChallenges";
import PersonalizedRecommendations from "@/components/PersonalizedRecommendations";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Check, BookOpen, Trophy, Sparkles, Film, History } from "lucide-react";

export default function ProfilePage() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [selectedFavoriteMovies, setSelectedFavoriteMovies] = useState<number[]>([]);
  
  // Get user preferences
  const { data: preferences } = useQuery<UserPreferences>({
    queryKey: ["/api/preferences"],
    staleTime: 0,
  });
  
  // Fetch user's watchlist movies
  const { data: watchlistIds } = useQuery<number[]>({
    queryKey: ["/api/watchlist"],
    staleTime: 0,
  });
  
  // Fetch user's rated movies
  const { data: ratings } = useQuery({
    queryKey: ["/api/ratings"],
    staleTime: 0,
  });
  
  // Fetch user's liked movies
  const { data: likedIds } = useQuery<number[]>({
    queryKey: ["/api/likes"],
    staleTime: 0,
  });
  
  // Fetch user's watched movies
  const { data: watchedIds } = useQuery<number[]>({
    queryKey: ["/api/watched"],
    staleTime: 0,
  });
  
  // Fetch user level info
  const { data: userLevel } = useQuery({
    queryKey: ["/api/user/level"],
    staleTime: 0,
  });
  
  // Fetch genres
  const { data: genresData, isLoading: loadingGenres } = useQuery({
    queryKey: ["/api/tmdb/genres"],
    staleTime: 1000 * 60 * 60, // 1 hour
  });
  
  // Fetch languages
  const { data: languagesData, isLoading: loadingLanguages } = useQuery({
    queryKey: ["/api/tmdb/languages"],
    staleTime: 1000 * 60 * 60, // 1 hour
  });
  
  // Fetch watchlist movies
  const { data: watchlistMoviesData, isLoading: loadingWatchlist } = useQuery({
    queryKey: ["watchlist-movies", watchlistIds],
    enabled: !!watchlistIds && watchlistIds.length > 0,
    queryFn: async () => {
      if (!watchlistIds || watchlistIds.length === 0) return { results: [] };
      
      // Fetch each movie by ID
      const movies = await Promise.all(
        watchlistIds.map(async (id) => {
          try {
            const res = await fetch(`/api/tmdb/movie/${id}`);
            if (!res.ok) return null;
            return res.json();
          } catch (error) {
            console.error(`Error fetching movie ${id}:`, error);
            return null;
          }
        })
      );
      
      return { results: movies.filter(Boolean) };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Fetch watched movies
  const { data: watchedMoviesData, isLoading: loadingWatched } = useQuery({
    queryKey: ["watched-movies", watchedIds],
    enabled: !!watchedIds && watchedIds.length > 0,
    queryFn: async () => {
      if (!watchedIds || watchedIds.length === 0) return { results: [] };
      
      // Fetch each movie by ID
      const movies = await Promise.all(
        watchedIds.map(async (id) => {
          try {
            const res = await fetch(`/api/tmdb/movie/${id}`);
            if (!res.ok) return null;
            return res.json();
          } catch (error) {
            console.error(`Error fetching movie ${id}:`, error);
            return null;
          }
        })
      );
      
      return { results: movies.filter(Boolean) };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Update user preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: async (newPreferences: UserPreferences) => {
      await apiRequest("PUT", "/api/preferences", newPreferences);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/preferences"] });
      queryClient.invalidateQueries({ queryKey: ["/api/recommendations"] });
      toast({
        title: "Preferences updated",
        description: "Your movie preferences have been saved",
      });
    },
    onError: (error) => {
      toast({
        title: "Error updating preferences",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Initialize selected genres and languages from preferences
  useEffect(() => {
    if (preferences) {
      setSelectedGenres(preferences.genres || []);
      setSelectedLanguages(preferences.languages || []);
      setSelectedFavoriteMovies(preferences.favoriteMovies || []);
    }
  }, [preferences]);
  
  // Handle genre selection
  const toggleGenre = (genreId: number) => {
    setSelectedGenres(prev => 
      prev.includes(genreId)
        ? prev.filter(id => id !== genreId)
        : [...prev, genreId]
    );
  };
  
  // Handle language selection
  const toggleLanguage = (languageCode: string) => {
    setSelectedLanguages(prev => 
      prev.includes(languageCode)
        ? prev.filter(code => code !== languageCode)
        : [...prev, languageCode]
    );
  };
  
  // Save preferences
  const savePreferences = () => {
    updatePreferencesMutation.mutate({
      genres: selectedGenres,
      languages: selectedLanguages,
      favoriteMovies: selectedFavoriteMovies
    });
  };
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  // Filter the most important languages
  const popularLanguages = [
    { iso_639_1: "en", english_name: "English" },
    { iso_639_1: "es", english_name: "Spanish" },
    { iso_639_1: "fr", english_name: "French" },
    { iso_639_1: "de", english_name: "German" },
    { iso_639_1: "it", english_name: "Italian" },
    { iso_639_1: "ja", english_name: "Japanese" },
    { iso_639_1: "ko", english_name: "Korean" },
    { iso_639_1: "hi", english_name: "Hindi" },
    { iso_639_1: "ru", english_name: "Russian" },
    { iso_639_1: "zh", english_name: "Chinese" },
    { iso_639_1: "pt", english_name: "Portuguese" },
    { iso_639_1: "ar", english_name: "Arabic" },
  ];
  
  const watchlistMovies = watchlistMoviesData?.results || [];
  const watchedMovies = watchedMoviesData?.results || [];
  
  if (loadingGenres || loadingLanguages) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-500">
                  ODYSCAPE
                </span> Profile
              </h1>
              <p className="text-muted-foreground">Your personal cinematic journey</p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                variant="outline"
                onClick={() => window.location.href = "/recommendation-page"}
                className="flex items-center gap-2"
              >
                <Sparkles size={16} />
                Get Recommendations
              </Button>
              <Button variant="outline" onClick={handleLogout}>
                Sign Out
              </Button>
            </div>
          </div>
          
          {/* User progress bar */}
          <div className="mb-8">
            <UserProgressBar />
          </div>
          
          <Tabs defaultValue="journey">
            <TabsList className="mb-6">
              <TabsTrigger value="journey" className="flex items-center gap-1">
                <Film size={16} />
                My Journey
              </TabsTrigger>
              <TabsTrigger value="activity" className="flex items-center gap-1">
                <History size={16} />
                Activity
              </TabsTrigger>
              <TabsTrigger value="challenges" className="flex items-center gap-1">
                <Trophy size={16} />
                Challenges
              </TabsTrigger>
              <TabsTrigger value="preferences" className="flex items-center gap-1">
                <BookOpen size={16} />
                Preferences
              </TabsTrigger>
            </TabsList>
            
            {/* Journey Tab */}
            <TabsContent value="journey">
              <div className="space-y-12">
                <PersonalizedRecommendations />
              </div>
            </TabsContent>
            
            {/* Activity Tab */}
            <TabsContent value="activity">
              <div className="space-y-12">
                {/* Watched Movies */}
                <div>
                  <h2 className="text-2xl font-bold mb-4">Movies I've Watched</h2>
                  {loadingWatched ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : watchedMovies.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {watchedMovies.map((movie: Movie) => (
                        <MovieCard key={movie.id} movie={movie} />
                      ))}
                    </div>
                  ) : (
                    <Card>
                      <CardHeader>
                        <CardTitle>No watched movies yet</CardTitle>
                        <CardDescription>
                          Mark movies as watched to track your viewing history and earn experience points
                        </CardDescription>
                      </CardHeader>
                      <CardFooter>
                        <Button onClick={() => window.location.href = "/"}>Discover Movies</Button>
                      </CardFooter>
                    </Card>
                  )}
                </div>
                
                {/* Watchlist */}
                <div>
                  <h2 className="text-2xl font-bold mb-4">My Watchlist</h2>
                  {loadingWatchlist ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : watchlistMovies.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {watchlistMovies.map((movie: Movie) => (
                        <MovieCard key={movie.id} movie={movie} />
                      ))}
                    </div>
                  ) : (
                    <Card>
                      <CardHeader>
                        <CardTitle>Your watchlist is empty</CardTitle>
                        <CardDescription>
                          Start adding movies to your watchlist to keep track of what you want to watch
                        </CardDescription>
                      </CardHeader>
                      <CardFooter>
                        <Button onClick={() => window.location.href = "/"}>Discover Movies</Button>
                      </CardFooter>
                    </Card>
                  )}
                </div>
              </div>
            </TabsContent>
            
            {/* Challenges Tab */}
            <TabsContent value="challenges">
              <UserChallenges />
            </TabsContent>
            
            {/* Preferences Tab */}
            <TabsContent value="preferences">
              <div className="space-y-8">
                {/* Genres */}
                <div>
                  <h2 className="text-xl font-bold mb-4">Favorite Genres</h2>
                  <p className="text-muted-foreground mb-4">
                    Select the genres you're most interested in to improve your recommendations
                  </p>
                  
                  <div className="flex flex-wrap gap-2 mb-6">
                    {genresData?.genres?.map((genre) => (
                      <Badge
                        key={genre.id}
                        variant={selectedGenres.includes(genre.id) ? "default" : "outline"}
                        className="cursor-pointer text-sm py-1.5 px-3"
                        onClick={() => toggleGenre(genre.id)}
                      >
                        {selectedGenres.includes(genre.id) && <Check className="h-3 w-3 mr-1" />}
                        {genre.name}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                {/* Languages */}
                <div>
                  <h2 className="text-xl font-bold mb-4">Preferred Languages</h2>
                  <p className="text-muted-foreground mb-4">
                    Select the languages you prefer for movie content
                  </p>
                  
                  <div className="flex flex-wrap gap-2 mb-6">
                    {popularLanguages.map((language) => (
                      <Badge
                        key={language.iso_639_1}
                        variant={selectedLanguages.includes(language.iso_639_1) ? "default" : "outline"}
                        className="cursor-pointer text-sm py-1.5 px-3"
                        onClick={() => toggleLanguage(language.iso_639_1)}
                      >
                        {selectedLanguages.includes(language.iso_639_1) && <Check className="h-3 w-3 mr-1" />}
                        {language.english_name}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <Button 
                  onClick={savePreferences}
                  disabled={updatePreferencesMutation.isPending}
                >
                  {updatePreferencesMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Save Preferences
                </Button>
                
                {/* Account Info */}
                <div className="mt-12">
                  <h2 className="text-xl font-bold mb-4">Account Information</h2>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-sm font-medium text-muted-foreground">Username</h3>
                          <p>{user?.username}</p>
                        </div>
                        {user?.email && (
                          <div>
                            <h3 className="text-sm font-medium text-muted-foreground">Email</h3>
                            <p>{user.email}</p>
                          </div>
                        )}
                        <div>
                          <h3 className="text-sm font-medium text-muted-foreground">Account Created</h3>
                          <p>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</p>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-muted-foreground">Experience Level</h3>
                          <p>{userLevel?.level || 'Beginner'} ({userLevel?.experiencePoints || 0} XP)</p>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-muted-foreground">Movies Watched</h3>
                          <p>{userLevel?.watchedCount || 0}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
