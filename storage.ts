import {
  users,
  watchlist,
  movieRatings,
  movieLikes,
  watchedMovies,
  userMovieRecommendations,
  challenges,
  userChallenges,
  type User,
  type InsertUser,
  type Watchlist,
  type MovieRating,
  type MovieLike,
  type WatchedMovie,
  type UserMovieRecommendation,
  type Challenge,
  type UserChallenge,
  type UserPreferences
} from "@shared/schema";
import session from "express-session";
import { db, pool } from "./db";
import { eq, and, desc, sql, asc, isNull, not } from "drizzle-orm";
import connectPg from "connect-pg-simple";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPreferences(userId: number, preferences: UserPreferences): Promise<User | undefined>;
  updateUserExperience(userId: number, xpPoints: number): Promise<User | undefined>;
  getUserLevel(userId: number): Promise<{ level: string; experiencePoints: number; watchedCount: number }>;
  
  // Watchlist methods
  addToWatchlist(userId: number, movieId: number): Promise<Watchlist>;
  removeFromWatchlist(userId: number, movieId: number): Promise<boolean>;
  getUserWatchlist(userId: number): Promise<number[]>;
  isInWatchlist(userId: number, movieId: number): Promise<boolean>;
  
  // Rating methods
  rateMovie(userId: number, movieId: number, rating: number): Promise<MovieRating>;
  getUserRating(userId: number, movieId: number): Promise<MovieRating | undefined>;
  getUserRatings(userId: number): Promise<MovieRating[]>;
  
  // Like methods
  likeMovie(userId: number, movieId: number): Promise<MovieLike>;
  unlikeMovie(userId: number, movieId: number): Promise<boolean>;
  getUserLikes(userId: number): Promise<number[]>;
  isLiked(userId: number, movieId: number): Promise<boolean>;
  
  // Watched movies methods
  markAsWatched(userId: number, movieId: number): Promise<WatchedMovie>;
  unmarkAsWatched(userId: number, movieId: number): Promise<boolean>;
  getWatchedMovies(userId: number): Promise<number[]>;
  isWatched(userId: number, movieId: number): Promise<boolean>;
  
  // Recommendation methods
  saveRecommendation(userId: number, movieId: number, score: number, genreMatch?: number, languageMatch?: number, collaborativeScore?: number): Promise<UserMovieRecommendation>;
  getUserRecommendations(userId: number, limit?: number): Promise<UserMovieRecommendation[]>;
  clearUserRecommendations(userId: number): Promise<void>;
  
  // Challenge methods
  getChallenges(levelRequired?: string): Promise<Challenge[]>;
  getUserChallenges(userId: number): Promise<(UserChallenge & { challenge: Challenge })[]>;
  startChallenge(userId: number, challengeId: number): Promise<UserChallenge>;
  updateChallengeProgress(userId: number, challengeId: number, progress: number): Promise<UserChallenge>;
  completeChallenge(userId: number, challengeId: number): Promise<UserChallenge>;
  
  // Session store
  sessionStore: any;
}

export class DatabaseStorage implements IStorage {
  sessionStore: any;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const userValues = {
      ...insertUser,
      // Cast to any to avoid type issues with preferences
      preferences: { genres: [], languages: [], favoriteMovies: [] } as any
    };
    
    const [user] = await db.insert(users).values(userValues).returning();
    return user;
  }
  
  async updateUserPreferences(userId: number, preferences: UserPreferences): Promise<User | undefined> {
    // Make sure we have favoriteMovies array
    const preferencesWithDefaults = {
      ...preferences,
      favoriteMovies: preferences.favoriteMovies || [],
      country: preferences.country || ""
    };
    
    const [updatedUser] = await db
      .update(users)
      .set({ preferences: preferencesWithDefaults })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
  }
  
  async updateUserExperience(userId: number, xpPoints: number): Promise<User | undefined> {
    const user = await this.getUser(userId);
    if (!user) return undefined;
    
    let newXp = (user.experiencePoints || 0) + xpPoints;
    let level = user.level || 'Beginner';
    
    // Determine new level based on XP
    if (newXp >= 301) level = 'Connoisseur';
    else if (newXp >= 151) level = 'Cinephile';
    else if (newXp >= 51) level = 'Explorer';
    else level = 'Beginner';
    
    const [updatedUser] = await db
      .update(users)
      .set({ 
        experiencePoints: newXp,
        level
      })
      .where(eq(users.id, userId))
      .returning();
    
    return updatedUser;
  }
  
  async getUserLevel(userId: number): Promise<{ level: string; experiencePoints: number; watchedCount: number }> {
    const user = await this.getUser(userId);
    if (!user) {
      return { level: 'Beginner', experiencePoints: 0, watchedCount: 0 };
    }
    
    return {
      level: user.level || 'Beginner',
      experiencePoints: user.experiencePoints || 0,
      watchedCount: user.watchedCount || 0
    };
  }
  
  // Watchlist methods
  async addToWatchlist(userId: number, movieId: number): Promise<Watchlist> {
    // Check if already in watchlist
    const [existing] = await db
      .select()
      .from(watchlist)
      .where(and(eq(watchlist.userId, userId), eq(watchlist.movieId, movieId)));
    
    if (existing) return existing;
    
    const [watchlistItem] = await db
      .insert(watchlist)
      .values({ userId, movieId })
      .returning();
    
    return watchlistItem;
  }
  
  async removeFromWatchlist(userId: number, movieId: number): Promise<boolean> {
    const result = await db
      .delete(watchlist)
      .where(and(eq(watchlist.userId, userId), eq(watchlist.movieId, movieId)));
    
    // Safely handle the count
    return result !== null && result !== undefined;
  }
  
  async getUserWatchlist(userId: number): Promise<number[]> {
    const items = await db
      .select({ movieId: watchlist.movieId })
      .from(watchlist)
      .where(eq(watchlist.userId, userId));
    
    return items.map(item => item.movieId);
  }
  
  async isInWatchlist(userId: number, movieId: number): Promise<boolean> {
    const [exists] = await db
      .select()
      .from(watchlist)
      .where(and(eq(watchlist.userId, userId), eq(watchlist.movieId, movieId)));
    
    return !!exists;
  }
  
  // Rating methods
  async rateMovie(userId: number, movieId: number, rating: number): Promise<MovieRating> {
    // Check if user already rated this movie
    const [existingRating] = await db
      .select()
      .from(movieRatings)
      .where(and(eq(movieRatings.userId, userId), eq(movieRatings.movieId, movieId)));
    
    // Add XP points for rating a movie
    await this.updateUserExperience(userId, 7);
    
    if (existingRating) {
      const [updatedRating] = await db
        .update(movieRatings)
        .set({ rating })
        .where(eq(movieRatings.id, existingRating.id))
        .returning();
      
      return updatedRating;
    }
    
    const [newRating] = await db
      .insert(movieRatings)
      .values({ userId, movieId, rating })
      .returning();
    
    return newRating;
  }
  
  async getUserRating(userId: number, movieId: number): Promise<MovieRating | undefined> {
    const [rating] = await db
      .select()
      .from(movieRatings)
      .where(and(eq(movieRatings.userId, userId), eq(movieRatings.movieId, movieId)));
    
    return rating;
  }
  
  async getUserRatings(userId: number): Promise<MovieRating[]> {
    return db
      .select()
      .from(movieRatings)
      .where(eq(movieRatings.userId, userId));
  }
  
  // Like methods
  async likeMovie(userId: number, movieId: number): Promise<MovieLike> {
    // Check if already liked
    const [existingLike] = await db
      .select()
      .from(movieLikes)
      .where(and(eq(movieLikes.userId, userId), eq(movieLikes.movieId, movieId)));
    
    if (existingLike) return existingLike;
    
    // Add XP points for liking a movie
    await this.updateUserExperience(userId, 3);
    
    const [newLike] = await db
      .insert(movieLikes)
      .values({ userId, movieId })
      .returning();
    
    return newLike;
  }
  
  async unlikeMovie(userId: number, movieId: number): Promise<boolean> {
    const result = await db
      .delete(movieLikes)
      .where(and(eq(movieLikes.userId, userId), eq(movieLikes.movieId, movieId)));
    
    // Safely handle the count
    return result !== null && result !== undefined;
  }
  
  async getUserLikes(userId: number): Promise<number[]> {
    const items = await db
      .select({ movieId: movieLikes.movieId })
      .from(movieLikes)
      .where(eq(movieLikes.userId, userId));
    
    return items.map(item => item.movieId);
  }
  
  async isLiked(userId: number, movieId: number): Promise<boolean> {
    const [exists] = await db
      .select()
      .from(movieLikes)
      .where(and(eq(movieLikes.userId, userId), eq(movieLikes.movieId, movieId)));
    
    return !!exists;
  }
  
  // Watched movies methods
  async markAsWatched(userId: number, movieId: number): Promise<WatchedMovie> {
    // Check if already marked as watched
    const [existing] = await db
      .select()
      .from(watchedMovies)
      .where(and(eq(watchedMovies.userId, userId), eq(watchedMovies.movieId, movieId)));
    
    if (existing) return existing;
    
    // Add XP points for watching a movie
    await this.updateUserExperience(userId, 5);
    
    // Increment watched count
    await db
      .update(users)
      .set({ watchedCount: sql`${users.watchedCount} + 1` })
      .where(eq(users.id, userId));
    
    const [watchedMovie] = await db
      .insert(watchedMovies)
      .values({ userId, movieId })
      .returning();
    
    // Check if this movie completes any challenges
    await this.checkChallengeProgress(userId, movieId);
    
    return watchedMovie;
  }
  
  async unmarkAsWatched(userId: number, movieId: number): Promise<boolean> {
    const result = await db
      .delete(watchedMovies)
      .where(and(eq(watchedMovies.userId, userId), eq(watchedMovies.movieId, movieId)));
    
    if (result) {
      // Decrement watched count, but don't go below 0
      await db
        .update(users)
        .set({ watchedCount: sql`GREATEST(${users.watchedCount} - 1, 0)` })
        .where(eq(users.id, userId));
    }
    
    // Safely handle the count
    return result !== null && result !== undefined;
  }
  
  async getWatchedMovies(userId: number): Promise<number[]> {
    const items = await db
      .select({ movieId: watchedMovies.movieId })
      .from(watchedMovies)
      .where(eq(watchedMovies.userId, userId));
    
    return items.map(item => item.movieId);
  }
  
  async isWatched(userId: number, movieId: number): Promise<boolean> {
    const [exists] = await db
      .select()
      .from(watchedMovies)
      .where(and(eq(watchedMovies.userId, userId), eq(watchedMovies.movieId, movieId)));
    
    return !!exists;
  }
  
  // Recommendation methods
  async saveRecommendation(
    userId: number, 
    movieId: number, 
    score: number, 
    genreMatch?: number, 
    languageMatch?: number, 
    collaborativeScore?: number
  ): Promise<UserMovieRecommendation> {
    // Check if recommendation already exists
    const [existing] = await db
      .select()
      .from(userMovieRecommendations)
      .where(and(eq(userMovieRecommendations.userId, userId), eq(userMovieRecommendations.movieId, movieId)));
    
    if (existing) {
      const [updated] = await db
        .update(userMovieRecommendations)
        .set({
          score,
          genreMatch,
          languageMatch,
          collaborativeScore,
          recommended: true
        })
        .where(eq(userMovieRecommendations.id, existing.id))
        .returning();
      
      return updated;
    }
    
    const [recommendation] = await db
      .insert(userMovieRecommendations)
      .values({ 
        userId, 
        movieId, 
        score,
        genreMatch,
        languageMatch,
        collaborativeScore
      })
      .returning();
    
    return recommendation;
  }
  
  async getUserRecommendations(userId: number, limit: number = 20): Promise<UserMovieRecommendation[]> {
    return db
      .select()
      .from(userMovieRecommendations)
      .where(and(
        eq(userMovieRecommendations.userId, userId),
        eq(userMovieRecommendations.recommended, true)
      ))
      .orderBy(desc(userMovieRecommendations.score))
      .limit(limit);
  }
  
  async clearUserRecommendations(userId: number): Promise<void> {
    await db
      .delete(userMovieRecommendations)
      .where(eq(userMovieRecommendations.userId, userId));
  }
  
  // Challenge methods
  async getChallenges(levelRequired?: string): Promise<Challenge[]> {
    if (levelRequired) {
      return db
        .select()
        .from(challenges)
        .where(and(
          eq(challenges.active, true),
          eq(challenges.requiredLevel, levelRequired)
        ))
        .orderBy(asc(challenges.id));
    }
    
    return db
      .select()
      .from(challenges)
      .where(eq(challenges.active, true))
      .orderBy(asc(challenges.id));
  }
  
  async getUserChallenges(userId: number): Promise<(UserChallenge & { challenge: Challenge })[]> {
    // Get all active challenges
    const activeUserChallenges = await db
      .select({
        userChallenge: userChallenges,
        challenge: challenges,
      })
      .from(userChallenges)
      .innerJoin(challenges, eq(userChallenges.challengeId, challenges.id))
      .where(and(
        eq(userChallenges.userId, userId),
        eq(challenges.active, true)
      ));
    
    // Transform results to expected format
    return activeUserChallenges.map(row => ({
      ...row.userChallenge,
      challenge: row.challenge,
    }));
  }
  
  async startChallenge(userId: number, challengeId: number): Promise<UserChallenge> {
    // Check if already started
    const [existing] = await db
      .select()
      .from(userChallenges)
      .where(and(eq(userChallenges.userId, userId), eq(userChallenges.challengeId, challengeId)));
    
    if (existing) return existing;
    
    const [userChallenge] = await db
      .insert(userChallenges)
      .values({ userId, challengeId, progress: 0 })
      .returning();
    
    return userChallenge;
  }
  
  async updateChallengeProgress(userId: number, challengeId: number, progress: number): Promise<UserChallenge> {
    const [existingChallenge] = await db
      .select()
      .from(userChallenges)
      .where(and(eq(userChallenges.userId, userId), eq(userChallenges.challengeId, challengeId)));
    
    if (!existingChallenge) {
      // Start the challenge if not started yet
      return this.startChallenge(userId, challengeId);
    }
    
    // Don't update if already completed
    if (existingChallenge.completed) return existingChallenge;
    
    const [challenge] = await db
      .select()
      .from(challenges)
      .where(eq(challenges.id, challengeId));
    
    let completed = false;
    const requiredCount = challenge.requiredCount || 1;
    if (progress >= requiredCount) {
      completed = true;
      
      // Award XP for completing a challenge
      await this.updateUserExperience(userId, challenge.experienceReward || 20);
    }
    
    const [updatedChallenge] = await db
      .update(userChallenges)
      .set({ 
        progress,
        completed,
        completedAt: completed ? new Date() : null
      })
      .where(and(eq(userChallenges.userId, userId), eq(userChallenges.challengeId, challengeId)))
      .returning();
    
    return updatedChallenge;
  }
  
  async completeChallenge(userId: number, challengeId: number): Promise<UserChallenge> {
    const [challenge] = await db
      .select()
      .from(challenges)
      .where(eq(challenges.id, challengeId));
    
    if (!challenge) throw new Error(`Challenge with id ${challengeId} not found`);
    
    // Award XP for completing a challenge
    await this.updateUserExperience(userId, challenge.experienceReward || 20);
    
    const requiredCount = challenge.requiredCount || 1;
    const [updatedChallenge] = await db
      .update(userChallenges)
      .set({ 
        progress: requiredCount,
        completed: true,
        completedAt: new Date()
      })
      .where(and(eq(userChallenges.userId, userId), eq(userChallenges.challengeId, challengeId)))
      .returning();
    
    if (!updatedChallenge) {
      // Create and complete in one go
      const [newChallenge] = await db
        .insert(userChallenges)
        .values({ 
          userId, 
          challengeId, 
          progress: requiredCount,
          completed: true,
          completedAt: new Date()
        })
        .returning();
      
      return newChallenge;
    }
    
    return updatedChallenge;
  }
  
  // Helper method to check challenge progress when marking a movie as watched
  private async checkChallengeProgress(userId: number, movieId: number): Promise<void> {
    // Get all active challenges for this user
    const userLevel = await this.getUserLevel(userId);
    let availableChallenges = await this.getChallenges();
    
    // Filter challenges by user level
    const levelOrder = {
      'Beginner': 0,
      'Explorer': 1,
      'Cinephile': 2,
      'Connoisseur': 3
    };
    
    const currentLevelIndex = levelOrder[userLevel.level as keyof typeof levelOrder] || 0;
    
    // Only get challenges for the user's level or below
    availableChallenges = availableChallenges.filter(challenge => {
      const challengeLevelIndex = levelOrder[challenge.requiredLevel as keyof typeof levelOrder] || 0;
      return challengeLevelIndex <= currentLevelIndex;
    });
    
    // Get movie details for genre-based challenges
    // This would normally use an API, but we'd need to add that first
    // For now, we'll just focus on watched count challenges
    
    // Update watched movie count for all applicable challenges
    for (const challenge of availableChallenges) {
      // For genre challenges, we'd need to check if the movie's genres match
      // For now, let's consider general watched movie count challenges
      const watchedMovies = await this.getWatchedMovies(userId);
      
      // Default progress is the number of watched movies
      let progress = watchedMovies.length;
      
      // Get current user challenge or start a new one
      await this.updateChallengeProgress(userId, challenge.id, progress);
    }
  }
}

export const storage = new DatabaseStorage();
