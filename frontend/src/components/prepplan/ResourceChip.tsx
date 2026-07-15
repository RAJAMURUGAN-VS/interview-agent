import type { ResourceLink, ResourceType } from '../../types';

interface ResourceChipProps {
  resource: ResourceLink;
}

const TYPE_STYLE: Record<ResourceType, { icon: string; cls: string }> = {
  youtube:  { icon: 'fab fa-youtube',       cls: 'bg-[#ef4444]/10 text-[#ef4444]  border-[#ef4444]/20'  },
  article:  { icon: 'fas fa-newspaper',     cls: 'bg-[#f59e0b]/10 text-[#f59e0b]  border-[#f59e0b]/20'  },
  practice: { icon: 'fas fa-code',          cls: 'bg-[#4f46e5]/10 text-[#818cf8]  border-[#4f46e5]/20'  },
  github:   { icon: 'fab fa-github',        cls: 'bg-[#8b8ba8]/10 text-[#8b8ba8]  border-[#8b8ba8]/20'  },
  docs:     { icon: 'fas fa-book-open',     cls: 'bg-[#22c55e]/10 text-[#22c55e]  border-[#22c55e]/20'  },
};

export default function ResourceChip({ resource }: ResourceChipProps) {
  const style = TYPE_STYLE[resource.type] ?? TYPE_STYLE.article;

  return (
    <a
      href={resource.url}
      target="_blank"
      rel="noopener noreferrer"
      title={resource.description}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl
        border text-xs font-medium transition-all duration-200
        hover:brightness-125 hover:shadow-sm ${style.cls}`}
    >
      <i className={`${style.icon} text-[11px]`} />
      <span className="truncate max-w-[160px]">{resource.title}</span>
      <i className="fas fa-arrow-up-right-from-square text-[9px] opacity-60 flex-shrink-0" />
    </a>
  );
}
