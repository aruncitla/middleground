import { useEffect, useState } from 'react';
import { loadFollowUpCodes, loadRoomPreview, subscribeMyRoomCodes } from '@/lib/roomService';
import type { RoomPreview } from '@/types/room';

export type PastDiscussion = {
  room: RoomPreview;
  children: RoomPreview[];
};

function nestPreviews(rows: RoomPreview[]): PastDiscussion[] {
  const byCode = new Map(rows.map((row) => [row.code, row]));
  const nested = new Set<string>();
  const children = new Map<string, RoomPreview[]>();

  for (const row of rows) {
    const parent = row.parentRoomId;
    if (!parent || !byCode.has(parent)) continue;
    nested.add(row.code);
    const list = children.get(parent) ?? [];
    list.push(row);
    children.set(parent, list);
  }

  const byDate = (a: RoomPreview, b: RoomPreview) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0);

  return rows
    .filter((row) => !nested.has(row.code))
    .sort(byDate)
    .map((row) => ({
      room: row,
      children: (children.get(row.code) ?? []).sort(byDate),
    }));
}

export function usePastRooms(uid: string | undefined) {
  const [rooms, setRooms] = useState<PastDiscussion[]>([]);
  const [loading, setLoading] = useState(Boolean(uid));

  useEffect(() => {
    if (!uid) {
      setRooms([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    let cancelled = false;
    const unsub = subscribeMyRoomCodes(uid, (codes) => {
      void (async () => {
        try {
          const history = (await Promise.all(codes.map((code) => loadRoomPreview(code)))).filter(
            (row): row is RoomPreview => Boolean(row),
          );
          const extra = new Set<string>();
          await Promise.all(
            history
              .filter((row) => !row.parentRoomId)
              .map(async (row) => {
                const childCodes = await loadFollowUpCodes(row.code);
                for (const code of childCodes) extra.add(code);
              }),
          );
          const missing = [...extra].filter((code) => !history.some((row) => row.code === code));
          const discovered = (await Promise.all(missing.map((code) => loadRoomPreview(code)))).filter(
            (row): row is RoomPreview => Boolean(row),
          );
          if (!cancelled) setRooms(nestPreviews([...history, ...discovered]));
        } catch {
          if (!cancelled) setRooms([]);
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, [uid]);

  return { rooms, loading };
}
