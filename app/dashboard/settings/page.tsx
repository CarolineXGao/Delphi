'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Shield } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6 max-w-3xl">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
            <p className="text-slate-600 mt-1">Manage your account and preferences</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>Your profile and authentication details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4 p-4 bg-slate-50 rounded-lg">
                <User className="h-8 w-8 text-slate-600" />
                <div>
                  <p className="text-sm text-slate-600">User ID</p>
                  <p className="font-mono text-sm">{user?.id}</p>
                </div>
              </div>

              <div className="flex items-center space-x-4 p-4 bg-slate-50 rounded-lg">
                <Mail className="h-8 w-8 text-slate-600" />
                <div>
                  <p className="text-sm text-slate-600">Email</p>
                  <p className="font-semibold">{user?.email}</p>
                </div>
              </div>

              <div className="flex items-center space-x-4 p-4 bg-slate-50 rounded-lg">
                <Shield className="h-8 w-8 text-slate-600" />
                <div>
                  <p className="text-sm text-slate-600">Authentication</p>
                  <Badge variant="outline" className="mt-1">Authenticated</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Microsoft 365 Integration</CardTitle>
              <CardDescription>
                Connect with Microsoft 365 for SharePoint storage and Power Automate
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">Integration Available</h4>
                <p className="text-sm text-blue-800">
                  Microsoft 365 integration will be configured separately. This includes:
                </p>
                <ul className="text-sm text-blue-800 mt-2 space-y-1">
                  <li>• Microsoft Entra ID (Azure AD) for authentication</li>
                  <li>• SharePoint Lists for data storage</li>
                  <li>• OneDrive for document management</li>
                  <li>• Power Automate for workflow automation</li>
                  <li>• Microsoft Graph API for data access</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>About This Platform</CardTitle>
              <CardDescription>Platform information and features</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-700">
              <p>
                <strong>Version:</strong> 1.0.0
              </p>
              <p>
                <strong>Technology Stack:</strong> Next.js 13, TypeScript, Supabase, Tailwind CSS
              </p>
              <p>
                <strong>Features:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Multi-round Delphi studies with customizable settings</li>
                <li>Qualitative proposal submission and AI-assisted clustering</li>
                <li>Quantitative rounds with Likert scale ratings</li>
                <li>Consensus tracking (IQR and Net Agreement methods)</li>
                <li>Participant anonymization with pseudo-IDs</li>
                <li>Real-time analytics and reporting</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
