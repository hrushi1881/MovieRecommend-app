import { storage } from './storage';
import axios from 'axios';
import { User, UserPreferences } from '@shared/schema';

// TMDB API base URL and parameters
const tmdbBaseUrl = "https://api.themoviedb.org/3";
const apiKey = process.env.TMDB_API_KEY || "";

// Interface for storing movie data
interface Movie {
  id: number;
  title: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  release_date: string;
  original_language: string;
  genre_ids: number[];
}

// Interface for recommendation calculation
interface RecommendationScore {
  movieId: number;
  score: number;
  genreMatch: number;
  languageMatch: number;
  collaborativeScore: number;
}

/**
 * The main recommendation engine class for ODYSCAPE
 * Implements a hybrid recommendation system using:
 * 1. Content-based filtering (genre, language matching)
 * 2. Collaborative filtering (based on user interactions)
 * 3. Level-based progression (curated films based on user XP)
 */
export class RecommendationEngine {
  private static instance: RecommendationEngine;
  
  /**
   * Singleton pattern to ensure only one instance of the engine exists
   */
  public static getInstance(): RecommendationEngine {
    if (!RecommendationEngine.instance) {
      RecommendationEngine.instance = new RecommendationEngine();
    }
    return RecommendationEngine.instance;
  }
  
  /**
   * Generate recommendations for a specific user
   */
  public async generateRecommendationsForUser(userId: number): Promise<number[]> {
    // Get user data and preferences
    const user = await storage.getUser(userId);
    if (!user) throw new Error("User not found");
    
    // Clear existing recommendations
    await storage.clearUserRecommendations(userId);
    
    // Get user level and determine appropriate recommendations
    const userLevel = await storage.getUserLevel(userId);
    
    // Combine different recommendation sources based on user level
    let recommendations: RecommendationScore[] = [];
    
    // 1. First add country-based recommendations (highest priority for cultural relevance)
    const countryRecommendations = await this.getCountryBasedRecommendations(user);
    recommendations = recommendations.concat(countryRecommendations);
    
    // 2. Add genre-based recommendations
    const genreRecommendations = await this.getGenreBasedRecommendations(user);
    recommendations = recommendations.concat(genreRecommendations);
    
    // 3. Add language-based recommendations
    const languageRecommendations = await this.getLanguageBasedRecommendations(user);
    recommendations = recommendations.concat(languageRecommendations);
    
    // 4. Add level-appropriate films (e.g., classics, important films for that level)
    const levelRecommendations = await this.getLevelBasedRecommendations(userLevel.level);
    recommendations = recommendations.concat(levelRecommendations);
    
    // 5. Add collaborative filtering recommendations (based on similar users)
    const collaborativeRecommendations = await this.getCollaborativeRecommendations(userId);
    recommendations = recommendations.concat(collaborativeRecommendations);
    
    // 6. Add trending/popular movies as fallback
    if (recommendations.length < 20) {
      const trendingRecommendations = await this.getTrendingRecommendations();
      recommendations = recommendations.concat(trendingRecommendations);
    }
    
    // Merge duplicate recommendations and calculate final scores
    const mergedRecommendations = this.mergeAndScoreRecommendations(recommendations);
    
    // Sort by score and get top recommendations
    const sortedRecommendations = mergedRecommendations.sort((a, b) => b.score - a.score);
    
    // Save recommendations to database
    for (const rec of sortedRecommendations) {
      await storage.saveRecommendation(
        userId,
        rec.movieId,
        rec.score,
        rec.genreMatch,
        rec.languageMatch,
        rec.collaborativeScore
      );
    }
    
    // Return movie IDs of top recommendations
    return sortedRecommendations.map(rec => rec.movieId);
  }
  
  /**
   * Get recommendations based on user's genre preferences
   */
  private async getGenreBasedRecommendations(user: User): Promise<RecommendationScore[]> {
    // Default to empty array if preferences doesn't exist or has no genres
    const genres = user.preferences?.genres || [];
    if (genres.length === 0) return [];
    
    try {
      // Join genres with comma for TMDB API
      const genreParam = genres.join(',');
      
      // Get movies matching genres
      const response = await axios.get(
        `${tmdbBaseUrl}/discover/movie`,
        {
          params: {
            api_key: apiKey,
            language: "en-US",
            with_genres: genreParam,
            sort_by: "popularity.desc",
            page: 1
          }
        }
      );
      
      // Process results and calculate genre match score
      return response.data.results.map((movie: Movie) => {
        // Calculate genre match score (how many of the user's preferred genres match this movie)
        const matchingGenres = movie.genre_ids.filter(id => genres.includes(id));
        const genreMatchScore = matchingGenres.length / genres.length;
        
        return {
          movieId: movie.id,
          score: 0, // Will be calculated in the merging step
          genreMatch: genreMatchScore * 1.2, // Weight genre matches by 1.2
          languageMatch: 0,
          collaborativeScore: 0
        };
      });
    } catch (error) {
      console.error("Error getting genre recommendations:", error);
      return [];
    }
  }
  
  /**
   * Get recommendations based on user's language preferences
   */
  private async getLanguageBasedRecommendations(user: User): Promise<RecommendationScore[]> {
    // Default to empty array if preferences doesn't exist or has no languages
    const languages = user.preferences?.languages || [];
    if (languages.length === 0) return [];
    
    // We'll make recommendations for each language and combine them
    const allRecommendations: RecommendationScore[] = [];
    
    for (const language of languages) {
      try {
        const response = await axios.get(
          `${tmdbBaseUrl}/discover/movie`,
          {
            params: {
              api_key: apiKey,
              with_original_language: language,
              sort_by: "vote_average.desc",
              "vote_count.gte": 100, // Ensure sufficient votes for quality
              page: 1
            }
          }
        );
        
        // Process results
        const languageRecs = response.data.results.map((movie: Movie) => ({
          movieId: movie.id,
          score: 0, // Will be calculated in the merging step
          genreMatch: 0,
          languageMatch: 1.1, // Weight language matches by 1.1
          collaborativeScore: 0
        }));
        
        allRecommendations.push(...languageRecs);
      } catch (error) {
        console.error(`Error getting language recommendations for ${language}:`, error);
      }
    }
    
    return allRecommendations;
  }
  
  /**
   * Get recommendations based on user's country preference
   * This prioritizes films produced in or featuring the user's selected country
   */
  private async getCountryBasedRecommendations(user: User): Promise<RecommendationScore[]> {
    // Default to empty array if preferences doesn't exist or has no country
    const country = user.preferences?.country;
    if (!country) return [];
    
    try {
      // Use region parameter to get movies popular in that country
      const response = await axios.get(
        `${tmdbBaseUrl}/discover/movie`,
        {
          params: {
            api_key: apiKey,
            region: country, // ISO 3166-1 country code
            sort_by: "popularity.desc",
            "vote_count.gte": 50, // Ensure sufficient votes for quality
            page: 1,
            with_original_language: user.preferences?.languages?.[0] || "en" // Use first preferred language if available
          }
        }
      );
      
      // Process results
      return response.data.results.map((movie: Movie) => ({
        movieId: movie.id,
        score: 0, // Will be calculated in the merging step
        genreMatch: 0,
        languageMatch: 0,
        collaborativeScore: 1.3 // Weight country recommendations highly (1.3)
      }));
    } catch (error) {
      console.error(`Error getting country recommendations for ${country}:`, error);
      return [];
    }
  }
  
  /**
   * Get level-appropriate recommendations for the user's experience level
   */
  private async getLevelBasedRecommendations(level: string): Promise<RecommendationScore[]> {
    // Different recommendation strategies based on user level
    try {
      let recommendations: Movie[] = [];
      
      switch (level) {
        case 'Beginner':
          // For beginners - popular, accessible, highly-rated films
          const beginnerResponse = await axios.get(
            `${tmdbBaseUrl}/discover/movie`,
            {
              params: {
                api_key: apiKey,
                sort_by: "popularity.desc",
                "vote_average.gte": 7.5,
                "vote_count.gte": 1000,
                page: 1
              }
            }
          );
          recommendations = beginnerResponse.data.results;
          break;
          
        case 'Explorer':
          // For explorers - critically acclaimed and genre-defining films
          const explorerResponse = await axios.get(
            `${tmdbBaseUrl}/discover/movie`,
            {
              params: {
                api_key: apiKey,
                sort_by: "vote_average.desc",
                "vote_count.gte": 500,
                page: 1,
                with_keywords: "classic,acclaimed"  // Keywords to find acclaimed films
              }
            }
          );
          recommendations = explorerResponse.data.results;
          break;
          
        case 'Cinephile':
          // For cinephiles - global cinema, cult classics, art films
          const cinephileResponse = await axios.get(
            `${tmdbBaseUrl}/discover/movie`,
            {
              params: {
                api_key: apiKey,
                sort_by: "vote_average.desc",
                "vote_count.gte": 200,
                page: 1,
                with_keywords: "arthouse,cult,foreign"  // Keywords for art & cult films
              }
            }
          );
          recommendations = cinephileResponse.data.results;
          break;
          
        case 'Connoisseur':
          // For connoisseurs - rare, experimental, director-focused films
          const connoisseurResponse = await axios.get(
            `${tmdbBaseUrl}/discover/movie`,
            {
              params: {
                api_key: apiKey,
                sort_by: "vote_average.desc",
                page: 1,
                with_keywords: "experimental,masterpiece,auteur,avant-garde"
              }
            }
          );
          recommendations = connoisseurResponse.data.results;
          break;
          
        default:
          // Fallback to general highly-rated films
          const defaultResponse = await axios.get(
            `${tmdbBaseUrl}/discover/movie`,
            {
              params: {
                api_key: apiKey,
                sort_by: "vote_average.desc",
                "vote_count.gte": 1000,
                page: 1
              }
            }
          );
          recommendations = defaultResponse.data.results;
      }
      
      // Map to recommendation scores
      return recommendations.map(movie => ({
        movieId: movie.id,
        score: 0, // Will be calculated in the merging step
        genreMatch: 0,
        languageMatch: 0,
        collaborativeScore: 1.0, // Base collaborative score for level recommendations
      }));
      
    } catch (error) {
      console.error(`Error getting level recommendations for ${level}:`, error);
      return [];
    }
  }
  
  /**
   * Get collaborative filtering recommendations based on similar users
   * This is a simplified implementation - in a real system this would use
   * more sophisticated collaborative filtering algorithms
   */
  private async getCollaborativeRecommendations(userId: number): Promise<RecommendationScore[]> {
    try {
      // Get movies the user has watched, rated highly, or liked
      const userWatchedMovies = await storage.getWatchedMovies(userId);
      const userRatings = await storage.getUserRatings(userId);
      const userLikes = await storage.getUserLikes(userId);
      
      // Filter ratings to get only highly rated movies (7+ on a 10 scale)
      const highlyRatedMovies = userRatings
        .filter(rating => rating.rating >= 7)
        .map(rating => rating.movieId);
      
      // Combine user's movie interactions
      const userMovieInteractions = new Set([
        ...userWatchedMovies,
        ...highlyRatedMovies,
        ...userLikes
      ]);
      
      // If the user hasn't interacted with any movies yet, return empty array
      if (userMovieInteractions.size === 0) {
        return [];
      }
      
      // Get movie recommendations based on movies the user liked
      // This simulates collaborative filtering by using TMDB's similar movies endpoint
      const recommendations: RecommendationScore[] = [];
      
      // Use a maximum of 3 movies to avoid too many API calls
      const sampleMovies = Array.from(userMovieInteractions).slice(0, 3);
      
      for (const movieId of sampleMovies) {
        try {
          const response = await axios.get(
            `${tmdbBaseUrl}/movie/${movieId}/similar`,
            {
              params: {
                api_key: apiKey,
                language: "en-US",
                page: 1
              }
            }
          );
          
          // Process results
          const similarMovies = response.data.results
            // Filter out movies the user has already interacted with
            .filter((movie: Movie) => !userMovieInteractions.has(movie.id))
            .map((movie: Movie) => ({
              movieId: movie.id,
              score: 0, // Will be calculated in the merging step
              genreMatch: 0,
              languageMatch: 0,
              collaborativeScore: 1.5 // Weight collaborative recommendations by 1.5
            }));
          
          recommendations.push(...similarMovies);
        } catch (error) {
          console.error(`Error getting similar movies for ${movieId}:`, error);
        }
      }
      
      return recommendations;
    } catch (error) {
      console.error("Error in collaborative recommendations:", error);
      return [];
    }
  }
  
  /**
   * Get trending movies as a fallback recommendation source
   */
  private async getTrendingRecommendations(): Promise<RecommendationScore[]> {
    try {
      const response = await axios.get(
        `${tmdbBaseUrl}/trending/movie/week`,
        {
          params: {
            api_key: apiKey,
            language: "en-US"
          }
        }
      );
      
      return response.data.results.map((movie: Movie) => ({
        movieId: movie.id,
        score: 0, // Will be calculated in the merging step
        genreMatch: 0,
        languageMatch: 0,
        collaborativeScore: 0.8 // Lower weight for trending recommendations
      }));
    } catch (error) {
      console.error("Error getting trending recommendations:", error);
      return [];
    }
  }
  
  /**
   * Merge duplicate movie recommendations and calculate final scores
   */
  private mergeAndScoreRecommendations(recommendations: RecommendationScore[]): RecommendationScore[] {
    const movieMap = new Map<number, RecommendationScore>();
    
    // Merge recommendations for the same movie
    for (const rec of recommendations) {
      if (movieMap.has(rec.movieId)) {
        const existingRec = movieMap.get(rec.movieId)!;
        
        // Take the max of each score component
        existingRec.genreMatch = Math.max(existingRec.genreMatch, rec.genreMatch);
        existingRec.languageMatch = Math.max(existingRec.languageMatch, rec.languageMatch);
        existingRec.collaborativeScore = Math.max(existingRec.collaborativeScore, rec.collaborativeScore);
      } else {
        movieMap.set(rec.movieId, { ...rec });
      }
    }
    
    // Calculate final scores
    const mergedRecommendations = Array.from(movieMap.values());
    for (const rec of mergedRecommendations) {
      // Apply the scoring formula:
      // Score = (Genre Match × 1.2) + (Language Match × 1.1) + (Collaborative Score × 1.5)
      rec.score = rec.genreMatch + rec.languageMatch + rec.collaborativeScore;
    }
    
    return mergedRecommendations;
  }
}

/**
 * Determine movie recommendations appropriate for a user's onboarding
 */
export async function getOnboardingRecommendations(preferences: UserPreferences): Promise<number[]> {
  try {
    const { genres, languages, country } = preferences;
    
    // If no preferences set, return popular movies
    if ((!genres || genres.length === 0) && (!languages || languages.length === 0) && !country) {
      const response = await axios.get(
        `${tmdbBaseUrl}/movie/popular`,
        {
          params: {
            api_key: apiKey,
            language: "en-US",
            page: 1
          }
        }
      );
      
      return response.data.results.slice(0, 20).map((movie: Movie) => movie.id);
    }
    
    // Combine country, genre, and language preferences for the most personalized recommendations
    const allResults: Movie[] = [];
    
    // 1. First try with all preferences combined
    if (genres?.length && languages?.length && country) {
      try {
        const genreParam = genres.join(',');
        const languageParam = languages[0];
        
        const combinedResponse = await axios.get(
          `${tmdbBaseUrl}/discover/movie`,
          {
            params: {
              api_key: apiKey,
              language: "en-US",
              with_genres: genreParam,
              with_original_language: languageParam,
              region: country,
              sort_by: "popularity.desc",
              page: 1
            }
          }
        );
        
        allResults.push(...combinedResponse.data.results);
      } catch (error) {
        console.error("Error getting combined recommendations:", error);
      }
    }
    
    // 2. If we need more results, try country-specific recommendations
    if (country && allResults.length < 15) {
      try {
        const countryResponse = await axios.get(
          `${tmdbBaseUrl}/discover/movie`,
          {
            params: {
              api_key: apiKey,
              region: country,
              sort_by: "popularity.desc",
              page: 1
            }
          }
        );
        
        // Add any new movies not already in results
        const existingIds = new Set(allResults.map(movie => movie.id));
        const newCountryMovies = countryResponse.data.results.filter(
          (movie: Movie) => !existingIds.has(movie.id)
        );
        
        allResults.push(...newCountryMovies);
      } catch (error) {
        console.error(`Error getting country recommendations for ${country}:`, error);
      }
    }
    
    // 3. If we still need more, add genre and language recommendations
    if ((genres?.length || languages?.length) && allResults.length < 15) {
      try {
        const genreParam = genres?.join(',');
        const languageParam = languages?.[0]; // Just use the first language for initial recommendations
        
        const genreResponse = await axios.get(
          `${tmdbBaseUrl}/discover/movie`,
          {
            params: {
              api_key: apiKey,
              language: "en-US",
              with_genres: genreParam,
              with_original_language: languageParam,
              sort_by: "popularity.desc",
              page: 1
            }
          }
        );
        
        // Add any new movies not already in results
        const existingIds = new Set(allResults.map(movie => movie.id));
        const newGenreMovies = genreResponse.data.results.filter(
          (movie: Movie) => !existingIds.has(movie.id)
        );
        
        allResults.push(...newGenreMovies);
      } catch (error) {
        console.error("Error getting genre recommendations:", error);
      }
    }
    
    // If we still have no results, fallback to popular movies
    if (allResults.length === 0) {
      const response = await axios.get(
        `${tmdbBaseUrl}/movie/popular`,
        {
          params: {
            api_key: apiKey,
            language: "en-US",
            page: 1
          }
        }
      );
      
      allResults.push(...response.data.results);
    }
    
    // Return up to 20 movie IDs
    return allResults.slice(0, 20).map((movie: Movie) => movie.id);
  } catch (error) {
    console.error("Error getting onboarding recommendations:", error);
    return [];
  }
}

// Export the singleton instance
export const recommendationEngine = RecommendationEngine.getInstance();