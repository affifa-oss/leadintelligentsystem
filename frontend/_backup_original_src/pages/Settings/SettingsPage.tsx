import React from 'react';
import { Card, Badge } from '../../components/ui';
import { Settings } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Settings className="w-6 h-6 text-indigo-600" />
            System Settings
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            API key configuration, team permissions, integrations, and webhooks.
          </p>
        </div>
        <Badge variant="outline">Configuration</Badge>
      </div>

      <Card title="System Configuration" subtitle="System preferences & integrations">
        <p className="text-xs text-slate-500">
          Environment configuration and API endpoint hooks prepared.
        </p>
      </Card>
    </div>
  );
};

export default SettingsPage;
