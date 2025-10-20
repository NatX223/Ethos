import type { Metadata } from 'next';

import { Inter, Space_Grotesk } from 'next/font/google';
import { getSession } from "~/auth";
import { Providers } from "~/app/providers";
import { APP_NAME, APP_DESCRIPTION } from "~/lib/constants";
import './globals.css';
// import '@coinbase/onchainkit/styles.css';
import { OnchainKitProvider } from '@coinbase/onchainkit';
import { base, baseSepolia } from 'wagmi/chains';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space-grotesk' });

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_DESCRIPTION,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  return (
    // <OnchainKitProvider
    //   apiKey="YOUR_API_KEY"
    //   chain={baseSepolia}
    //   config={{
    //     appearance: {
    //       mode: 'auto', // 'light' | 'dark' | 'auto'
    //     },
    //     wallet: {
    //       display: 'modal', // 'modal' | 'drawer'
    //       preference: 'all', // 'all' | 'smartWalletOnly' | 'eoaOnly'
    //     },
    //   }}
    // >
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <head>
        <link href="https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen bg-background font-clash antialiased">
        <Providers session={session}>{children}</Providers>
      </body>
    </html>
    // </OnchainKitProvider>
  );
}
