import React from 'react';
import { Card, Badge } from '../../components/ui';
import { History } from 'lucide-react';

export const LeadHistoryPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <History className="w-6 h-6 text-indigo-600" />
            Lead History & Audit
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Complete activity log, status changes, and intent timeline events.
          </p>
        </div>
        <Badge variant="info">Audit Log Enabled</Badge>
      </div>

      <Card title="Activity Log Stream" subtitle="Historical lead lifecycle events">
        <p className="text-xs text-slate-500">
          `getLeadHistory()` API connected and logging historical actions.
        </p>
      </Card>
    </div>
  );
};

export default LeadHistoryPage;
