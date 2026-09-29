const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
export const CLOSING_SOON_MS = 5 * MINUTE_MS;

function formatWhen(date: Date) {
  return date.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

export function formatEndsAt(date: Date) {
  return `ends ${formatWhen(date)}`;
}

export function formatEndedAt(date: Date) {
  return formatWhen(date);
}

export function formatVoteDeadline(date: Date, now = Date.now()) {
  if (now >= date.getTime()) return `ended ${formatWhen(date)}`;
  return formatEndsAt(date);
}

export function liveDeadline(room?: {
  status?: string;
  closesAt?: Date;
  votesCloseAt?: Date;
} | null) {
  if (!room || room.status === 'summary') return undefined;
  if (room.status === 'swiping') return room.votesCloseAt ?? room.closesAt;
  return room.closesAt ?? room.votesCloseAt;
}

export function formatClosesIn(endsAt: Date, now = Date.now()) {
  const ms = endsAt.getTime() - now;
  if (ms <= 0) return 'Closed';
  const days = Math.floor(ms / DAY_MS);
  const hours = Math.floor((ms % DAY_MS) / HOUR_MS);
  const minutes = Math.floor((ms % HOUR_MS) / MINUTE_MS);
  if (days > 0 && hours > 0) return `Closes in ${days}d ${hours}h`;
  if (days > 0) return `Closes in ${days}d`;
  if (hours > 0 && minutes > 0) return `Closes in ${hours}h ${minutes}m`;
  if (hours > 0) return `Closes in ${hours}h`;
  if (minutes > 0) return `Closes in ${minutes}m`;
  return 'Closing soon';
}

export function isClosingSoon(endsAt: Date, now = Date.now()) {
  const ms = endsAt.getTime() - now;
  return ms > 0 && ms < CLOSING_SOON_MS;
}
