import React from 'react';
import { useParams } from 'react-router-dom';
import { Card, Badge } from '../../components/ui';
import { UserCheck } from 'lucide-react';


export const LeadDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-indigo-600" />
            Lead Details
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Detailed profile, engagement history, and buying signals for lead ID: {id || 'N/A'}.
          </p>
        </div>
        <Badge variant="info">Lead ID: {id}</Badge>
      </div>

      <Card title="Lead Intelligence Profile" subtitle="Target Lead View Placeholder">
        <p className="text-xs text-slate-500">
          Route `/leads/:id` successfully matched. Detailed lead breakdown view will be rendered here.
        </p>
      </Card>
    </div>
  );
};

export default LeadDetailsPage;
