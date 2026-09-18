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
