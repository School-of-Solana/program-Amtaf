// src/app/layout.tsx
import "./globals.css";
import { WalletContextProvider } from "@/app/components/WalletContextProvider";
import Navbar from "@/app/components/Navbar";

export const metadata = {
  title: "Solana Freelance Escrow Dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0b0f1a] text-[#E6F0FF]">
        <WalletContextProvider>
          <Navbar/>
          {children}
          </WalletContextProvider>
      </body>
    </html>
  );
}
