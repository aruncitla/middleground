import * as Clipboard from 'expo-clipboard';
import { Platform, Share } from 'react-native';
import { APP_URL } from '@/lib/app';

function asElement(node: unknown): HTMLElement | null {
  if (!node || typeof node !== 'object') return null;
  if (typeof (node as HTMLElement).cloneNode === 'function') return node as HTMLElement;
  const nested = (node as { _nativeNode?: unknown })._nativeNode;
  if (nested && typeof (nested as HTMLElement).cloneNode === 'function') return nested as HTMLElement;
  return null;
}

function isAbort(error: unknown) {
  return error instanceof Error && (error.name === 'AbortError' || /abort|cancel/i.test(error.message));
}

function isMobileWeb() {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function withTimeout<T>(promise: Promise<T>, ms: number) {
  return new Promise<T | null>((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch(() => {
        clearTimeout(timer);
        resolve(null);
      });
  });
}

async function capturePng(node: unknown): Promise<File | null> {
  if (Platform.OS !== 'web') return null;
  const el = asElement(node);
  if (!el) return null;
  const { toBlob } = await import('html-to-image');
  const blob = await toBlob(el, {
    pixelRatio: 2,
    cacheBust: true,
    backgroundColor: '#0B1026',
    skipFonts: true,
  });
  if (!blob) return null;
  return new File([blob], 'middleground-consensus.png', { type: 'image/png' });
}

function downloadFile(file: File) {
  const href = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = href;
  link.download = file.name;
  link.click();
  URL.revokeObjectURL(href);
}

export function consensusShareMessage(topic: string) {
  return `We found some overlap on “${topic}” with Middleground.\n${APP_URL}`;
}

export async function shareConsensusCard(node: unknown, topic: string): Promise<'shared' | 'copied' | 'cancelled'> {
  const text = consensusShareMessage(topic);
  const capture = capturePng(node);

  if (Platform.OS === 'web' && isMobileWeb() && typeof navigator.share === 'function') {
    const file = await withTimeout(capture, 4000);
    const payload: ShareData = { title: 'Middleground', text, url: APP_URL };
    const withFile = Boolean(file && navigator.canShare?.({ files: [file] }));
    try {
      await navigator.share(withFile && file ? { ...payload, files: [file] } : payload);
      return 'shared';
    } catch (error) {
      if (isAbort(error)) return 'cancelled';
    }
  }

  if (Platform.OS !== 'web') {
    try {
      const result = await Share.share({ title: 'Middleground', message: text, url: APP_URL });
      if (result.action === Share.dismissedAction) return 'cancelled';
      return 'shared';
    } catch (error) {
      if (isAbort(error)) return 'cancelled';
    }
  }

  await Clipboard.setStringAsync(text);
  const file = await withTimeout(capture, 4000);
  if (file) downloadFile(file);
  return 'copied';
}
