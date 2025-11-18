// src/app/page.tsx
import EscrowPanel from "./components/EscrowPanel";

export default function Page() {
  return (
    <main className="flex min-h-screen">
      <aside className="w-72 bg-[#071027] border-r border-[#122033] p-6">
        <div className="text-xl font-bold mb-6">Escrow  Dashboard</div>
        <nav className="space-y-3">
          <div className="px-3 py-2 rounded-md bg-gradient-to-r from-[#0f1724] to-[#071227]">
            <a href="#" className="block">Overview</a>
          </div>
          <a href="#create" className="block px-3 py-2 rounded-md hover:bg-[#0f1724]">Create Escrow</a>
          <a href="#manage" className="block px-3 py-2 rounded-md hover:bg-[#0f1724]">Manage Escrows</a>
        </nav>
      </aside>

      <section className="flex-1 p-8 space-y-8">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Escrow Dashboard</h1>
          <div id="wallet-controls" />
        </header>

        <EscrowPanel />
      </section>
    </main>
  );
}
