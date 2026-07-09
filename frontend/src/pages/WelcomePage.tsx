import { useNavigate } from 'react-router-dom';
import { useInterview } from '../hooks/useInterview';
import SubjectSelector from '../components/interview/SubjectSelector';

export default function WelcomePage() {
  const navigate = useNavigate();
  const interview = useInterview();

  const handleSelectSubject = (subject: string) => {
    interview.selectSubject(subject as any);
    // Navigate to interview page with subject slug
    const slug = subject.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    navigate(`/interview/${slug}`);
  };

  const handleSelectDept = (key: any) => {
    interview.handleSelectDepartment(key);
  };

  const handleBackToDepts = () => {
    interview.handleBackToDepts();
  };

  return (
    <div className="animate-fade-in">
      <SubjectSelector
        selectionStep={interview.selectionStep}
        selectedDeptKey={interview.selectedDeptKey}
        onSelectDept={handleSelectDept}
        onSelectSubject={handleSelectSubject}
        onBackToDepts={handleBackToDepts}
      />
    </div>
  );
}
