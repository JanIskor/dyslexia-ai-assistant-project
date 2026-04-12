import { Suspense } from 'react';
import { StudentDashboard } from '@/components/student/StudentDashboard';

export default function StudentPage() {
  return (
    <Suspense fallback={null}>
      <StudentDashboard />
    </Suspense>
  );
}
