import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta name="color-scheme" content="dark" />
        <meta name="theme-color" content="#09090b" />
        <link
          rel="icon"
          type="image/svg+xml"
          href="data:image/svg+xml,%3Csvg viewBox='0 0 76 76' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='76' height='76' fill='%2309090B'/%3E%3Cg transform='translate(0 22)'%3E%3Cdefs%3E%3CclipPath id='l'%3E%3Cpath d='M15 3 L33 3 A13 13 0 0 1 33 29 L15 29 A13 13 0 0 1 15 3 Z'/%3E%3C/clipPath%3E%3CclipPath id='r'%3E%3Cpath d='M43 3 L61 3 A13 13 0 0 1 61 29 L43 29 A13 13 0 0 1 43 3 Z'/%3E%3C/clipPath%3E%3CradialGradient id='g'%3E%3Cstop offset='0%25' stop-color='%23FCD34D'/%3E%3Cstop offset='100%25' stop-color='%23F59E0B' stop-opacity='0'/%3E%3C/radialGradient%3E%3C/defs%3E%3Cg clip-path='url(%23l)'%3E%3Cg clip-path='url(%23r)'%3E%3Crect width='76' height='32' fill='url(%23g)'/%3E%3C/g%3E%3C/g%3E%3Cpath d='M15 3 L33 3 A13 13 0 0 1 33 29 L15 29 A13 13 0 0 1 15 3 Z' stroke='%23FF6B6B' stroke-width='4'/%3E%3Cpath d='M43 3 L61 3 A13 13 0 0 1 61 29 L43 29 A13 13 0 0 1 43 3 Z' stroke='%232DD4BF' stroke-width='4'/%3E%3C/g%3E%3C/svg%3E"
        />
        <link rel="icon" type="image/png" href="/favicon.png" />
        <ScrollViewStyleReset />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300..800&display=swap"
        />
        <style
          dangerouslySetInnerHTML={{
            __html: `
:root {
  --mg-bg: #09090B;
  --mg-surface-1: #121216;
  --mg-surface-2: #1B1B20;
  --mg-surface-3: #232329;
  --mg-line: rgba(255,255,255,.08);
  --mg-text: #FAFAF9;
  --mg-text-2: #D4D4D8;
  --mg-text-3: #A1A1AA;
  --mg-coral: #FF6B6B;
  --mg-coral-bright: #FF8A7A;
  --mg-teal: #2DD4BF;
  --mg-teal-bright: #5EEAD4;
  --mg-amber: #FBBF24;
  --mg-radius-card: 18px;
  --mg-radius-input: 14px;
  --mg-shadow-card: 0 18px 40px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.04);
}
html, body, #root {
  background-color: var(--mg-bg);
  background-image: none;
  color: var(--mg-text);
}
[data-mg-btn] {
  font-weight: 650;
  letter-spacing: -0.01em;
  transition: transform 160ms ease, box-shadow 160ms ease, filter 160ms ease;
}
[data-mg-btn]:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px #09090B, 0 0 0 4px var(--mg-teal), var(--mg-btn-shadow, 0 10px 24px rgba(45,212,191,.32)) !important;
}
[data-mg-btn]:active:not([aria-disabled="true"]) {
  transform: translateY(1px) scale(.99);
}
[data-mg-input]::placeholder {
  color: var(--mg-text-3);
}
[data-mg-input="code"]::placeholder {
  color: rgba(250, 250, 249, 0.28);
  font-weight: 400;
  font-style: italic;
  letter-spacing: 0;
}
[data-mg-input]:focus, [data-mg-input]:focus-visible {
  outline: none;
  border-color: var(--mg-teal) !important;
  box-shadow: 0 0 0 3px rgba(45,212,191,.18), inset 0 1px 3px rgba(0,0,0,.45) !important;
}
[data-mg-vote-bar] {
  padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
}
`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
