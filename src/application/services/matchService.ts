/**
 * matchService — admin-side workflow for reviewing buyer/seller matches.
 */
import { databaseService } from "@/backend";
import type { Match, MatchStatus } from "@/domain/types";

export const matchService = {
  async listAll(): Promise<Match[]> {
    return databaseService.listMatches();
  },

  async updateStatus(id: string, status: MatchStatus): Promise<void> {
    return databaseService.updateMatchStatus(id, status);
  },

  async approve(id: string): Promise<void> {
    return databaseService.updateMatchStatus(id, "buyer_interested");
  },

  async reject(id: string): Promise<void> {
    return databaseService.updateMatchStatus(id, "rejected");
  },
};
