import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Loader2, Star } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Genre } from "@shared/api";
import { UserPreferences } from "@shared/schema";

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  const { toast } = useToast();
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(["en"]);
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [activeTab, setActiveTab] = useState("country");
  
  // Fetch genres
  const { data: genresData, isLoading: genresLoading } = useQuery({
    queryKey: ["/api/tmdb/genres"],
    staleTime: 1000 * 60 * 60, // 1 hour
  });
  
  // Popular countries
  const popularCountries = [
    { iso: "IN", name: "India" },
    { iso: "US", name: "United States" },
    { iso: "KR", name: "South Korea" },
    { iso: "JP", name: "Japan" },
    { iso: "FR", name: "France" },
    { iso: "IT", name: "Italy" },
    { iso: "ES", name: "Spain" },
    { iso: "DE", name: "Germany" },
    { iso: "GB", name: "United Kingdom" },
    { iso: "CN", name: "China" },
    { iso: "BR", name: "Brazil" },
    { iso: "MX", name: "Mexico" },
    { iso: "RU", name: "Russia" },
    { iso: "CA", name: "Canada" },
    { iso: "AU", name: "Australia" },
  ];
  
  // Popular languages
  const popularLanguages = [
    { iso_639_1: "en", english_name: "English" },
    { iso_639_1: "es", english_name: "Spanish" },
    { iso_639_1: "fr", english_name: "French" },
    { iso_639_1: "de", english_name: "German" },
    { iso_639_1: "it", english_name: "Italian" },
    { iso_639_1: "ja", english_name: "Japanese" },
    { iso_639_1: "ko", english_name: "Korean" },
    { iso_639_1: "hi", english_name: "Hindi" },
    { iso_639_1: "te", english_name: "Telugu" },
    { iso_639_1: "ta", english_name: "Tamil" },
    { iso_639_1: "ru", english_name: "Russian" },
    { iso_639_1: "zh", english_name: "Chinese" },
    { iso_639_1: "pt", english_name: "Portuguese" },
    { iso_639_1: "ar", english_name: "Arabic" },
  ];
  
  // Get popular movies for rating
  const { data: popularMovies, isLoading: moviesLoading } = useQuery({
    queryKey: ["/api/tmdb/popular"],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Mutation to save preferences
  const savePreferencesMutation = useMutation({
    mutationFn: async (preferences: UserPreferences) => {
      await apiRequest("PUT", "/api/preferences", preferences);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/preferences"] });
      toast({
        title: "Preferences saved",
        description: "Your movie preferences have been updated",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error saving preferences",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Toggle genre selection
  const toggleGenre = (genreId: number) => {
    setSelectedGenres(prev => 
      prev.includes(genreId) 
        ? prev.filter(id => id !== genreId) 
        : [...prev, genreId]
    );
  };
  
  // Toggle language selection
  const toggleLanguage = (languageCode: string) => {
    setSelectedLanguages(prev => 
      prev.includes(languageCode) 
        ? prev.filter(code => code !== languageCode) 
        : [...prev, languageCode]
    );
  };
  
  // Select country
  const selectCountry = (countryCode: string) => {
    setSelectedCountry(countryCode);
  };
  
  // Sample movies for rating
  const sampleMovies = popularMovies?.results?.slice(0, 3) || [];
  
  // Handle save
  const handleSave = () => {
    if (selectedGenres.length === 0) {
      toast({
        title: "Please select at least one genre",
        variant: "destructive",
      });
      return;
    }
    
    savePreferencesMutation.mutate({
      genres: selectedGenres,
      languages: selectedLanguages,
      favoriteMovies: [],
      country: selectedCountry || "US", // Default to US if not selected
    });
  };
  
  // Handle skip
  const handleSkip = () => {
    // Set default preferences if user skips
    savePreferencesMutation.mutate({
      genres: [28, 12, 35], // Action, Adventure, Comedy
      languages: ["en"],
      favoriteMovies: [],
      country: "US",
    });
  };
  
  // Handle next button
  const handleNext = () => {
    if (activeTab === "country") {
      if (!selectedCountry) {
        toast({
          title: "Please select your country",
          variant: "destructive",
        });
        return;
      }
      setActiveTab("genres");
    } else if (activeTab === "genres") {
      if (selectedGenres.length === 0) {
        toast({
          title: "Please select at least one genre",
          variant: "destructive",
        });
        return;
      }
      setActiveTab("languages");
    } else if (activeTab === "languages") {
      setActiveTab("ratings");
    } else {
      handleSave();
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Welcome to ODYSCAPE!</DialogTitle>
          <DialogDescription>
            Let us know your preferences to help personalize your cinematic journey with regionally and culturally relevant recommendations.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="country">Country</TabsTrigger>
            <TabsTrigger value="genres">Genres</TabsTrigger>
            <TabsTrigger value="languages">Languages</TabsTrigger>
            <TabsTrigger value="ratings">Rate Movies</TabsTrigger>
          </TabsList>
          
          <TabsContent value="country">
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Select your country to discover local and regional cinema treasures tailored to your cultural context
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 my-6">
                {popularCountries.map((country) => (
                  <div
                    key={country.iso}
                    onClick={() => selectCountry(country.iso)}
                    className={`
                      p-4 border rounded-lg cursor-pointer transition-all
                      ${selectedCountry === country.iso ? 
                        'border-primary bg-primary/10 text-primary' : 
                        'border-border hover:border-primary/50'
                      }
                    `}
                  >
                    <div className="font-medium">{country.name}</div>
                    {selectedCountry === country.iso && (
                      <div className="text-xs text-primary mt-1 flex items-center">
                        <Check className="h-3 w-3 mr-1" /> Selected
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="genres">
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Select the genres you're most interested in watching
              </p>
              
              {genresLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 my-6">
                  {genresData?.genres?.map((genre: Genre) => (
                    <Badge
                      key={genre.id}
                      variant={selectedGenres.includes(genre.id) ? "default" : "outline"}
                      className="cursor-pointer text-sm py-1.5 px-3"
                      onClick={() => toggleGenre(genre.id)}
                    >
                      {selectedGenres.includes(genre.id) && <Check className="h-3 w-3 mr-1" />}
                      {genre.name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="languages">
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Select the languages you prefer, including your regional language, to discover diverse cinema from around the world
              </p>
              
              <div className="flex flex-wrap gap-2 my-6">
                {popularLanguages.map((language) => (
                  <Badge
                    key={language.iso_639_1}
                    variant={selectedLanguages.includes(language.iso_639_1) ? "default" : "outline"}
                    className="cursor-pointer text-sm py-1.5 px-3"
                    onClick={() => toggleLanguage(language.iso_639_1)}
                  >
                    {selectedLanguages.includes(language.iso_639_1) && <Check className="h-3 w-3 mr-1" />}
                    {language.english_name}
                  </Badge>
                ))}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="ratings">
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Rate these popular movies to improve your recommendations
              </p>
              
              {moviesLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-6">
                  {sampleMovies.map((movie) => (
                    <div key={movie.id} className="text-center">
                      <img 
                        src={`https://image.tmdb.org/t/p/w200${movie.poster_path}`}
                        alt={movie.title}
                        className="w-full h-auto aspect-[2/3] object-cover rounded mb-2"
                        onError={(e) => {
                          e.currentTarget.src = "https://via.placeholder.com/200x300?text=No+Image";
                        }}
                      />
                      <h4 className="text-sm font-medium mb-1 truncate">{movie.title}</h4>
                      <div className="flex justify-center mt-1 text-muted-foreground">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            className="text-2xl transition-colors hover:text-yellow-500"
                          >
                            <Star className="h-5 w-5" />
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="flex justify-between">
          <Button variant="ghost" onClick={handleSkip}>
            Skip for now
          </Button>
          
          <div className="space-x-2">
            {activeTab !== "country" && (
              <Button 
                variant="outline" 
                onClick={() => {
                  if (activeTab === "genres") {
                    setActiveTab("country");
                  } else if (activeTab === "languages") {
                    setActiveTab("genres");
                  } else if (activeTab === "ratings") {
                    setActiveTab("languages");
                  }
                }}
              >
                Back
              </Button>
            )}
            
            <Button 
              onClick={handleNext}
              disabled={savePreferencesMutation.isPending}
            >
              {savePreferencesMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {activeTab === "ratings" ? "Save Preferences" : "Next"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
