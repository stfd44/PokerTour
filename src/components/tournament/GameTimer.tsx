import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import type { Game } from '../../store/tournamentStore';

interface GameTimerProps {
  game: Game;
}

interface GameTimerData {
  timeLeft: string;
  currentBlinds: { small: number; big: number };
  nextBlinds: { small: number; big: number };
}

export function GameTimer({ game }: GameTimerProps) {
  const [gameTimer, setGameTimer] = useState<GameTimerData | null>(null);

  // Fonction pour calculer les blindes du niveau suivant
  const calculateNextBlinds = (currentSmall: number, currentBig: number): { small: number; big: number } => {
    return {
      small: currentSmall * 2,
      big: currentBig * 2
    };
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (!game.startedAt) return;

      const startTime = new Date(game.startedAt).getTime();
      const now = new Date().getTime();
      const elapsedMinutes = Math.floor((now - startTime) / (1000 * 60));
      const currentLevel = Math.floor(elapsedMinutes / game.blindLevels);
      const nextLevelTime = (currentLevel + 1) * game.blindLevels * 60 * 1000;
      const timeToNextLevel = nextLevelTime - (now - startTime);

      const minutes = Math.floor(timeToNextLevel / (1000 * 60));
      const seconds = Math.floor((timeToNextLevel % (1000 * 60)) / 1000);

      const currentBlinds = {
        small: game.blinds.small * Math.pow(2, currentLevel),
        big: game.blinds.big * Math.pow(2, currentLevel)
      };

      const nextBlinds = calculateNextBlinds(currentBlinds.small, currentBlinds.big);

      setGameTimer({
        timeLeft: `${minutes}:${seconds.toString().padStart(2, '0')}`,
        currentBlinds,
        nextBlinds
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [game]);

  if (!gameTimer) return null;

  return (
    <div className="mb-6 p-4 bg-gray-50 rounded-lg space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Clock className="w-6 h-6 text-poker-gold mr-2" />
          <div>
            <div className="text-sm text-gray-600">Temps restant niveau</div>
            <div className="text-2xl font-bold">{gameTimer.timeLeft}</div>
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-600">Blindes actuelles</div>
          <div className="text-xl font-semibold">
            {gameTimer.currentBlinds.small}/
            {gameTimer.currentBlinds.big}
          </div>
        </div>
      </div>
      <div className="border-t pt-3">
        <div className="text-sm text-gray-600">Prochaines blindes</div>
        <div className="text-lg text-poker-gold">
          {gameTimer.nextBlinds.small}/
          {gameTimer.nextBlinds.big}
        </div>
      </div>
    </div>
  );
}
