import React from 'react';
import { Card, Badge } from '../../components/ui';
import { Globe } from 'lucide-react';

export const WebsiteAnalysisPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Globe className="w-6 h-6 text-indigo-600" />
            Website Analysis
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Analyze target company websites, detect tech stacks, and evaluate digital maturity.
          </p>
        </div>
        <Badge variant="info">Scraper Service Standby</Badge>
      </div>

      <Card title="Domain Crawler & Analyzer" subtitle="Automated company website audit">
        <p className="text-xs text-slate-500">
          Service function `analyzeWebsite()` is ready to inspect company tech stacks and signals.
        </p>
      </Card>
    </div>
  );
};

export default WebsiteAnalysisPage;
