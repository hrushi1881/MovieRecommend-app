import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MovieGrid from "@/components/MovieGrid";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Check } from "lucide-react";
import { discoverMovies } from "@/lib/tmdb";
import { Genre } from "@shared/api";

// Contexts for watching situation
const watchingContexts = [
  { id: "alone", label: "Watching Alone", description: "Movies perfect for solo viewing" },
  { id: "family", label: "Family Night", description: "Family-friendly options for all ages" },
  { id: "date", label: "Date Night", description: "Romantic options for couples" },
  { id: "friends", label: "With Friends", description: "Fun movies to enjoy with friends" },
  { id: "kids", label: "With Kids", description: "Movies suitable for children" },
  { id: "binge", label: "Binge Watching", description: "Great for watching multiple episodes or films" }
];

// Sort options
const sortOptions = [
  { value: "popularity.desc", label: "Most Popular" },
  { value: "vote_average.desc", label: "Highest Rated" },
  { value: "release_date.desc", label: "Newest First" },
  { value: "release_date.asc", label: "Oldest First" },
  { value: "revenue.desc", label: "Highest Grossing" }
];

export default function RecommendationPage() {
  // Filter states
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("en");
  const [yearRange, setYearRange] = useState<[number, number]>([1990, new Date().getFullYear()]);
  const [selectedContext, setSelectedContext] = useState<string>("alone");
  const [includeAdult, setIncludeAdult] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<string>("popularity.desc");
  const [currentPage, setCurrentPage] = useState<number>(1);

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

  // Filter popular languages
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

  // Apply context-based genre recommendations
  useEffect(() => {
    // Adjust genre selection based on context
    switch (selectedContext) {
      case "family":
        setSelectedGenres([10751, 16, 35]); // Family, Animation, Comedy
        setIncludeAdult(false);
        break;
      case "date":
        setSelectedGenres([10749, 18]); // Romance, Drama
        break;
      case "friends":
        setSelectedGenres([35, 28, 12]); // Comedy, Action, Adventure
        break;
      case "kids":
        setSelectedGenres([16, 10751, 14]); // Animation, Family, Fantasy
        setIncludeAdult(false);
        break;
      case "binge":
        setSelectedGenres([28, 878, 10759]); // Action, Sci-Fi, Action & Adventure
        break;
      default:
        // For "alone", don't auto-select genres
        break;
    }
  }, [selectedContext]);

  // Convert year range to date strings for TMDB API
  const getYearRangeParams = () => {
    return {
      "primary_release_date.gte": `${yearRange[0]}-01-01`,
      "primary_release_date.lte": `${yearRange[1]}-12-31`
    };
  };

  // Fetch movies based on filters
  const { data, isLoading, error } = useQuery({
    queryKey: [
      "/api/tmdb/discover",
      {
        genres: selectedGenres,
        language: selectedLanguage,
        yearRange,
        context: selectedContext,
        includeAdult,
        sortBy,
        page: currentPage
      }
    ],
    queryFn: async () => {
      const genreParam = selectedGenres.length > 0 ? selectedGenres.join(",") : undefined;
      const params = {
        with_genres: genreParam,
        with_original_language: selectedLanguage,
        sort_by: sortBy,
        include_adult: includeAdult,
        page: currentPage,
        ...getYearRangeParams()
      };
      return discoverMovies(params);
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const movies = data?.results || [];
  const totalPages = data?.total_pages || 0;
  const totalResults = data?.total_results || 0;

  // Handle page navigation
  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
      window.scrollTo(0, 0);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages && currentPage < 500) { // TMDB API limits to 500 pages
      setCurrentPage(prev => prev + 1);
      window.scrollTo(0, 0);
    }
  };

  // Toggle genre selection
  const toggleGenre = (genreId: number) => {
    setSelectedGenres(prev => 
      prev.includes(genreId)
        ? prev.filter(id => id !== genreId)
        : [...prev, genreId]
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 pt-24 pb-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Find Your Perfect Movie</h1>
          <p className="text-muted-foreground mb-8">
            Discover movies tailored to your preferences and current mood
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Filters Section */}
            <div className="md:col-span-1">
              <div className="bg-card rounded-lg p-6 border mb-6">
                <h2 className="text-xl font-bold mb-4">Filters</h2>
                
                {/* Watching Context */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium mb-3">I'm watching...</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {watchingContexts.map(context => (
                      <div
                        key={context.id}
                        className={`p-3 rounded-md border cursor-pointer transition-colors ${
                          selectedContext === context.id 
                            ? "bg-primary/10 border-primary" 
                            : "bg-background hover:bg-muted"
                        }`}
                        onClick={() => setSelectedContext(context.id)}
                      >
                        <div className="font-medium text-sm">{context.label}</div>
                        <div className="text-xs text-muted-foreground mt-1">{context.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <Accordion type="single" collapsible defaultValue="genres">
                  {/* Genres */}
                  <AccordionItem value="genres">
                    <AccordionTrigger>Genres</AccordionTrigger>
                    <AccordionContent>
                      {loadingGenres ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {genresData?.genres?.map((genre: Genre) => (
                            <Badge
                              key={genre.id}
                              variant={selectedGenres.includes(genre.id) ? "default" : "outline"}
                              className="cursor-pointer text-sm py-1 px-2"
                              onClick={() => toggleGenre(genre.id)}
                            >
                              {selectedGenres.includes(genre.id) && <Check className="h-3 w-3 mr-1" />}
                              {genre.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                  
                  {/* Year Range */}
                  <AccordionItem value="year">
                    <AccordionTrigger>Release Year</AccordionTrigger>
                    <AccordionContent>
                      <div className="px-2 py-4">
                        <div className="flex justify-between mb-2 text-sm">
                          <span>{yearRange[0]}</span>
                          <span>{yearRange[1]}</span>
                        </div>
                        <Slider
                          value={yearRange}
                          min={1900}
                          max={new Date().getFullYear()}
                          step={1}
                          onValueChange={(value: [number, number]) => setYearRange(value)}
                          className="mb-4"
                        />
                        <div className="text-sm text-muted-foreground">
                          Movies released between {yearRange[0]} and {yearRange[1]}
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                  
                  {/* Language */}
                  <AccordionItem value="language">
                    <AccordionTrigger>Language</AccordionTrigger>
                    <AccordionContent>
                      <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                        <SelectTrigger className="w-full mt-2">
                          <SelectValue placeholder="Select a language" />
                        </SelectTrigger>
                        <SelectContent>
                          {popularLanguages.map(language => (
                            <SelectItem key={language.iso_639_1} value={language.iso_639_1}>
                              {language.english_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </AccordionContent>
                  </AccordionItem>
                  
                  {/* Additional Options */}
                  <AccordionItem value="options">
                    <AccordionTrigger>More Options</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="adult-content" className="cursor-pointer">
                            Include Adult Content
                          </Label>
                          <Switch
                            id="adult-content"
                            checked={includeAdult}
                            onCheckedChange={setIncludeAdult}
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="sort-by" className="block mb-2">
                            Sort Results By
                          </Label>
                          <Select value={sortBy} onValueChange={setSortBy}>
                            <SelectTrigger id="sort-by" className="w-full">
                              <SelectValue placeholder="Sort by..." />
                            </SelectTrigger>
                            <SelectContent>
                              {sortOptions.map(option => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
              
              <Button className="w-full" onClick={() => setCurrentPage(1)}>
                Apply Filters
              </Button>
            </div>
            
            {/* Results Section */}
            <div className="md:col-span-3">
              {isLoading ? (
                <div className="min-h-[400px] flex items-center justify-center">
                  <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
                </div>
              ) : error ? (
                <div className="min-h-[400px] flex items-center justify-center text-center">
                  <div className="max-w-md">
                    <h3 className="text-xl font-medium mb-2">Error loading movies</h3>
                    <p className="text-muted-foreground">
                      There was a problem fetching your recommendations. Please try again.
                    </p>
                  </div>
                </div>
              ) : movies.length > 0 ? (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-medium">
                      {totalResults.toLocaleString()} Movies Found
                    </h2>
                    <div className="text-sm text-muted-foreground">
                      Page {currentPage} of {Math.min(totalPages, 500)}
                    </div>
                  </div>
                  
                  <MovieGrid movies={movies} />
                  
                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-4 mt-8">
                      <Button
                        variant="outline"
                        onClick={handlePrevPage}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      
                      <span className="text-muted-foreground">
                        Page {currentPage} of {Math.min(totalPages, 500)}
                      </span>
                      
                      <Button
                        variant="outline"
                        onClick={handleNextPage}
                        disabled={currentPage === Math.min(totalPages, 500)}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="min-h-[400px] flex items-center justify-center text-center">
                  <div className="max-w-md">
                    <h3 className="text-xl font-medium mb-2">No movies found</h3>
                    <p className="text-muted-foreground mb-4">
                      Try adjusting your filters to find more movies.
                    </p>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setSelectedGenres([]);
                        setYearRange([1990, new Date().getFullYear()]);
                        setSelectedLanguage("en");
                        setIncludeAdult(false);
                        setSortBy("popularity.desc");
                        setCurrentPage(1);
                      }}
                    >
                      Reset All Filters
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}