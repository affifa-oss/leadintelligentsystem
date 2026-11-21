import React from 'react';
import { Card, Badge } from '../../components/ui';
import { LayoutDashboard, Activity } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-indigo-600" />
            Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Lead Intelligence system overview and real-time operational status.
          </p>
        </div>
        <Badge variant="info" className="self-start sm:self-auto">
          Architecture Ready
        </Badge>
      </div>

      <Card title="System Dashboard Standby" subtitle="Frontend Architecture Initialized">
        <div className="flex items-center gap-4 py-8 justify-center text-center">
          <div>
            <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
              <Activity className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-slate-800 text-sm">API-Ready Architecture</h3>
            <p className="text-xs text-slate-500 max-w-md mt-1">
              Dashboard layout and service integrations are prepared. Full UI components will be built in the next step.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default DashboardPage;
