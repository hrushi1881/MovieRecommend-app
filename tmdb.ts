import { Movie, MovieDetails, Genre, DiscoverMovieParams, MovieResponse, Language } from "@shared/api";

// TMDB API base URL
const API_BASE_URL = "/api/tmdb";

// Fetch trending movies
export async function getTrendingMovies(): Promise<MovieResponse> {
  const response = await fetch(`${API_BASE_URL}/trending`);
  if (!response.ok) {
    throw new Error(`Failed to fetch trending movies: ${response.statusText}`);
  }
  return response.json();
}

// Fetch popular movies
export async function getPopularMovies(page: number = 1): Promise<MovieResponse> {
  const response = await fetch(`${API_BASE_URL}/popular?page=${page}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch popular movies: ${response.statusText}`);
  }
  return response.json();
}

// Fetch now playing movies
export async function getNowPlayingMovies(page: number = 1): Promise<MovieResponse> {
  const response = await fetch(`${API_BASE_URL}/now_playing?page=${page}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch now playing movies: ${response.statusText}`);
  }
  return response.json();
}

// Fetch upcoming movies
export async function getUpcomingMovies(page: number = 1): Promise<MovieResponse> {
  const response = await fetch(`${API_BASE_URL}/upcoming?page=${page}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch upcoming movies: ${response.statusText}`);
  }
  return response.json();
}

// Fetch movie details
export async function getMovieDetails(movieId: number): Promise<MovieDetails> {
  const response = await fetch(`${API_BASE_URL}/movie/${movieId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch movie details: ${response.statusText}`);
  }
  return response.json();
}

// Fetch genres list
export async function getGenres(): Promise<{ genres: Genre[] }> {
  const response = await fetch(`${API_BASE_URL}/genres`);
  if (!response.ok) {
    throw new Error(`Failed to fetch genres: ${response.statusText}`);
  }
  return response.json();
}

// Fetch languages list
export async function getLanguages(): Promise<Language[]> {
  const response = await fetch(`${API_BASE_URL}/languages`);
  if (!response.ok) {
    throw new Error(`Failed to fetch languages: ${response.statusText}`);
  }
  return response.json();
}

// Discover movies based on parameters
export async function discoverMovies(params: DiscoverMovieParams): Promise<MovieResponse> {
  const queryParams = new URLSearchParams();
  
  if (params.with_genres) {
    queryParams.append("with_genres", params.with_genres);
  }
  
  if (params.language) {
    queryParams.append("language", params.language);
  }
  
  if (params.sort_by) {
    queryParams.append("sort_by", params.sort_by);
  }
  
  if (params.page) {
    queryParams.append("page", params.page.toString());
  }
  
  if (params.with_original_language) {
    queryParams.append("with_original_language", params.with_original_language);
  }
  
  const response = await fetch(`${API_BASE_URL}/discover?${queryParams.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to discover movies: ${response.statusText}`);
  }
  return response.json();
}

// Search movies
export async function searchMovies(query: string, page: number = 1): Promise<MovieResponse> {
  const response = await fetch(`${API_BASE_URL}/search?query=${encodeURIComponent(query)}&page=${page}`);
  if (!response.ok) {
    throw new Error(`Failed to search movies: ${response.statusText}`);
  }
  return response.json();
}

// Get personalized movie recommendations based on user preferences
export async function getRecommendations(userId: number): Promise<MovieResponse> {
  // This would typically fetch from a dedicated endpoint that considers
  // the user's preferences, history, and other factors
  // For now, we'll use the discover endpoint
  
  const response = await fetch(`${API_BASE_URL}/popular`);
  if (!response.ok) {
    throw new Error(`Failed to get recommendations: ${response.statusText}`);
  }
  return response.json();
}
