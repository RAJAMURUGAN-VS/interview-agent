/**
 * TopicCard
 *
 * Renders one prep-plan day.
 * - Shows the mission card + "Start Assessment" when no assessment has been run
 * - Mounts PrepAssessmentRunner inline when student clicks Start
 * - Shows concepts and resources alongside (or after) the assessment
 */

import { useState } from 'react';
import type { PrepDay, PrepDayScore } from '../../types';
import ResourceChip          from './ResourceChip';
import PrepAssessmentRunner  from './PrepAssessmentRunner';

interface TopicCardProps {
  day:         PrepDay;
  company:     string;
  formatNotes: string;
  onComplete:  (result: Omit<PrepDayScore, 'completedAt'>) => void;
}

export default function TopicCard({ day, company, formatNotes, onComplete }: TopicCardProps) {
  const [assessmentOpen, setAssessmentOpen] = useState(false);

  const youtubeLinks  = day.resources.filter(r => r.type === 'youtube');
  const practiceLinks = day.resources.filter(r => r.type === 'practice');
  const otherLinks    = day.resources.filter(r => r.type !== 'youtube' && r.type !== 'practice');

  return (
    <div className="space-y-5">

      {/* ── Topic header ────────────────────────────────────────────── */}
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
                <i className="fas fa-chart-pie mr-1" />{day.topicWeight}% prep weight
              </span>
            )}
            {day.estimatedHours > 0 && (
              <span className="text-xs text-[#8b8ba8]">
                <i className="fas fa-clock mr-1" />~{day.estimatedHours}h today
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Assessment block ─────────────────────────────────────────── */}
      {assessmentOpen ? (
        <div className="bg-[#0a0a0f] border border-[#4f46e5]/30 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold text-[#4f46e5] uppercase tracking-wider">
              <i className="fas fa-bullseye mr-1.5" />Live Assessment
            </p>
            <button
              onClick={() => setAssessmentOpen(false)}
              className="text-xs text-[#4a4a6a] hover:text-[#8b8ba8] transition-colors"
            >
              <i className="fas fa-xmark mr-1" />Close
            </button>
          </div>
          <PrepAssessmentRunner
            company={company}
            topic={day.topic}
            dayNumber={day.dayNumber}
            assessmentConfig={day.assessmentConfig}
            conceptsToMaster={day.conceptsToMaster}
            formatNotes={formatNotes}
            onComplete={(result) => {
              // Bubble score up to usePrepPlan — but do NOT close the runner here.
              // The runner shows its results screen first; onClose fires when
              // the student clicks "Done" inside the results view.
              onComplete(result);
            }}
            onClose={() => setAssessmentOpen(false)}
          />
        </div>
      ) : (
        /* Mission card — shown before assessment is started */
        <div className="bg-[#0a0a0f] border border-[#2a2a3d] rounded-xl p-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#4f46e5]/15 border border-[#4f46e5]/30
              flex items-center justify-center flex-shrink-0">
              <i className="fas fa-bullseye text-[#4f46e5] text-xs" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#4f46e5] uppercase tracking-wider">
                Today's Mission
              </p>
              <p className="text-sm font-semibold text-[#f0f0ff]">
                {day.assessmentConfig.questionType === 'truefalse'
                  ? 'Aptitude True/False Quiz'
                  : 'MCQ Assessment'}
              </p>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: 'Questions', value: day.assessmentConfig.questionCount },
              { label: 'Est. Time',  value: `${day.assessmentConfig.estimatedMinutes}m` },
              { label: 'Difficulty', value: day.assessmentConfig.difficulty },
            ].map(({ label, value }) => (
              <div key={label} className="bg-[#13131a] border border-[#2a2a3d] rounded-xl p-2">
                <p className="text-[10px] text-[#8b8ba8] mb-0.5">{label}</p>
                <p className="text-xs font-bold text-[#f0f0ff] truncate">{value}</p>
              </div>
            ))}
          </div>

          <button
            onClick={() => setAssessmentOpen(true)}
            className="btn-primary w-full py-2.5 text-sm"
          >
            <i className="fas fa-play mr-2" />Start Assessment
          </button>
        </div>
      )}

      {/* ── What to master ───────────────────────────────────────────── */}
      {day.conceptsToMaster.length > 0 && !assessmentOpen && (
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

      {/* ── Resources ────────────────────────────────────────────────── */}
      {!assessmentOpen && day.resources.length > 0 && (
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
      )}

      {!assessmentOpen && day.resources.length === 0 && (
        <p className="text-xs text-[#4a4a6a] italic">
          <i className="fas fa-circle-info mr-1.5" />
          No strong resources found for this topic yet.
        </p>
      )}
    </div>
  );
}
