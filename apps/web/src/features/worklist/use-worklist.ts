import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { claimStudy, listStudies, releaseStudy } from '../../lib/api';
import type { ApiError, WorklistFilters } from '../../lib/api';
import { getRadiologistId } from '../../lib/radiologist';
import { getSocket } from '../../lib/socket';

export function useWorklist(filters: WorklistFilters) {
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);
  const radiologistId = getRadiologistId();

  const query = useQuery({
    queryKey: ['studies', filters],
    queryFn: () => listStudies(filters),
    refetchInterval: 30_000,
  });

  useEffect(() => {
    const socket = getSocket();
    const invalidate = () => {
      void queryClient.invalidateQueries({ queryKey: ['studies'] });
    };
    socket.on('study.event', invalidate);
    return () => {
      socket.off('study.event', invalidate);
    };
  }, [queryClient]);

  const onSettled = () => queryClient.invalidateQueries({ queryKey: ['studies'] });
  const onError = (error: Error) => setActionError((error as ApiError).message);

  const claim = useMutation({
    mutationFn: (studyId: string) => claimStudy(studyId, radiologistId),
    onMutate: () => setActionError(null),
    onError,
    onSettled,
  });

  const release = useMutation({
    mutationFn: (studyId: string) => releaseStudy(studyId, radiologistId),
    onMutate: () => setActionError(null),
    onError,
    onSettled,
  });

  return { query, claim, release, radiologistId, actionError };
}
