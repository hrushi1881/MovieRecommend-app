import { pgTable, text, serial, integer, boolean, json, timestamp, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  preferences: json("preferences").$type<{
    genres: number[];
    languages: string[];
    favoriteMovies: number[];
    country: string;
  }>(),
  experiencePoints: integer("experience_points").default(0),
  level: text("level").default("Beginner"),
  watchedCount: integer("watched_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const watchlist = pgTable("watchlist", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  movieId: integer("movie_id").notNull(),
  addedAt: timestamp("added_at").defaultNow(),
});

export const movieRatings = pgTable("movie_ratings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  movieId: integer("movie_id").notNull(),
  rating: integer("rating").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const movieLikes = pgTable("movie_likes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  movieId: integer("movie_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const watchedMovies = pgTable("watched_movies", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  movieId: integer("movie_id").notNull(),
  watchedAt: timestamp("watched_at").defaultNow(),
});

export const userMovieRecommendations = pgTable("user_movie_recommendations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  movieId: integer("movie_id").notNull(),
  score: doublePrecision("score").notNull(),
  genreMatch: doublePrecision("genre_match"),
  languageMatch: doublePrecision("language_match"),
  collaborativeScore: doublePrecision("collaborative_score"),
  recommended: boolean("recommended").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userChallenges = pgTable("user_challenges", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  challengeId: integer("challenge_id").notNull(),
  completed: boolean("completed").default(false),
  progress: integer("progress").default(0),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const challenges = pgTable("challenges", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  requiredLevel: text("required_level").default("Beginner"),
  requiredMovies: json("required_movies").$type<number[]>().default([]),
  requiredGenres: json("required_genres").$type<number[]>().default([]),
  requiredCount: integer("required_count").default(1),
  experienceReward: integer("experience_reward").default(20),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
});

export const updateUserPreferencesSchema = z.object({
  genres: z.array(z.number()),
  languages: z.array(z.string()),
  favoriteMovies: z.array(z.number()).optional().default([]),
  country: z.string().optional(),
});

export const updateUserLevelSchema = z.object({
  experiencePoints: z.number(),
  level: z.string(),
  watchedCount: z.number(),
});

export const challengeSchema = createInsertSchema(challenges).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Watchlist = typeof watchlist.$inferSelect;
export type MovieRating = typeof movieRatings.$inferSelect;
export type MovieLike = typeof movieLikes.$inferSelect;
export type WatchedMovie = typeof watchedMovies.$inferSelect;
export type UserMovieRecommendation = typeof userMovieRecommendations.$inferSelect;
export type UserChallenge = typeof userChallenges.$inferSelect;
export type Challenge = typeof challenges.$inferSelect;
export type UserPreferences = z.infer<typeof updateUserPreferencesSchema>;
export type UserLevel = z.infer<typeof updateUserLevelSchema>;
