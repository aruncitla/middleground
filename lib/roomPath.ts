import type { RoomStatus } from '@/types/room';

export function pathForRoom(code: string, status: RoomStatus | string | undefined) {
  if (status === 'swiping') return `/swipe/${code}`;
  if (status === 'summary') return `/summary/${code}`;
  return `/lobby/${code}`;
}

export function pathForSavedRoom(containerCode: string, topicCode?: string) {
  if (topicCode && topicCode !== containerCode) return `/room/${containerCode}?topic=${topicCode}`;
  return `/room/${containerCode}`;
}
