import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { loadLocalHistory, localHistoryCodes, stubSavedRoom } from '@/lib/historyLocal';
import { loadSavedRoom, subscribeMyRoomCodes } from '@/lib/roomService';
import type { SavedRoom } from '@/types/room';

function mergeCodes(server: string[], extra: string[] = []) {
  return [...new Set([...server, ...extra, ...localHistoryCodes()])];
}

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
  for (const row of loadLocalHistory()) {
    if (!unique.includes(row.code) || byCode.has(row.code)) continue;
    byCode.set(row.code, stubSavedRoom(row));
  }
  return [...byCode.values()].sort(
    (a, b) => (b.created?.getTime() ?? 0) - (a.created?.getTime() ?? 0),
  );
}

export function useSavedRooms(uid: string | undefined) {
  const [rooms, setRooms] = useState<SavedRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [codes, setCodes] = useState<string[]>(() => localHistoryCodes());
  const [codesReady, setCodesReady] = useState(() => localHistoryCodes().length > 0);

  useEffect(() => {
    if (!uid) {
      setCodes((prev) => mergeCodes(prev));
      setCodesReady(true);
      return;
    }
    return subscribeMyRoomCodes(
      uid,
      (next) => {
        setCodes(mergeCodes(next));
        setCodesReady(true);
      },
      () => {
        setCodes((prev) => mergeCodes(prev));
        setCodesReady(true);
      },
    );
  }, [uid]);

  const refresh = useCallback(async (nextCodes: string[]) => {
    if (!nextCodes.length) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const rows = await loadRooms(nextCodes);
      setRooms((prev) => {
        if (rows.length > 0) return rows;
        return prev;
      });
    } catch {
      setRooms((prev) => prev);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!codesReady) return;
    void refresh(codes);
  }, [codes, codesReady, refresh]);

  useFocusEffect(
    useCallback(() => {
      if (!codesReady) return;
      void refresh(codes);
    }, [codes, codesReady, refresh]),
  );

  return { rooms, loading, refresh: () => refresh(codes) };
}

export const usePastRooms = useSavedRooms;
