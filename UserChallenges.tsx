import React from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Award, CheckCircle, Clock, Film, Trophy } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface Challenge {
  id: number;
  name: string;
  description: string;
  requiredLevel: string;
  requiredMovies: number[];
  requiredGenres: number[];
  requiredCount: number;
  experienceReward: number;
  active: boolean;
}

interface UserChallenge {
  id: number;
  userId: number;
  challengeId: number;
  completed: boolean;
  progress: number;
  startedAt: string;
  completedAt: string | null;
  challenge: Challenge;
}

export default function UserChallenges() {
  const { user } = useAuth();

  const { data: challenges, isLoading: isLoadingChallenges, refetch: refetchChallenges } = useQuery<UserChallenge[]>({
    queryKey: ['/api/user/challenges'],
    enabled: !!user,
  });

  const { data: userLevel } = useQuery({
    queryKey: ['/api/user/level'],
    enabled: !!user,
  });

  const { data: availableChallenges, isLoading: isLoadingAvailable } = useQuery<Challenge[]>({
    queryKey: ['/api/challenges'],
    enabled: !!user,
  });

  const startChallengeMutation = useMutation({
    mutationFn: async (challengeId: number) => {
      const res = await apiRequest('POST', `/api/challenges/${challengeId}/start`);
      return await res.json();
    },
    onSuccess: () => {
      refetchChallenges();
    },
  });

  if (isLoadingChallenges || isLoadingAvailable || !user) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Your Challenges</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-5 w-36 bg-gray-200 rounded"></div>
                <div className="h-4 w-full bg-gray-200 rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="h-3 w-full bg-gray-200 rounded mb-2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Filter active challenges that user has started
  const activeChallenges = challenges || [];
  
  // Find challenges available for user's level that haven't been started
  const userLevelName = userLevel?.level || 'Beginner';
  const levelsOrder = ['Beginner', 'Explorer', 'Cinephile', 'Connoisseur'];
  const userLevelIndex = levelsOrder.indexOf(userLevelName);
  const eligibleLevels = levelsOrder.slice(0, userLevelIndex + 1);
  
  const challengesToStart = (availableChallenges || [])
    .filter(challenge => 
      eligibleLevels.includes(challenge.requiredLevel) && 
      !activeChallenges.some(ac => ac.challengeId === challenge.id)
    );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Your Challenges</h2>
        <Badge variant="outline" className="flex items-center gap-1">
          <Trophy size={14} />
          <span>{activeChallenges.filter(c => c.completed).length} completed</span>
        </Badge>
      </div>
      
      {activeChallenges.length === 0 && challengesToStart.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Challenges Available</CardTitle>
            <CardDescription>
              Keep watching movies to unlock new challenges based on your level.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Active challenges */}
          {activeChallenges.map((challenge) => (
            <Card key={challenge.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{challenge.challenge.name}</CardTitle>
                  {challenge.completed ? (
                    <Badge className="bg-green-500">
                      <CheckCircle size={14} className="mr-1" />
                      Completed
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-amber-500 border-amber-500">
                      <Clock size={14} className="mr-1" />
                      In Progress
                    </Badge>
                  )}
                </div>
                <CardDescription>{challenge.challenge.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{challenge.progress} / {challenge.challenge.requiredCount}</span>
                    <span className="text-muted-foreground flex items-center">
                      <Award size={14} className="mr-1" />
                      {challenge.challenge.experienceReward} XP Reward
                    </span>
                  </div>
                  <Progress
                    value={(challenge.progress / challenge.challenge.requiredCount) * 100}
                    className={challenge.completed ? "bg-green-500" : ""}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
          
          {/* Available challenges to start */}
          {challengesToStart.map((challenge) => (
            <Card key={challenge.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{challenge.name}</CardTitle>
                  <Badge variant="outline" className="text-blue-500 border-blue-500">
                    <Film size={14} className="mr-1" />
                    Available
                  </Badge>
                </div>
                <CardDescription>{challenge.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Need to watch: {challenge.requiredCount} films</span>
                    <span className="text-muted-foreground flex items-center">
                      <Award size={14} className="mr-1" />
                      {challenge.experienceReward} XP Reward
                    </span>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  size="sm" 
                  onClick={() => startChallengeMutation.mutate(challenge.id)}
                  disabled={startChallengeMutation.isPending}
                >
                  Start Challenge
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}