import type { ReactNode } from 'react';

interface AppShellProps { children: ReactNode; }

export default function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {children}
    </div>
  );
}
