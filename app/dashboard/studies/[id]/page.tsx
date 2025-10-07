'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function StudyDetailPage() {
  const router = useRouter();
  const params = useParams();
  const studyId = params?.id as string;

  useEffect(() => {
    if (studyId) {
      router.replace(`/dashboard/studies/${studyId}/review`);
    }
  }, [studyId, router]);

  return null;
}
