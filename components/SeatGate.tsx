import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '@/components/Button';
import { avatarById, avatars, colors, controls, type, type AvatarId } from '@/lib/theme';
import {
  createSeat,
  grandfatherOwnSeat,
  joinRoom,
  reclaimSeat,
  isSeatTakenError,
  subscribeParticipants,
  subscribeSeats,
} from '@/lib/roomService';
import { loadProfile, saveProfile } from '@/lib/profileLocal';
import {
  loadLocalSeats,
  matchSeat,
  rememberSeat,
  setActiveSeat,
} from '@/lib/seatsLocal';
import type { Participant, Seat } from '@/types/room';

export type SeatSession = {
  seat: Seat;
  seats: Seat[];
  mySeats: Seat[];
  switching: boolean;
  setSwitching: (open: boolean) => void;
};

type Draft = { name: string; avatarId: AvatarId };

function pickActive(seats: Seat[], uid: string, containerCode: string) {
  const local = loadLocalSeats(containerCode);
  const claimed = seats.filter((s) => s.id === uid || s.claimerUids.includes(uid));
  const localKnown = seats.filter((s) => local.ids.includes(s.id));
  const mine = [
    ...localKnown,
    ...claimed.filter((s) => !localKnown.some((row) => row.id === s.id)),
  ];
  const active =
    mine.find((s) => s.id === local.activeId) ??
    claimed.find((s) => s.id === uid) ??
    mine[0] ??
    null;
  return { mine, active };
}

export function useSeat(containerCode: string | undefined, uid: string | undefined) {
  const [seats, setSeats] = useState<Seat[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [ready, setReady] = useState(false);
  const [tick, setTick] = useState(0);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    if (!containerCode) return;
    setReady(false);
    const unsubs = [
      subscribeSeats(containerCode, (rows) => {
        setSeats(rows);
        setReady(true);
      }),
      subscribeParticipants(containerCode, setParticipants),
    ];
    return () => unsubs.forEach((u) => u());
  }, [containerCode]);

  useEffect(() => {
    if (!containerCode || !uid || !ready) return;
    const mine = seats.some((s) => s.id === uid || s.claimerUids.includes(uid));
    if (mine) return;
    const participant = participants.find((p) => p.id === uid);
    if (!participant) return;
    void grandfatherOwnSeat(containerCode, uid, participant, seats).catch(() => {});
  }, [containerCode, uid, ready, seats, participants]);

  const { mine, active } = useMemo(() => {
    if (!containerCode || !uid) return { mine: [] as Seat[], active: null as Seat | null };
    return pickActive(seats, uid, containerCode);
  }, [seats, uid, containerCode, tick]);

  useEffect(() => {
    if (!containerCode || !active) return;
    rememberSeat(containerCode, active.id, false);
  }, [containerCode, active]);

  const activate = useCallback(
    (seatId: string) => {
      if (!containerCode) return;
      setActiveSeat(containerCode, seatId);
      const seat = seats.find((s) => s.id === seatId);
      if (seat) saveProfile({ name: seat.displayName, avatarId: seat.avatarId });
      setSwitching(false);
      setTick((n) => n + 1);
    },
    [containerCode, seats],
  );

  return {
    seats,
    mySeats: mine,
    active,
    ready,
    switching,
    setSwitching,
    activate,
    participants,
  };
}

export async function claimNewSeat(
  containerCode: string,
  topicCode: string | undefined,
  uid: string,
  name: string,
  avatarId: string,
  forceNew: boolean,
) {
  const seat = await createSeat(containerCode, uid, name, avatarId, { forceNew });
  saveProfile({ name: seat.displayName, avatarId: seat.avatarId });
  await joinRoom(topicCode || containerCode, uid, seat.displayName, seat.avatarId);
  if (topicCode && topicCode !== containerCode) {
    await joinRoom(containerCode, uid, seat.displayName, seat.avatarId).catch(() => {});
  }
  return seat;
}

export async function claimExistingSeat(
  containerCode: string,
  topicCode: string | undefined,
  uid: string,
  seat: Seat,
) {
  await reclaimSeat(containerCode, seat.id, uid);
  saveProfile({ name: seat.displayName, avatarId: seat.avatarId });
  await joinRoom(topicCode || containerCode, uid, seat.displayName, seat.avatarId);
  if (topicCode && topicCode !== containerCode) {
    await joinRoom(containerCode, uid, seat.displayName, seat.avatarId).catch(() => {});
  }
}

export function SeatPicker({
  title,
  confirmLabel,
  initialName,
  initialAvatarId,
  busy,
  onSubmit,
  extra,
}: {
  title: string;
  confirmLabel: string;
  initialName?: string;
  initialAvatarId?: AvatarId;
  busy?: boolean;
  onSubmit: (draft: Draft) => void;
  extra?: ReactNode;
}) {
  const stored = loadProfile();
  const [name, setName] = useState(initialName || stored.name);
  const [avatarId, setAvatarId] = useState<AvatarId>(initialAvatarId || stored.avatarId);

  useEffect(() => {
    const next = loadProfile();
    setName((current) => current.trim() || initialName || next.name);
    setAvatarId((current) => initialAvatarId || current || next.avatarId);
  }, [initialName, initialAvatarId]);

  return (
    <View style={styles.panel}>
      <Text style={type.section}>{title}</Text>
      <Text style={type.footnote}>A seat is a name and emoji in this room. No account.</Text>
      <Text style={[type.label, styles.label]}>Your name</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Your name"
        autoComplete="name"
        placeholderTextColor={colors.faint}
        style={controls.input}
      />
      <Text style={[type.label, styles.label]}>Emoji</Text>
      <View style={styles.avatars}>
        {avatars.map((a) => (
          <Pressable
            key={a.id}
            onPress={() => setAvatarId(a.id)}
            accessibilityRole="button"
            style={[
              styles.avatar,
              { backgroundColor: a.color },
              avatarId === a.id && styles.avatarOn,
            ]}
          >
            <Text style={styles.emoji}>{a.emoji}</Text>
          </Pressable>
        ))}
      </View>
      <Button
        disabled={busy || !name.trim()}
        label={busy ? 'Working…' : confirmLabel}
        onPress={() => onSubmit({ name: name.trim(), avatarId })}
      />
      {extra}
    </View>
  );
}

export function ReclaimNudge({
  seat,
  busy,
  onMine,
  onFresh,
}: {
  seat: Seat;
  busy?: boolean;
  onMine: () => void;
  onFresh: () => void;
}) {
  const avatar = avatarById(seat.avatarId);
  return (
    <View style={styles.panel}>
      <Text style={type.section}>Seat already taken</Text>
      <Text style={type.body}>
        {avatar.emoji} {seat.displayName} already exists here — is this you on a new device, or a
        fresh seat?
      </Text>
      <Button disabled={busy} label="Reclaim this seat" onPress={onMine} />
      <Button disabled={busy} variant="secondary" label="Create a new seat" onPress={onFresh} />
    </View>
  );
}

export function SwitchSeatPanel({
  mySeats,
  activeId,
  busy,
  onActivate,
  onCreate,
  onClose,
}: {
  mySeats: Seat[];
  activeId?: string;
  busy?: boolean;
  onActivate: (id: string) => void;
  onCreate: (draft: Draft) => void;
  onClose: () => void;
}) {
  return (
    <View style={styles.panel}>
      <Text style={type.section}>Switch seat</Text>
      <Text style={type.footnote}>This browser can hold more than one seat in the room.</Text>
      {mySeats.map((seat) => {
        const avatar = avatarById(seat.avatarId);
        const on = seat.id === activeId;
        return (
          <Pressable
            key={seat.id}
            onPress={() => onActivate(seat.id)}
            accessibilityRole="button"
            style={[styles.seatRow, on && styles.seatOn]}
          >
            <Text style={styles.emoji}>{avatar.emoji}</Text>
            <Text style={styles.seatName}>{seat.displayName}</Text>
            {on ? <Text style={type.footnote}>Active</Text> : null}
          </Pressable>
        );
      })}
      <SeatPicker title="Claim another seat" confirmLabel="Create seat" busy={busy} onSubmit={onCreate} />
      <Pressable onPress={onClose} accessibilityRole="button">
        <Text style={controls.ghostText}>Close</Text>
      </Pressable>
    </View>
  );
}

export function SeatGate({
  containerCode,
  topicCode,
  uid,
  required = true,
  onSeatChange,
  children,
}: {
  containerCode?: string;
  topicCode?: string;
  uid?: string;
  required?: boolean;
  onSeatChange?: (seat: Seat | null) => void;
  children: (session: SeatSession) => ReactNode;
}) {
  const session = useSeat(containerCode, uid);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<Seat | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onSeatChange?.(session.active);
  }, [session.active, onSeatChange]);

  useEffect(() => {
    if (!session.active || !uid || !containerCode) return;
    const topic = topicCode || containerCode;
    void joinRoom(topic, uid, session.active.displayName, session.active.avatarId).catch(() => {});
    if (topic !== containerCode) {
      void joinRoom(containerCode, uid, session.active.displayName, session.active.avatarId).catch(() => {});
    }
  }, [session.active?.id, session.active?.displayName, session.active?.avatarId, uid, containerCode, topicCode]);

  const submitClaim = async (draft: Draft, forceNew: boolean) => {
    if (!containerCode || !uid) {
      setError('Still signing you in. Try again in a moment.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const existing = matchSeat(session.seats, draft.name, draft.avatarId);
      if (existing && !forceNew) {
        setPending(existing);
        return;
      }
      // Already have a seat in this room: a unique name+emoji must mint another, not reuse mine[0].
      const another = forceNew || session.mySeats.length > 0;
      const seat = await claimNewSeat(containerCode, topicCode, uid, draft.name, draft.avatarId, another);
      session.activate(seat.id);
    } catch (e) {
      if (isSeatTakenError(e)) {
        setPending(e.seat);
        return;
      }
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const onReclaim = async () => {
    if (!containerCode || !uid || !pending) return;
    setBusy(true);
    setError(null);
    try {
      await claimExistingSeat(containerCode, topicCode, uid, pending);
      session.activate(pending.id);
      setPending(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const onFresh = async () => {
    if (!pending) return;
    const draft = { name: pending.displayName, avatarId: pending.avatarId as AvatarId };
    setPending(null);
    await submitClaim(draft, true);
  };

  if (!containerCode || !uid || !session.ready) return null;

  const body = (
    <>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {pending ? (
        <ReclaimNudge seat={pending} busy={busy} onMine={() => void onReclaim()} onFresh={() => void onFresh()} />
      ) : session.switching ? (
        <SwitchSeatPanel
          mySeats={session.mySeats}
          activeId={session.active?.id}
          busy={busy}
          onActivate={session.activate}
          onCreate={(draft) => void submitClaim(draft, false)}
          onClose={() => session.setSwitching(false)}
        />
      ) : !session.active && required ? (
        <SeatPicker
          title="Claim a seat"
          confirmLabel="Join with this seat"
          busy={busy}
          onSubmit={(draft) => void submitClaim(draft, false)}
        />
      ) : session.active ? (
        children({
          seat: session.active,
          seats: session.seats,
          mySeats: session.mySeats,
          switching: session.switching,
          setSwitching: session.setSwitching,
        })
      ) : (
        children({
          seat: { id: uid, displayName: 'Guest', avatarId: 'fox', claimerUids: [uid] },
          seats: session.seats,
          mySeats: session.mySeats,
          switching: session.switching,
          setSwitching: session.setSwitching,
        })
      )}
    </>
  );

  if (!session.active && required) return <View style={styles.gate}>{body}</View>;
  return <>{body}</>;
}

const styles = StyleSheet.create({
  gate: { flex: 1, padding: 20, justifyContent: 'center' },
  panel: { ...controls.panel, gap: 10 },
  label: { marginTop: 4 },
  avatars: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarOn: {
    borderColor: colors.accentHover,
    boxShadow: '0 0 0 3px rgba(99, 102, 241, 0.35)',
  },
  emoji: { fontSize: 22 },
  seatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  seatOn: { borderColor: colors.accentHover },
  seatName: { ...type.section, flex: 1 },
  error: { ...type.body, color: colors.danger },
});
