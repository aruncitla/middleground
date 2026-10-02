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
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
        />
        <style
          dangerouslySetInnerHTML={{
            __html: `html, body, #root { background-color: #09090b; color: #ffffff; }`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
