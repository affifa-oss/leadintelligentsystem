import React from 'react';
import { Card, Badge } from '../../components/ui';
import { Target } from 'lucide-react';

export const LeadScoringPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Target className="w-6 h-6 text-indigo-600" />
            Lead Scoring
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Algorithmic scoring models, weights configuration, and qualification rules.
          </p>
        </div>
        <Badge variant="info">Scoring Engine Ready</Badge>
      </div>

      <Card title="Scoring Model Config" subtitle="Firmographic, Behavioral & Buying Intent Scoring">
        <p className="text-xs text-slate-500">
          Scoring service module `calculateLeadScore()` configured and ready.
        </p>
      </Card>
    </div>
  );
};

export default LeadScoringPage;
