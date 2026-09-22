/** Calendar months follow Belgian time (Europe/Brussels), for leaderboards and watch-time marks. */
const TIME_ZONE = 'Europe/Brussels';
function localParts(date: Date) {
  return Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: TIME_ZONE,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
      .formatToParts(date)
      .map((part) => [part.type, Number(part.value)]),
  );
}

/** `YYYY-MM` of the Belgian calendar month containing `date`. */
export function monthKey(date = new Date()) {
  const { year, month } = localParts(date);
  return `${year}-${String(month).padStart(2, '0')}`;
}

/** Midnight on the first day of the current month in Belgium, as a UTC instant. */
export function monthStart(now = new Date()) {
  const local = localParts(now);
  const guess = Date.UTC(local.year, local.month - 1, 1);
  const atGuess = localParts(new Date(guess));
  const offset =
    Date.UTC(
      atGuess.year,
      atGuess.month - 1,
      atGuess.day,
      atGuess.hour,
      atGuess.minute,
      atGuess.second,
    ) - guess;
  return new Date(guess - offset);
}
