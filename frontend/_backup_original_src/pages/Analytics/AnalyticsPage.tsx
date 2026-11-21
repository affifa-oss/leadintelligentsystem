import React from 'react';
import { Card, Badge } from '../../components/ui';
import { BarChart3 } from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-600" />
            Analytics & Reports
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Conversion metrics, intent trends, pipeline performance, and lead velocity.
          </p>
        </div>
        <Badge variant="info">Recharts Prepared</Badge>
      </div>

      <Card title="Intelligence Reporting" subtitle="Pipeline performance & score distributions">
        <p className="text-xs text-slate-500">
          Recharts integration configured for visual data reporting.
        </p>
      </Card>
    </div>
  );
};

export default AnalyticsPage;
