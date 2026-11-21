import { useState, useEffect, useCallback } from 'react';
import type { Lead } from '../types';
import { leadService } from '../services';


interface UseLeadsOptions {
  status?: string;
  search?: string;
  autoFetch?: boolean;
}

export function useLeads(options: UseLeadsOptions = {}) {
  const { status, search, autoFetch = true } = options;
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState<boolean>(autoFetch);
  const [error, setError] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await leadService.getLeads({ status, search });
      setLeads(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch leads');
    } finally {
      setLoading(false);
    }
  }, [status, search]);

  useEffect(() => {
    if (autoFetch) {
      fetchLeads();
    }
  }, [autoFetch, fetchLeads]);

  return {
    leads,
    loading,
    error,
    refetch: fetchLeads,
  };
}
