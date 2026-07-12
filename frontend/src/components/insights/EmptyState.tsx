interface EmptyStateProps {
  icon?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export default function EmptyState({ icon = 'fas fa-inbox', title, subtitle, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-[#1a1a2e] border border-[#2a2a3d]
        flex items-center justify-center mb-4">
        <i className={`${icon} text-xl text-[#4f46e5]`} />
      </div>
      <p className="text-[#f0f0ff] font-semibold text-base mb-1">{title}</p>
      {subtitle && (
        <p className="text-sm text-[#8b8ba8] max-w-xs">{subtitle}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
