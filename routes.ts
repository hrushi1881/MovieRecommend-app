import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import axios from "axios";
import { z } from "zod";
import { updateUserPreferencesSchema, challengeSchema } from "@shared/schema";
import { recommendationEngine, getOnboardingRecommendations } from "./recommendation-engine";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);
  
  const apiKey = process.env.TMDB_API_KEY || "";
  const tmdbBaseUrl = "https://api.themoviedb.org/3";
  
  // Middleware to check if user is authenticated
  const ensureAuthenticated = (req: any, res: any, next: any) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Unauthorized" });
  };
  
  // ODYSCAPE website configuration
  app.get("/api/odyscape/config", async (req, res) => {
    res.json({
      name: "ODYSCAPE",
      tagline: "Your Personal Cinematic Journey",
      description: "Discover cinema as a powerful form of artistic expression — one that reflects culture, emotions, philosophy, and history.",
      levels: [
        {
          name: "Beginner",
          description: "Starting your cinematic journey", 
          minXP: 0,
          maxXP: 50
        },
        {
          name: "Explorer",
          description: "Expanding your cinematic horizons", 
          minXP: 51,
          maxXP: 150
        },
        {
          name: "Cinephile",
          description: "Deepening your appreciation of film", 
          minXP: 151,
          maxXP: 300
        },
        {
          name: "Connoisseur",
          description: "Mastering the art of cinema", 
          minXP: 301,
          maxXP: null
        }
      ]
    });
  });
  
  // User preferences
  app.put("/api/preferences", ensureAuthenticated, async (req, res) => {
    try {
      const result = updateUserPreferencesSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid preferences data" });
      }
      
      const updatedUser = await storage.updateUserPreferences(
        req.user!.id,
        result.data
      );
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating preferences:", error);
      res.status(500).json({ message: "Failed to update preferences" });
    }
  });
  
  app.get("/api/preferences", ensureAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(user.preferences);
    } catch (error) {
      console.error("Error getting preferences:", error);
      res.status(500).json({ message: "Failed to get preferences" });
    }
  });
  
  // Movie watchlist routes
  app.post("/api/watchlist/:movieId", ensureAuthenticated, async (req, res) => {
    try {
      const movieId = parseInt(req.params.movieId);
      if (isNaN(movieId)) {
        return res.status(400).json({ message: "Invalid movie ID" });
      }
      
      const watchlistItem = await storage.addToWatchlist(req.user!.id, movieId);
      res.status(201).json(watchlistItem);
    } catch (error) {
      console.error("Error adding to watchlist:", error);
      res.status(500).json({ message: "Failed to add to watchlist" });
    }
  });
  
  app.delete("/api/watchlist/:movieId", ensureAuthenticated, async (req, res) => {
    try {
      const movieId = parseInt(req.params.movieId);
      if (isNaN(movieId)) {
        return res.status(400).json({ message: "Invalid movie ID" });
      }
      
      const success = await storage.removeFromWatchlist(req.user!.id, movieId);
      if (!success) {
        return res.status(404).json({ message: "Movie not in watchlist" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error removing from watchlist:", error);
      res.status(500).json({ message: "Failed to remove from watchlist" });
    }
  });
  
  app.get("/api/watchlist", ensureAuthenticated, async (req, res) => {
    try {
      const movieIds = await storage.getUserWatchlist(req.user!.id);
      res.json(movieIds);
    } catch (error) {
      console.error("Error getting watchlist:", error);
      res.status(500).json({ message: "Failed to get watchlist" });
    }
  });
  
  app.get("/api/watchlist/:movieId", ensureAuthenticated, async (req, res) => {
    try {
      const movieId = parseInt(req.params.movieId);
      if (isNaN(movieId)) {
        return res.status(400).json({ message: "Invalid movie ID" });
      }
      
      const isInWatchlist = await storage.isInWatchlist(req.user!.id, movieId);
      res.json({ isInWatchlist });
    } catch (error) {
      console.error("Error checking watchlist:", error);
      res.status(500).json({ message: "Failed to check watchlist" });
    }
  });
  
  // Movie rating routes
  app.post("/api/ratings/:movieId", ensureAuthenticated, async (req, res) => {
    try {
      const movieId = parseInt(req.params.movieId);
      if (isNaN(movieId)) {
        return res.status(400).json({ message: "Invalid movie ID" });
      }
      
      const schema = z.object({ rating: z.number().min(1).max(10) });
      const result = schema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid rating value" });
      }
      
      const rating = await storage.rateMovie(req.user!.id, movieId, result.data.rating);
      res.status(201).json(rating);
    } catch (error) {
      console.error("Error rating movie:", error);
      res.status(500).json({ message: "Failed to rate movie" });
    }
  });
  
  app.get("/api/ratings/:movieId", ensureAuthenticated, async (req, res) => {
    try {
      const movieId = parseInt(req.params.movieId);
      if (isNaN(movieId)) {
        return res.status(400).json({ message: "Invalid movie ID" });
      }
      
      const rating = await storage.getUserRating(req.user!.id, movieId);
      if (!rating) {
        return res.json({ rating: null });
      }
      
      res.json({ rating: rating.rating });
    } catch (error) {
      console.error("Error getting rating:", error);
      res.status(500).json({ message: "Failed to get rating" });
    }
  });
  
  app.get("/api/ratings", ensureAuthenticated, async (req, res) => {
    try {
      const ratings = await storage.getUserRatings(req.user!.id);
      res.json(ratings);
    } catch (error) {
      console.error("Error getting ratings:", error);
      res.status(500).json({ message: "Failed to get ratings" });
    }
  });
  
  // Movie like routes
  app.post("/api/likes/:movieId", ensureAuthenticated, async (req, res) => {
    try {
      const movieId = parseInt(req.params.movieId);
      if (isNaN(movieId)) {
        return res.status(400).json({ message: "Invalid movie ID" });
      }
      
      const like = await storage.likeMovie(req.user!.id, movieId);
      res.status(201).json(like);
    } catch (error) {
      console.error("Error liking movie:", error);
      res.status(500).json({ message: "Failed to like movie" });
    }
  });
  
  app.delete("/api/likes/:movieId", ensureAuthenticated, async (req, res) => {
    try {
      const movieId = parseInt(req.params.movieId);
      if (isNaN(movieId)) {
        return res.status(400).json({ message: "Invalid movie ID" });
      }
      
      const success = await storage.unlikeMovie(req.user!.id, movieId);
      if (!success) {
        return res.status(404).json({ message: "Movie not liked" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error unliking movie:", error);
      res.status(500).json({ message: "Failed to unlike movie" });
    }
  });
  
  app.get("/api/likes", ensureAuthenticated, async (req, res) => {
    try {
      const likes = await storage.getUserLikes(req.user!.id);
      res.json(likes);
    } catch (error) {
      console.error("Error getting likes:", error);
      res.status(500).json({ message: "Failed to get likes" });
    }
  });
  
  app.get("/api/likes/:movieId", ensureAuthenticated, async (req, res) => {
    try {
      const movieId = parseInt(req.params.movieId);
      if (isNaN(movieId)) {
        return res.status(400).json({ message: "Invalid movie ID" });
      }
      
      const isLiked = await storage.isLiked(req.user!.id, movieId);
      res.json({ isLiked });
    } catch (error) {
      console.error("Error checking like:", error);
      res.status(500).json({ message: "Failed to check like" });
    }
  });
  
  // Watched movies routes
  app.post("/api/watched/:movieId", ensureAuthenticated, async (req, res) => {
    try {
      const movieId = parseInt(req.params.movieId);
      if (isNaN(movieId)) {
        return res.status(400).json({ message: "Invalid movie ID" });
      }
      
      const watchedMovie = await storage.markAsWatched(req.user!.id, movieId);
      res.status(201).json(watchedMovie);
    } catch (error) {
      console.error("Error marking as watched:", error);
      res.status(500).json({ message: "Failed to mark as watched" });
    }
  });
  
  app.delete("/api/watched/:movieId", ensureAuthenticated, async (req, res) => {
    try {
      const movieId = parseInt(req.params.movieId);
      if (isNaN(movieId)) {
        return res.status(400).json({ message: "Invalid movie ID" });
      }
      
      const success = await storage.unmarkAsWatched(req.user!.id, movieId);
      if (!success) {
        return res.status(404).json({ message: "Movie not marked as watched" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error unmarking as watched:", error);
      res.status(500).json({ message: "Failed to unmark as watched" });
    }
  });
  
  app.get("/api/watched", ensureAuthenticated, async (req, res) => {
    try {
      const movieIds = await storage.getWatchedMovies(req.user!.id);
      res.json(movieIds);
    } catch (error) {
      console.error("Error getting watched movies:", error);
      res.status(500).json({ message: "Failed to get watched movies" });
    }
  });
  
  app.get("/api/watched/:movieId", ensureAuthenticated, async (req, res) => {
    try {
      const movieId = parseInt(req.params.movieId);
      if (isNaN(movieId)) {
        return res.status(400).json({ message: "Invalid movie ID" });
      }
      
      const isWatched = await storage.isWatched(req.user!.id, movieId);
      res.json({ isWatched });
    } catch (error) {
      console.error("Error checking if watched:", error);
      res.status(500).json({ message: "Failed to check if watched" });
    }
  });
  
  // User progression routes
  app.get("/api/user/level", ensureAuthenticated, async (req, res) => {
    try {
      const userLevel = await storage.getUserLevel(req.user!.id);
      res.json(userLevel);
    } catch (error) {
      console.error("Error getting user level:", error);
      res.status(500).json({ message: "Failed to get user level" });
    }
  });
  
  // Recommendation routes
  app.post("/api/recommendations/generate", ensureAuthenticated, async (req, res) => {
    try {
      // Generate fresh recommendations
      await recommendationEngine.generateRecommendationsForUser(req.user!.id);
      res.status(200).json({ message: "Recommendations generated successfully" });
    } catch (error) {
      console.error("Error generating recommendations:", error);
      res.status(500).json({ message: "Failed to generate recommendations" });
    }
  });
  
  app.get("/api/recommendations", ensureAuthenticated, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      
      // Get user's recommendations
      const recommendations = await storage.getUserRecommendations(req.user!.id, limit);
      
      // If no recommendations exist, generate some
      if (recommendations.length === 0) {
        await recommendationEngine.generateRecommendationsForUser(req.user!.id);
        const freshRecommendations = await storage.getUserRecommendations(req.user!.id, limit);
        return res.json(freshRecommendations);
      }
      
      res.json(recommendations);
    } catch (error) {
      console.error("Error getting recommendations:", error);
      res.status(500).json({ message: "Failed to get recommendations" });
    }
  });
  
  app.post("/api/recommendations/onboarding", ensureAuthenticated, async (req, res) => {
    try {
      const result = updateUserPreferencesSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid preferences data" });
      }
      
      // Update user preferences
      await storage.updateUserPreferences(req.user!.id, result.data);
      
      // Get initial recommendations based on preferences
      const movieIds = await getOnboardingRecommendations(result.data);
      
      res.json({ movieIds });
    } catch (error) {
      console.error("Error getting onboarding recommendations:", error);
      res.status(500).json({ message: "Failed to get onboarding recommendations" });
    }
  });
  
  // Challenge routes
  app.get("/api/challenges", ensureAuthenticated, async (req, res) => {
    try {
      // Optionally filter by level
      const level = req.query.level ? String(req.query.level) : undefined;
      
      const challenges = await storage.getChallenges(level);
      res.json(challenges);
    } catch (error) {
      console.error("Error getting challenges:", error);
      res.status(500).json({ message: "Failed to get challenges" });
    }
  });
  
  app.get("/api/user/challenges", ensureAuthenticated, async (req, res) => {
    try {
      const userChallenges = await storage.getUserChallenges(req.user!.id);
      res.json(userChallenges);
    } catch (error) {
      console.error("Error getting user challenges:", error);
      res.status(500).json({ message: "Failed to get user challenges" });
    }
  });
  
  app.post("/api/challenges/:challengeId/start", ensureAuthenticated, async (req, res) => {
    try {
      const challengeId = parseInt(req.params.challengeId);
      if (isNaN(challengeId)) {
        return res.status(400).json({ message: "Invalid challenge ID" });
      }
      
      const userChallenge = await storage.startChallenge(req.user!.id, challengeId);
      res.status(201).json(userChallenge);
    } catch (error) {
      console.error("Error starting challenge:", error);
      res.status(500).json({ message: "Failed to start challenge" });
    }
  });
  
  app.put("/api/challenges/:challengeId/progress", ensureAuthenticated, async (req, res) => {
    try {
      const challengeId = parseInt(req.params.challengeId);
      if (isNaN(challengeId)) {
        return res.status(400).json({ message: "Invalid challenge ID" });
      }
      
      const schema = z.object({ progress: z.number().min(0) });
      const result = schema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid progress value" });
      }
      
      const userChallenge = await storage.updateChallengeProgress(
        req.user!.id, 
        challengeId, 
        result.data.progress
      );
      
      res.json(userChallenge);
    } catch (error) {
      console.error("Error updating challenge progress:", error);
      res.status(500).json({ message: "Failed to update challenge progress" });
    }
  });
  
  app.post("/api/challenges/:challengeId/complete", ensureAuthenticated, async (req, res) => {
    try {
      const challengeId = parseInt(req.params.challengeId);
      if (isNaN(challengeId)) {
        return res.status(400).json({ message: "Invalid challenge ID" });
      }
      
      const userChallenge = await storage.completeChallenge(req.user!.id, challengeId);
      res.json(userChallenge);
    } catch (error) {
      console.error("Error completing challenge:", error);
      res.status(500).json({ message: "Failed to complete challenge" });
    }
  });
  
  // TMDB API proxy routes
  app.get("/api/tmdb/trending", async (req, res) => {
    try {
      const response = await axios.get(
        `${tmdbBaseUrl}/trending/movie/day`,
        {
          params: {
            api_key: apiKey,
            language: "en-US",
          }
        }
      );
      res.json(response.data);
    } catch (error) {
      console.error("Error fetching trending movies:", error);
      res.status(500).json({ message: "Failed to fetch trending movies" });
    }
  });
  
  app.get("/api/tmdb/movie/:id", async (req, res) => {
    try {
      const movieId = req.params.id;
      const response = await axios.get(
        `${tmdbBaseUrl}/movie/${movieId}`,
        {
          params: {
            api_key: apiKey,
            language: "en-US",
            append_to_response: "credits,videos,reviews,similar"
          }
        }
      );
      res.json(response.data);
    } catch (error) {
      console.error(`Error fetching movie ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to fetch movie details" });
    }
  });
  
  app.get("/api/tmdb/popular", async (req, res) => {
    try {
      const response = await axios.get(
        `${tmdbBaseUrl}/movie/popular`,
        {
          params: {
            api_key: apiKey,
            language: "en-US",
            page: req.query.page || 1
          }
        }
      );
      res.json(response.data);
    } catch (error) {
      console.error("Error fetching popular movies:", error);
      res.status(500).json({ message: "Failed to fetch popular movies" });
    }
  });
  
  app.get("/api/tmdb/now_playing", async (req, res) => {
    try {
      const response = await axios.get(
        `${tmdbBaseUrl}/movie/now_playing`,
        {
          params: {
            api_key: apiKey,
            language: "en-US",
            page: req.query.page || 1
          }
        }
      );
      res.json(response.data);
    } catch (error) {
      console.error("Error fetching now playing movies:", error);
      res.status(500).json({ message: "Failed to fetch now playing movies" });
    }
  });
  
  app.get("/api/tmdb/upcoming", async (req, res) => {
    try {
      const response = await axios.get(
        `${tmdbBaseUrl}/movie/upcoming`,
        {
          params: {
            api_key: apiKey,
            language: "en-US",
            page: req.query.page || 1
          }
        }
      );
      res.json(response.data);
    } catch (error) {
      console.error("Error fetching upcoming movies:", error);
      res.status(500).json({ message: "Failed to fetch upcoming movies" });
    }
  });
  
  app.get("/api/tmdb/genres", async (req, res) => {
    try {
      const response = await axios.get(
        `${tmdbBaseUrl}/genre/movie/list`,
        {
          params: {
            api_key: apiKey,
            language: "en-US"
          }
        }
      );
      res.json(response.data);
    } catch (error) {
      console.error("Error fetching genres:", error);
      res.status(500).json({ message: "Failed to fetch genres" });
    }
  });
  
  app.get("/api/tmdb/discover", async (req, res) => {
    try {
      const response = await axios.get(
        `${tmdbBaseUrl}/discover/movie`,
        {
          params: {
            api_key: apiKey,
            language: "en-US",
            with_genres: req.query.with_genres,
            with_original_language: req.query.with_original_language,
            sort_by: req.query.sort_by || "popularity.desc",
            page: req.query.page || 1
          }
        }
      );
      res.json(response.data);
    } catch (error) {
      console.error("Error discovering movies:", error);
      res.status(500).json({ message: "Failed to discover movies" });
    }
  });
  
  app.get("/api/tmdb/search", async (req, res) => {
    try {
      const query = req.query.query;
      if (!query) {
        return res.status(400).json({ message: "Query parameter is required" });
      }
      
      const response = await axios.get(
        `${tmdbBaseUrl}/search/movie`,
        {
          params: {
            api_key: apiKey,
            language: "en-US",
            query,
            page: req.query.page || 1,
            include_adult: false
          }
        }
      );
      res.json(response.data);
    } catch (error) {
      console.error("Error searching movies:", error);
      res.status(500).json({ message: "Failed to search movies" });
    }
  });
  
  app.get("/api/tmdb/languages", async (req, res) => {
    try {
      const response = await axios.get(
        `${tmdbBaseUrl}/configuration/languages`,
        {
          params: {
            api_key: apiKey
          }
        }
      );
      res.json(response.data);
    } catch (error) {
      console.error("Error fetching languages:", error);
      res.status(500).json({ message: "Failed to fetch languages" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
