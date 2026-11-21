import React from 'react';
import { Card, Badge } from '../../components/ui';
import { Clock } from 'lucide-react';

export const FollowUpsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Clock className="w-6 h-6 text-indigo-600" />
            Follow-ups & Tasks
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Scheduled communications, calls, and automated task reminders.
          </p>
        </div>
        <Badge variant="info">Scheduler Ready</Badge>
      </div>

      <Card title="Task Management Standby" subtitle="Follow-up queue and schedule">
        <p className="text-xs text-slate-500">
          `createFollowUp()` and `updateFollowUp()` service APIs ready for integration.
        </p>
      </Card>
    </div>
  );
};

export default FollowUpsPage;
