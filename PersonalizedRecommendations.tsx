import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Lightbulb, Percent } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import MovieGrid from './MovieGrid';
import { Skeleton } from './ui/skeleton';

interface Recommendation {
  id: number;
  userId: number;
  movieId: number;
  score: number;
  genreMatch: number | null;
  languageMatch: number | null;
  collaborativeScore: number | null;
  recommended: boolean;
  createdAt: string;
}

type RecommendationReason = 'genre' | 'language' | 'level' | 'similar' | 'trending';

// Helper function to determine primary reason for recommendation
function getPrimaryRecommendationReason(recommendation: Recommendation): RecommendationReason {
  const scores = [
    { type: 'genre', score: recommendation.genreMatch || 0 },
    { type: 'language', score: recommendation.languageMatch || 0 },
    { type: 'similar', score: recommendation.collaborativeScore || 0 },
  ];
  
  // Sort by highest score
  scores.sort((a, b) => b.score - a.score);
  
  // If highest score is significant, return that reason
  if (scores[0].score > 0.5) {
    return scores[0].type as RecommendationReason;
  }
  
  // Default fallback
  return 'trending';
}

export default function PersonalizedRecommendations() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('all');
  
  const { data: recommendations, isLoading } = useQuery<Recommendation[]>({
    queryKey: ['/api/recommendations'],
    enabled: !!user,
  });
  
  const { data: userLevel } = useQuery({
    queryKey: ['/api/user/level'],
    enabled: !!user,
  });
  
  const refreshRecommendationsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/recommendations/generate`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/recommendations'] });
    },
  });
  
  const fetchMovieDetails = async (movieIds: number[]) => {
    if (!movieIds.length) return [];
    
    // Fetch details for each movie
    const moviePromises = movieIds.map(async (id) => {
      try {
        const response = await fetch(`/api/tmdb/movie/${id}`);
        if (!response.ok) throw new Error(`Failed to fetch movie ${id}`);
        return await response.json();
      } catch (error) {
        console.error(`Error fetching movie ${id}:`, error);
        return null;
      }
    });
    
    const movies = await Promise.all(moviePromises);
    return movies.filter(Boolean); // Remove any failed fetches
  };
  
  const { data: recommendedMovies, isLoading: isLoadingMovies } = useQuery({
    queryKey: ['recommended-movies', recommendations],
    queryFn: () => recommendations ? fetchMovieDetails(recommendations.map(r => r.movieId)) : Promise.resolve([]),
    enabled: !!recommendations && recommendations.length > 0,
  });
  
  if (isLoading || !user) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Your Recommendations</h2>
          <Button variant="outline" size="sm" disabled>
            <RefreshCw size={14} className="mr-1" />
            Refresh
          </Button>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-[40px] w-full" />
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array(10).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-[200px] w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  // Group recommendations by reason
  const recommendationsByReason = (recommendations || []).reduce((acc, rec) => {
    const reason = getPrimaryRecommendationReason(rec);
    if (!acc[reason]) acc[reason] = [];
    acc[reason].push(rec);
    return acc;
  }, {} as Record<RecommendationReason, Recommendation[]>);
  
  // Get movie details grouped by reason
  const moviesByReason: Record<string, any[]> = {};
  
  if (recommendedMovies) {
    Object.entries(recommendationsByReason).forEach(([reason, recs]) => {
      const movieIds = recs.map(r => r.movieId);
      moviesByReason[reason] = recommendedMovies.filter(m => movieIds.includes(m.id));
    });
    
    // Add all movies
    moviesByReason['all'] = recommendedMovies;
  }
  
  // Get label based on user's level
  const getLevelBasedTitle = () => {
    const level = userLevel?.level || 'Beginner';
    switch (level) {
      case 'Beginner': return 'Foundational Films';
      case 'Explorer': return 'Critically Acclaimed';
      case 'Cinephile': return 'Global Cinema';
      case 'Connoisseur': return 'Director Showcases';
      default: return 'Recommended for You';
    }
  };
  
  const reasonLabels: Record<string, string> = {
    'all': 'All Recommendations',
    'genre': 'Matches Your Tastes',
    'language': 'Language Preferences',
    'similar': 'Similar to Films You Like',
    'level': getLevelBasedTitle(),
    'trending': 'Popular Right Now'
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">ODYSCAPE Recommendations</h2>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => refreshRecommendationsMutation.mutate()}
          disabled={refreshRecommendationsMutation.isPending}
        >
          <RefreshCw size={14} className={`mr-1 ${refreshRecommendationsMutation.isPending ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
      
      {!recommendations || recommendations.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Recommendations Yet</CardTitle>
            <CardDescription>
              We need more information about your preferences to provide personalized recommendations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Try rating some movies, adding films to your watchlist, or updating your genre and language preferences.
            </p>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={() => refreshRecommendationsMutation.mutate()}
              disabled={refreshRecommendationsMutation.isPending}
            >
              <Lightbulb size={16} className="mr-1" />
              Generate Recommendations
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <div className="space-y-4">
          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full overflow-x-auto flex max-w-full no-scrollbar">
              <TabsTrigger value="all">All</TabsTrigger>
              {Object.keys(recommendationsByReason).map(reason => (
                <TabsTrigger key={reason} value={reason}>
                  {reasonLabels[reason]}
                </TabsTrigger>
              ))}
            </TabsList>
            
            {Object.entries(moviesByReason).map(([reason, movies]) => (
              <TabsContent key={reason} value={reason} className="mt-4">
                {isLoadingMovies ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {Array(8).fill(0).map((_, i) => (
                      <Skeleton key={i} className="h-[200px] w-full rounded-lg" />
                    ))}
                  </div>
                ) : movies.length > 0 ? (
                  <MovieGrid 
                    movies={movies} 
                    title={reasonLabels[reason]} 
                  />
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No movies found in this category
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      )}
    </div>
  );
}