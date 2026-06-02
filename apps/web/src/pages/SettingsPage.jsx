import React from 'react';
import { Helmet } from 'react-helmet';
import { Mail, Settings, Shield, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useCompany } from '@/hooks/useCompany.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const SettingsPage = () => {
  const { currentUser } = useAuth();
  const { companyLabel } = useCompany();

  return (
    <>
      <Helmet><title>Settings - {companyLabel}</title></Helmet>

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage account and workspace details for {companyLabel}</p>
        </div>

        <Card className="shadow-sm border-none ring-1 ring-slate-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Settings className="h-5 w-5 text-primary" />
              Account Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <User className="h-4 w-4 text-primary" />
                Name
              </div>
              <p className="mt-2 text-sm text-slate-600">{currentUser?.name || 'Administrator'}</p>
            </div>

            <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Mail className="h-4 w-4 text-primary" />
                Email
              </div>
              <p className="mt-2 text-sm text-slate-600">{currentUser?.email || 'Not set'}</p>
            </div>

            <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Shield className="h-4 w-4 text-primary" />
                Role
              </div>
              <Badge className="mt-2 bg-emerald-100 text-emerald-700 border-none capitalize">
                {currentUser?.role || 'admin'}
              </Badge>
            </div>

            <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Settings className="h-4 w-4 text-primary" />
                Workspace
              </div>
              <p className="mt-2 text-sm text-slate-600">{companyLabel}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default SettingsPage;
