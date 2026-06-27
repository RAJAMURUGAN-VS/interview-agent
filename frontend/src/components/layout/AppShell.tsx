import type { ReactNode } from 'react';

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  return (
    <div className="bg-black min-h-screen text-white font-inter">
      <div className="min-h-screen flex flex-col lg:flex-row">
        {children}
      </div>
    </div>
  );
}
