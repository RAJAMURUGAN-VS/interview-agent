import { useState } from 'react';
import type { PrepDay } from '../../types';
import ResourceChip from './ResourceChip';

interface TopicCardProps {
  day: PrepDay;
}

export default function TopicCard({ day }: TopicCardProps) {
  // Checklist state — persisted per render (resets on day change via key in PlanTimeline)
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  const toggle = (i: number) =>
    setChecked((prev) => ({ ...prev, [i]: !prev[i] }));

  const doneCount  = Object.values(checked).filter(Boolean).length;
  const totalTasks = day.practiceTasks.length;

  const youtubeLinks  = day.resources.filter((r) => r.type === 'youtube');
  const practiceLinks = day.resources.filter((r) => r.type === 'practice');
  const otherLinks    = day.resources.filter(
    (r) => r.type !== 'youtube' && r.type !== 'practice'
  );

  return (
    <div className="space-y-5">

      {/* ── Topic header ─────────────────────────────────────────────── */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#4f46e5]/15 border border-[#4f46e5]/30
          flex items-center justify-center flex-shrink-0 mt-0.5">
          <i className="fas fa-book text-[#4f46e5] text-sm" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-[#f0f0ff] font-bold text-base leading-tight">
            {day.topic}
          </h2>
          <div className="flex flex-wrap gap-3 mt-1">
            {day.topicWeight > 0 && (
              <span className="text-xs text-[#8b8ba8]">
                <i className="fas fa-chart-pie mr-1" />
                {day.topicWeight}% prep weight
              </span>
            )}
            {day.estimatedHours > 0 && (
              <span className="text-xs text-[#8b8ba8]">
                <i className="fas fa-clock mr-1" />
                ~{day.estimatedHours}h today
              </span>
            )}
            {totalTasks > 0 && (
              <span className={`text-xs font-medium ${
                doneCount === totalTasks ? 'text-[#22c55e]' : 'text-[#8b8ba8]'
              }`}>
                <i className={`fas ${doneCount === totalTasks ? 'fa-circle-check' : 'fa-list-check'} mr-1`} />
                {doneCount}/{totalTasks} tasks
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Section 1: What to master ────────────────────────────────── */}
      {day.conceptsToMaster.length > 0 && (
        <div className="bg-[#0a0a0f] border border-[#2a2a3d] rounded-xl p-4">
          <p className="text-xs font-semibold text-[#4f46e5] uppercase tracking-wider mb-3">
            <i className="fas fa-crosshairs mr-1.5" />What to master today
          </p>
          <ul className="space-y-2">
            {day.conceptsToMaster.map((concept, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-[#c0c0d8]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4f46e5] mt-1.5 flex-shrink-0" />
                {concept}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Section 2: What to actually do ───────────────────────────── */}
      {day.practiceTasks.length > 0 && (
        <div className="bg-[#0a0a0f] border border-[#2a2a3d] rounded-xl p-4">
          <p className="text-xs font-semibold text-[#22c55e] uppercase tracking-wider mb-3">
            <i className="fas fa-bolt mr-1.5" />Today's assignments
          </p>
          <ul className="space-y-3">
            {day.practiceTasks.map((task, i) => (
              <li
                key={i}
                onClick={() => toggle(i)}
                className="flex items-start gap-3 cursor-pointer group"
              >
                {/* Checkbox */}
                <div className={`w-5 h-5 rounded-md border-2 flex items-center
                  justify-center flex-shrink-0 mt-0.5 transition-all
                  ${checked[i]
                    ? 'bg-[#22c55e] border-[#22c55e]'
                    : 'border-[#2a2a3d] group-hover:border-[#4f46e5]/60'
                  }`}>
                  {checked[i] && (
                    <i className="fas fa-check text-white text-[9px]" />
                  )}
                </div>
                <span className={`text-sm leading-relaxed transition-colors
                  ${checked[i]
                    ? 'text-[#4a4a6a] line-through'
                    : 'text-[#c0c0d8] group-hover:text-[#f0f0ff]'
                  }`}>
                  {task}
                </span>
              </li>
            ))}
          </ul>

          {/* Progress bar */}
          {totalTasks > 0 && (
            <div className="mt-4 h-1.5 bg-[#2a2a3d] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#22c55e] rounded-full transition-all duration-500"
                style={{ width: `${(doneCount / totalTasks) * 100}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* ── Section 3: Resources ─────────────────────────────────────── */}
      {day.resources.length > 0 ? (
        <div className="space-y-3">
          {youtubeLinks.length > 0 && (
            <div>
              <p className="text-xs font-medium text-[#8b8ba8] uppercase tracking-wider mb-2">
                <i className="fab fa-youtube mr-1.5 text-[#ef4444]" />Watch
              </p>
              <div className="flex flex-wrap gap-2">
                {youtubeLinks.map((r, i) => <ResourceChip key={i} resource={r} />)}
              </div>
            </div>
          )}
          {practiceLinks.length > 0 && (
            <div>
              <p className="text-xs font-medium text-[#8b8ba8] uppercase tracking-wider mb-2">
                <i className="fas fa-code mr-1.5 text-[#4f46e5]" />Practice
              </p>
              <div className="flex flex-wrap gap-2">
                {practiceLinks.map((r, i) => <ResourceChip key={i} resource={r} />)}
              </div>
            </div>
          )}
          {otherLinks.length > 0 && (
            <div>
              <p className="text-xs font-medium text-[#8b8ba8] uppercase tracking-wider mb-2">
                <i className="fas fa-newspaper mr-1.5 text-[#f59e0b]" />Read
              </p>
              <div className="flex flex-wrap gap-2">
                {otherLinks.map((r, i) => <ResourceChip key={i} resource={r} />)}
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-[#4a4a6a] italic">
          <i className="fas fa-circle-info mr-1.5" />
          No strong resources found for this topic yet.
        </p>
      )}

    </div>
  );
}
