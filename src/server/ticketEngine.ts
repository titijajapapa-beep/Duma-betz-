import { Match, Ticket } from '../types/index';
import { getDb, saveDb, logAudit } from './db';

export class TicketEngine {
  // Check winning selection for a market based on scores
  static getWinningSelections(marketType: string, homeScore: number, awayScore: number): string[] {
    const winners: string[] = [];
    const totalGoals = homeScore + awayScore;

    if (marketType === '1x2') {
      if (homeScore > awayScore) winners.push('1');
      else if (homeScore === awayScore) winners.push('X');
      else winners.push('2');
    } else if (marketType === 'over_under_25') {
      if (totalGoals > 2.5) winners.push('over_25');
      else winners.push('under_25');
    } else if (marketType === 'over_under_15') {
      if (totalGoals > 1.5) winners.push('over_15');
      else winners.push('under_15');
    } else if (marketType === 'both_score') {
      if (homeScore > 0 && awayScore > 0) winners.push('btts_yes');
      else winners.push('btts_no');
    } else if (marketType === 'double_chance') {
      if (homeScore > awayScore) {
        winners.push('1X', '12');
      } else if (homeScore === awayScore) {
        winners.push('1X', 'X2');
      } else {
        winners.push('12', 'X2');
      }
    }

    return winners;
  }

  // Settle all pending tickets against finished matches
  static settleTickets(): { processedCount: number; wonCount: number; lostCount: number } {
    const db = getDb();
    const finishedMatchesMap = new Map<string, Match>();

    for (const match of db.matches) {
      if (match.status === 'finished' && typeof match.homeScore === 'number' && typeof match.awayScore === 'number') {
        finishedMatchesMap.set(match.id, match);
        if (match.externalId) {
          finishedMatchesMap.set(match.externalId, match);
        }
      }
    }

    let processedCount = 0;
    let wonCount = 0;
    let lostCount = 0;

    for (const ticket of db.tickets) {
      if (ticket.status !== 'pending') continue;

      let allItemsSettled = true;
      let hasLostItem = false;

      for (const item of ticket.items) {
        const finishedMatch = finishedMatchesMap.get(item.matchId);
        if (finishedMatch && typeof finishedMatch.homeScore === 'number' && typeof finishedMatch.awayScore === 'number') {
          const market = finishedMatch.markets.find(m => m.id === item.marketId || m.name === item.marketName);
          const marketType = market?.type || (item.marketName.includes('2.5') ? 'over_under_25' : '1x2');
          const winningSelections = this.getWinningSelections(marketType, finishedMatch.homeScore, finishedMatch.awayScore);

          if (winningSelections.includes(item.selectionId)) {
            item.status = 'won';
          } else {
            item.status = 'lost';
            hasLostItem = true;
          }
        } else {
          allItemsSettled = false;
        }
      }

      if (hasLostItem) {
        ticket.status = 'lost';
        ticket.settledAt = new Date().toISOString();
        lostCount++;
        processedCount++;
      } else if (allItemsSettled && ticket.items.length > 0) {
        ticket.status = 'won';
        ticket.settledAt = new Date().toISOString();
        wonCount++;
        processedCount++;

        // Credit user wallet
        const user = db.users.find(u => u.id === ticket.userId);
        if (user) {
          user.balance += ticket.potentialReturn;
          db.transactions.unshift({
            id: `tx-won-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            userId: user.id,
            userName: user.name,
            type: 'bet_won',
            amount: ticket.potentialReturn,
            status: 'completed',
            description: `Premiação do Bilhete ${ticket.code}`,
            createdAt: new Date().toISOString(),
            completedAt: new Date().toISOString()
          });
        }
      }
    }

    if (processedCount > 0) {
      logAudit('APURAÇÃO_BILHETES', `${processedCount} bilhetes apurados: ${wonCount} ganhos, ${lostCount} perdidos.`);
      saveDb(db);
    }

    return { processedCount, wonCount, lostCount };
  }

  // Fast-forward / update results for active scheduled matches for simulation
  static simulateScoresForScheduledMatches(): { updatedMatches: number; settled: { processedCount: number; wonCount: number; lostCount: number } } {
    const db = getDb();
    let updatedMatches = 0;

    // Pick 1 or 2 scheduled matches to finish with realistic football scores
    for (const match of db.matches) {
      if (match.status === 'scheduled') {
        // Generate realistic scores
        const scores = [
          [2, 1], [1, 1], [3, 0], [0, 2], [2, 2], [1, 0], [0, 0], [3, 2]
        ];
        const [hScore, aScore] = scores[Math.floor(Math.random() * scores.length)];

        match.status = 'finished';
        match.homeScore = hScore;
        match.awayScore = aScore;
        match.updatedAt = new Date().toISOString();
        updatedMatches++;
        break; // finish one at a time for smooth progression
      }
    }

    saveDb(db);
    const settled = this.settleTickets();
    return { updatedMatches, settled };
  }
}
