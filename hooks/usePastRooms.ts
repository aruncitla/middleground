import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { loadSavedRoom, subscribeMyRoomCodes } from '@/lib/roomService';
import type { SavedRoom } from '@/types/room';

async function loadRooms(codes: string[]) {
  const unique = [...new Set(codes)];
  const loaded = (
    await Promise.all(
      unique.map(async (code) => {
        try {
          return await loadSavedRoom(code);
        } catch {
          return null;
        }
      }),
    )
  ).filter((row): row is SavedRoom => Boolean(row));
  const byCode = new Map<string, SavedRoom>();
  for (const row of loaded) byCode.set(row.code, row);
  return [...byCode.values()].sort(
    (a, b) => (b.created?.getTime() ?? 0) - (a.created?.getTime() ?? 0),
  );
}

export function useSavedRooms(uid: string | undefined) {
  const [rooms, setRooms] = useState<SavedRoom[]>([]);
  const [loading, setLoading] = useState(Boolean(uid));
  const [codes, setCodes] = useState<string[]>([]);
  const [codesReady, setCodesReady] = useState(false);

  useEffect(() => {
    if (!uid) {
      setRooms([]);
      setCodes([]);
      setCodesReady(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    setCodesReady(false);
    return subscribeMyRoomCodes(uid, (next) => {
      setCodes(next);
      setCodesReady(true);
    });
  }, [uid]);

  const refresh = useCallback(async (nextCodes: string[]) => {
    if (!uid) return;
    setLoading(true);
    try {
      const rows = await loadRooms(nextCodes);
      setRooms(rows);
    } catch {
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    if (!uid || !codesReady) return;
    void refresh(codes);
  }, [uid, codes, codesReady, refresh]);

  useFocusEffect(
    useCallback(() => {
      if (!uid || !codesReady) return;
      void refresh(codes);
    }, [uid, codes, codesReady, refresh]),
  );

  return { rooms, loading, refresh: () => refresh(codes) };
}

export const usePastRooms = useSavedRooms;
