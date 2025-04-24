export interface Movie {
  id: number;
  title: string;
  poster_path: string;
  backdrop_path: string;
  overview: string;
  release_date: string;
  vote_average: number;
  vote_count: number;
  genres: Genre[];
  runtime: number;
  adult: boolean;
}

export interface Genre {
  id: number;
  name: string;
}

export interface Cast {
  id: number;
  name: string;
  character: string;
  profile_path: string;
}

export interface Crew {
  id: number;
  name: string;
  job: string;
  department: string;
}

export interface MovieDetails extends Movie {
  cast: Cast[];
  crew: Crew[];
  reviews: Review[];
  similar: Movie[];
  videos: Video[];
}

export interface Review {
  id: string;
  author: string;
  content: string;
  created_at: string;
}

export interface Video {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
}

export interface MovieResponse {
  results: Movie[];
  page: number;
  total_pages: number;
  total_results: number;
}

export type DiscoverMovieParams = {
  with_genres?: string;
  language?: string;
  sort_by?: string;
  page?: number;
  with_original_language?: string;
}

export interface Language {
  iso_639_1: string;
  english_name: string;
  name: string;
}
