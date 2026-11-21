import React from 'react';
import { Card, Badge } from '../../components/ui';
import { Users } from 'lucide-react';
import { useLeads } from '../../hooks';

export const LeadsPage: React.FC = () => {
  const { leads, loading } = useLeads();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" />
            Lead Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            View, filter, categorize, and prioritize incoming sales leads.
          </p>
        </div>
        <Badge variant="success">
          {loading ? 'Loading...' : `${leads.length} Mock Leads Loaded`}
        </Badge>
      </div>

      <Card title="Leads Directory Standby" subtitle="Service connected to mock data layer">
        <div className="space-y-3">
          {leads.map((lead) => (
            <div
              key={lead.id}
              className="p-3.5 rounded-lg border border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
            >
              <div>
                <span className="font-semibold text-xs text-slate-900">
                  {lead.firstName} {lead.lastName}
                </span>
                <span className="text-xs text-slate-500 ml-2">({lead.company.name})</span>
                <p className="text-[11px] text-slate-400">{lead.jobTitle} • {lead.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="info" size="sm">
                  Score: {lead.score.total} ({lead.score.grade})
                </Badge>
                <Badge variant="outline" size="sm">
                  {lead.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default LeadsPage;
