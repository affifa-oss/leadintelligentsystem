import React from 'react';
import { Card, Badge } from '../../components/ui';
import { Cpu } from 'lucide-react';

export const ServicesPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Cpu className="w-6 h-6 text-indigo-600" />
            Intelligence Services
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure active intelligence micro-services, crawlers, and intent engines.
          </p>
        </div>
        <Badge variant="info">4 Active Services</Badge>
      </div>

      <Card title="Connected Services Registry" subtitle="Backend intelligence capabilities">
        <p className="text-xs text-slate-500">
          `getServices()` service layer integrated with mock services catalog.
        </p>
      </Card>
    </div>
  );
};

export default ServicesPage;
