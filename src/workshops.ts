export const WORKSHOPS = [
  'זמן לחינוך',
  'HR',
  'המגבר',
  'קהילת מחנכים חותם',
  'מנהיגות ביניים',
  'מחנכי עיר',
] as const;

export const PEOPLE = 9; // facilitators
export const ROUNDS = 3;
export const GROUP = 3; // facilitators per workshop in a round
export const W = WORKSHOPS.length;
/** Balanced group: at most this many facilitators get a workshop as their first choice. The rest are moved to their next choice. */
export const MAX_FIRST_CHOICE = 4;
