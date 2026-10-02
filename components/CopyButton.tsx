import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Button } from '@/components/Button';

type Props = {
  value: string;
  label?: string;
};

export function CopyButton({ value, label = 'Copy' }: Props) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="secondary"
      label={copied ? 'Copied' : label}
      onPress={() => {
        void Clipboard.setStringAsync(value).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        });
      }}
    />
  );
}
