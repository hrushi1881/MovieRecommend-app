import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Movie } from "@shared/api";
import { Play, Info } from "lucide-react";

interface HeroSectionProps {
  movie: Movie;
}

export default function HeroSection({ movie }: HeroSectionProps) {
  const [_, navigate] = useLocation();
  
  const releaseYear = movie.release_date ? new Date(movie.release_date).getFullYear() : "N/A";
  const match = Math.round((movie.vote_average / 10) * 100);
  
  const truncateOverview = (text: string, maxLength: number = 200) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  return (
    <section className="relative h-[70vh] md:h-[80vh] bg-black overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-black to-transparent z-10"></div>
      
      {/* Movie background image */}
      <img 
        src={`https://image.tmdb.org/t/p/original${movie.backdrop_path}`}
        alt={movie.title}
        className="absolute inset-0 w-full h-full object-cover opacity-60"
        onError={(e) => {
          e.currentTarget.src = "https://images.unsplash.com/photo-1574267432553-4b4628081c31?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80";
        }}
      />
      
      {/* Movie Content */}
      <div className="relative z-20 container mx-auto px-4 h-full flex flex-col justify-center pt-16">
        <div className="max-w-2xl">
          <Badge className="mb-4 bg-primary text-white border-none">
            #1 Trending Today
          </Badge>
          
          <h1 className="text-4xl md:text-5xl font-bold mb-3 text-white">{movie.title}</h1>
          
          <div className="flex items-center mb-4 text-sm md:text-base">
            <span className="text-green-500 font-medium mr-2">{match}% Match</span>
            <span className="mr-2">{releaseYear}</span>
            <span className="border border-gray-500 px-1 mr-2">
              {movie.adult ? "R" : "PG-13"}
            </span>
          </div>
          
          <p className="text-sm md:text-base mb-6 text-gray-300 max-w-xl">
            {truncateOverview(movie.overview)}
          </p>
          
          <div className="flex flex-wrap gap-3">
            <Button 
              size="lg"
              onClick={() => navigate(`/movie/${movie.id}`)}
              className="gap-2"
            >
              <Play className="h-5 w-5" /> Play
            </Button>
            
            <Button 
              variant="secondary" 
              size="lg"
              onClick={() => navigate(`/movie/${movie.id}`)}
              className="gap-2"
            >
              <Info className="h-5 w-5" /> More Info
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
