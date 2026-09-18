import type { RoomStatus } from '@/types/room';

export function pathForRoom(code: string, status: RoomStatus | string | undefined) {
  if (status === 'swiping') return `/swipe/${code}`;
  if (status === 'summary') return `/summary/${code}`;
  return `/lobby/${code}`;
}
