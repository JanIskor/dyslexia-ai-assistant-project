import { Suspense } from 'react';
import { TeacherDashboard } from '@/components/teacher/TeacherDashboard';

export default function TeacherPage() {
  return (
    <Suspense fallback={null}>
      <TeacherDashboard />
    </Suspense>
  );
}
