import type { DepartmentKey } from '../../data/departmentSubjects';
import { getDepartmentByKey } from '../../data/departmentSubjects';
import DepartmentSelector from './DepartmentSelector';
import SubjectGrid from './SubjectGrid';

interface Props {
  selectionStep: 'department' | 'subject';
  selectedDeptKey: DepartmentKey | null;
  onSelectDept: (key: DepartmentKey) => void;
  onSelectSubject: (subject: string) => void;
  onBackToDepts: () => void;
}

export default function SubjectSelector({
  selectionStep,
  selectedDeptKey,
  onSelectDept,
  onSelectSubject,
  onBackToDepts,
}: Props) {
  if (selectionStep === 'department' || !selectedDeptKey) {
    return <DepartmentSelector onSelect={onSelectDept} />;
  }

  const department = getDepartmentByKey(selectedDeptKey);
  if (!department) return null;

  return (
    <SubjectGrid
      department={department}
      onSelect={onSelectSubject}
      onBack={onBackToDepts}
    />
  );
}
