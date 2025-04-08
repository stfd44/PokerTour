import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Transaction } from '../store/tournamentStore'; // Import Transaction type

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

// --- Debt Simplification Algorithm ---

interface PlayerBalance {
  id: string;
  name: string; // Keep name for the Transaction object
  balance: number; // Positive for creditor, negative for debtor
}

/**
 * Calculates the minimum number of transactions required to settle debts among players.
 * Uses a greedy approach to match debtors and creditors.
 *
 * @param balances - An array of objects, each containing player id, name, and their net balance (positive for credit, negative for debt).
 * @returns An array of Transaction objects representing the optimized payments.
 */
export function calculateSettlementTransactions(balances: PlayerBalance[]): Transaction[] {
  const transactions: Transaction[] = [];
  // Use a small epsilon for floating point comparisons
  const epsilon = 0.01; // Adjust if needed based on currency precision

  // Separate debtors and creditors, filter out zero balances
  // Use const as these arrays are modified via shift(), not reassigned
  const debtors = balances.filter(p => p.balance < -epsilon).sort((a, b) => a.balance - b.balance); // Most negative first
  const creditors = balances.filter(p => p.balance > epsilon).sort((a, b) => b.balance - a.balance); // Most positive first

  while (debtors.length > 0 && creditors.length > 0) {
    const debtor = debtors[0];
    const creditor = creditors[0];

    const amountToTransfer = Math.min(-debtor.balance, creditor.balance);

    // Create the transaction
    transactions.push({
      fromPlayerId: debtor.id,
      fromPlayerName: debtor.name,
      toPlayerId: creditor.id,
      toPlayerName: creditor.name,
      amount: Math.round(amountToTransfer * 100) / 100, // Round to 2 decimal places
      completed: false, // Initially not completed
    });

    // Update balances
    debtor.balance += amountToTransfer;
    creditor.balance -= amountToTransfer;

    // Remove settled players
    if (Math.abs(debtor.balance) < epsilon) {
      debtors.shift(); // Remove debtor if settled
    }
    if (Math.abs(creditor.balance) < epsilon) {
      creditors.shift(); // Remove creditor if settled
    }

    // Re-sort if needed (optional, but can maintain order)
    // debtors.sort((a, b) => a.balance - b.balance);
    // creditors.sort((a, b) => b.balance - a.balance);
  }

   // Log any remaining balances (should be very close to zero due to epsilon)
   // This helps debug potential floating point issues
   const remainingBalance = debtors.reduce((sum, d) => sum + d.balance, 0) + creditors.reduce((sum, c) => sum + c.balance, 0);
   if (Math.abs(remainingBalance) > epsilon * (debtors.length + creditors.length)) {
       console.warn(`Potential settlement imbalance: ${remainingBalance.toFixed(2)}`);
   }


  return transactions;
}
