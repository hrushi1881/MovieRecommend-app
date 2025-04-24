import React, { useState, useEffect } from 'react';
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CircleUser, Medal, Star, BookOpen, Film } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';

type Level = {
  name: string;
  description: string;
  minXP: number;
  maxXP: number | null;
  icon: React.ReactNode;
  color: string;
};

const levels: Level[] = [
  {
    name: 'Beginner',
    description: 'Starting your cinematic journey',
    minXP: 0,
    maxXP: 50,
    icon: <BookOpen size={16} />,
    color: 'bg-blue-500',
  },
  {
    name: 'Explorer',
    description: 'Expanding your cinematic horizons',
    minXP: 51,
    maxXP: 150,
    icon: <Film size={16} />,
    color: 'bg-green-500',
  },
  {
    name: 'Cinephile',
    description: 'Deepening your appreciation of film',
    minXP: 151,
    maxXP: 300,
    icon: <Star size={16} />,
    color: 'bg-purple-500',
  },
  {
    name: 'Connoisseur',
    description: 'Mastering the art of cinema',
    minXP: 301,
    maxXP: null,
    icon: <Medal size={16} />,
    color: 'bg-amber-500',
  },
];

export default function UserProgressBar() {
  const { user } = useAuth();
  
  const { data: userLevel, isLoading } = useQuery({
    queryKey: ['/api/user/level'],
    enabled: !!user,
  });

  if (isLoading || !user) {
    return <div className="h-4 w-full bg-gray-200 rounded-full animate-pulse" />;
  }

  const { experiencePoints, level: currentLevelName, watchedCount } = userLevel;
  
  // Find current level in our levels array
  const currentLevel = levels.find(l => l.name === currentLevelName) || levels[0];
  const nextLevel = levels.find(l => l.minXP > (currentLevel.minXP)) || null;
  
  // Calculate progress percentage
  let progressPercent = 100;
  if (nextLevel && currentLevel.maxXP) {
    const levelRange = currentLevel.maxXP - currentLevel.minXP;
    const userProgress = experiencePoints - currentLevel.minXP;
    progressPercent = Math.min(100, Math.max(0, (userProgress / levelRange) * 100));
  }

  return (
    <div className="w-full space-y-2">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={`font-medium ${currentLevel.color.replace('bg-', 'border-')} ${currentLevel.color.replace('bg-', 'text-')}`}>
            {currentLevel.icon}
            <span className="ml-1">{currentLevel.name}</span>
          </Badge>
          <span className="text-sm text-muted-foreground">{experiencePoints} XP</span>
        </div>
        
        {nextLevel && (
          <span className="text-xs text-muted-foreground">
            Next: {nextLevel.name} ({nextLevel.minXP - experiencePoints} XP needed)
          </span>
        )}
      </div>
      
      <Progress value={progressPercent} className={`h-2 ${currentLevel.color}`} />
      
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Movies watched: {watchedCount}</span>
        {currentLevel.maxXP && <span>{experiencePoints}/{currentLevel.maxXP} XP</span>}
      </div>
    </div>
  );
}