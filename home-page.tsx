import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HeroSection from "@/components/HeroSection";
import MovieGrid from "@/components/MovieGrid";
import OnboardingModal from "@/components/OnboardingModal";
import { useAuth } from "@/hooks/use-auth";
import { Movie } from "@shared/api";
import { Loader2 } from "lucide-react";

export default function HomePage() {
  const { user } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  // Check if user has preferences set
  useEffect(() => {
    if (user && (!user.preferences || 
        !user.preferences.genres || 
        user.preferences.genres.length === 0)) {
      setShowOnboarding(true);
    }
  }, [user]);
  
  // Fetch trending movies for hero section
  const { data: trendingData, isLoading: trendingLoading } = useQuery({
    queryKey: ["/api/tmdb/trending"],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Fetch recommended movies based on user preferences or popular if no preferences
  const { data: recommendedData, isLoading: recommendedLoading } = useQuery({
    queryKey: ["/api/tmdb/popular"],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Fetch now playing movies
  const { data: nowPlayingData, isLoading: nowPlayingLoading } = useQuery({
    queryKey: ["/api/tmdb/now_playing"],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Fetch sci-fi movies for genre section
  const { data: sciFiData, isLoading: sciFiLoading } = useQuery({
    queryKey: ["/api/tmdb/discover", { with_genres: "878" }],
    queryFn: async () => {
      const res = await fetch(`/api/tmdb/discover?with_genres=878`);
      if (!res.ok) throw new Error("Failed to fetch sci-fi movies");
      return res.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Get a trending movie for hero
  const heroMovie = trendingData?.results?.[0] as Movie | undefined;
  
  // Get recommended movies
  const recommendedMovies = recommendedData?.results as Movie[] | undefined;
  
  // Get now playing movies
  const nowPlayingMovies = nowPlayingData?.results as Movie[] | undefined;
  
  // Get sci-fi movies
  const sciFiMovies = sciFiData?.results as Movie[] | undefined;
  
  if (trendingLoading || recommendedLoading || nowPlayingLoading || sciFiLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />
      
      <main className="flex-grow">
        {heroMovie && (
          <HeroSection movie={heroMovie} />
        )}
        
        {recommendedMovies && recommendedMovies.length > 0 && (
          <section className="py-8 px-4">
            <div className="container mx-auto">
              <h2 className="text-2xl font-bold mb-4">Recommended For You</h2>
              <MovieGrid movies={recommendedMovies} />
            </div>
          </section>
        )}
        
        {nowPlayingMovies && nowPlayingMovies.length > 0 && (
          <section className="py-4 px-4">
            <div className="container mx-auto">
              <h2 className="text-2xl font-bold mb-4">Now Playing</h2>
              <MovieGrid movies={nowPlayingMovies} />
            </div>
          </section>
        )}
        
        {sciFiMovies && sciFiMovies.length > 0 && (
          <section className="py-4 px-4">
            <div className="container mx-auto">
              <h2 className="text-2xl font-bold mb-4">Top Sci-Fi Picks</h2>
              <MovieGrid movies={sciFiMovies} />
            </div>
          </section>
        )}
      </main>
      
      <Footer />
      
      {showOnboarding && (
        <OnboardingModal
          isOpen={showOnboarding}
          onClose={() => setShowOnboarding(false)}
        />
      )}
    </div>
  );
}
