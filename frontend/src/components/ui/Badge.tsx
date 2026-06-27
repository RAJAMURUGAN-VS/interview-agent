import type { Subject } from '../../types/interview';

const iconMap: Record<Subject, string> = {
  'Self Introduction': 'fas fa-user text-blue-400',
  'Generative AI':     'fas fa-brain text-purple-400',
  'Python':            'fab fa-python text-yellow-400',
  'English':           'fas fa-language text-green-400',
  'HTML':              'fab fa-html5 text-orange-400',
  'CSS':               'fab fa-css3-alt text-blue-400',
};

interface BadgeProps {
  subject: Subject;
}

export default function Badge({ subject }: BadgeProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white px-5 py-2 rounded-full font-semibold shadow-lg">
        {subject}
      </span>
      <i className={`${iconMap[subject]} text-2xl`} />
    </div>
  );
}
