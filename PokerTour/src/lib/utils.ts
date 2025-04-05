import { type ClassValue, clsx } from 'clsx';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Calculates the total prize pool.
 * @param buyIn - The buy-in amount per player.
 * @param playerCount - The number of players.
 * @returns The total prize pool.
 */
export function calculatePrizePool(buyIn: number, playerCount: number): number {
  return buyIn * playerCount;
}

/**
 * Rounds a number to the nearest multiple of 5.
 * @param amount - The number to round.
 * @returns The rounded number.
 */
function roundToNearest5(amount: number): number {
  return Math.round(amount / 5) * 5;
}

/**
 * Calculates the winnings for the top 3 places based on percentages and prize pool,
 * applying rounding rules and adjustments.
 * @param prizePool - The total prize pool amount.
 * @param percentages - An object containing the percentages for 1st, 2nd, and 3rd place (e.g., { first: 60, second: 25, third: 15 }). Must sum to 100.
 * @returns An object with the calculated winnings for 1st, 2nd, and 3rd place.
 */
export function calculateWinnings(
  prizePool: number,
  percentages: { first: number; second: number; third: number }
): { first: number; second: number; third: number } {
  if (prizePool <= 0 || percentages.first + percentages.second + percentages.third !== 100) {
    // Return zero winnings if prize pool is invalid or percentages don't sum to 100
    return { first: 0, second: 0, third: 0 };
  }

  // Calculate initial amounts
  const initialFirst = prizePool * (percentages.first / 100);
  const initialSecond = prizePool * (percentages.second / 100);
  const initialThird = prizePool * (percentages.third / 100);

  // Round each amount to the nearest 5
  let roundedFirst = roundToNearest5(initialFirst);
  let roundedSecond = roundToNearest5(initialSecond);
  let roundedThird = roundToNearest5(initialThird);

  // Calculate the sum of rounded amounts
  const roundedSum = roundedFirst + roundedSecond + roundedThird;

  // Calculate the difference and adjust the first place winnings
  const difference = prizePool - roundedSum;
  roundedFirst += difference;

  // Ensure no negative winnings after adjustment (edge case)
  if (roundedFirst < 0) {
      // This scenario is unlikely with standard rounding but added for robustness.
      // A more complex redistribution might be needed if this happens frequently.
      // For now, we'll adjust the others proportionally if first goes negative.
      const deficit = -roundedFirst;
      roundedFirst = 0;
      const secondThirdSum = roundedSecond + roundedThird;
      if (secondThirdSum > 0) {
          roundedSecond -= roundToNearest5(deficit * (roundedSecond / secondThirdSum));
          roundedThird -= roundToNearest5(deficit * (roundedThird / secondThirdSum));
          // Final adjustment to ensure sum matches prize pool
          const finalSum = roundedFirst + roundedSecond + roundedThird;
          roundedSecond += prizePool - finalSum; // Adjust second place for any remaining difference
      } else {
          // If second and third were also zero, put everything back to first (highly improbable)
          roundedFirst = prizePool;
          roundedSecond = 0;
          roundedThird = 0;
      }
  }


  return {
    first: roundedFirst,
    second: roundedSecond,
    third: roundedThird,
  };
}
