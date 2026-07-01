import type { ReactNode } from 'react';

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  return (
    <div className="bg-black min-h-screen text-white font-inter">
      {children}
    </div>
  );
}
