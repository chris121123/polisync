// Local solver defaults. Values are part of the golden fixture contract.

export const DEFAULT_CONFIG = {
  maxBacktrackDepth: 300,     // Lower than server for responsiveness
  timeBudgetMs: 4000,
  retryAttempts: 2,
  minBreakMinutes: 15,
  operatingStartHour: 8,
  operatingEndHour: 17,
  maxDailyHoursPerStudent: 4,
  slotIncrementHours: 0.5,
};
