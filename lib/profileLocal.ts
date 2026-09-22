import { avatars, type AvatarId } from '@/lib/theme';

export type LocalProfile = {
  name: string;
  avatarId: AvatarId;
};

const KEY = 'mg.profile';

function asAvatarId(id: string | undefined): AvatarId {
  return avatars.some((a) => a.id === id) ? (id as AvatarId) : 'fox';
}

export function loadProfile(): LocalProfile {
  if (typeof localStorage === 'undefined') return { name: '', avatarId: 'fox' };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { name: '', avatarId: 'fox' };
    const parsed = JSON.parse(raw) as { name?: unknown; avatarId?: unknown };
    return {
      name: typeof parsed.name === 'string' ? parsed.name.trim().slice(0, 40) : '',
      avatarId: asAvatarId(typeof parsed.avatarId === 'string' ? parsed.avatarId : undefined),
    };
  } catch {
    return { name: '', avatarId: 'fox' };
  }
}

export function saveProfile(profile: { name: string; avatarId: string }) {
  if (typeof localStorage === 'undefined') return;
  const name = profile.name.trim().slice(0, 40);
  if (!name) return;
  localStorage.setItem(
    KEY,
    JSON.stringify({ name, avatarId: asAvatarId(profile.avatarId) } satisfies LocalProfile),
  );
}
