import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/Tabs';
import GeoAnalyticsTab from './components/tabs/GeoAnalyticsTab';
import P75AnalyticsTab from './components/tabs/P75AnalyticsTab';
import P95AnalyticsTab from './components/tabs/P95AnalyticsTab';
import ComparisonTab from './components/tabs/ComparisonTab';
import AlertsTab from './components/tabs/AlertsTab';
import DateRangePicker from './components/ui/DateRangePicker';
import { useQueryStore } from './store/queryStore';
import { Globe, AlertTriangle, TrendingUp, BarChart3, Bell } from 'lucide-react';

function App() {
  const { dateRange, setDateRange } = useQueryStore();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-cf-orange rounded-lg flex items-center justify-center">
                <Globe className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Cloudflare Analytics</h1>
                <p className="text-sm text-gray-400">Performance Monitoring Dashboard</p>
              </div>
            </div>
            <DateRangePicker value={dateRange} onChange={setDateRange} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <Tabs defaultValue="geo" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-gray-800 border border-gray-700">
            <TabsTrigger value="geo" className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              <span className="hidden sm:inline">地理分布</span>
            </TabsTrigger>
            <TabsTrigger value="p75" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">P75延迟</span>
            </TabsTrigger>
            <TabsTrigger value="p95" className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span className="hidden sm:inline">P95异常</span>
            </TabsTrigger>
            <TabsTrigger value="comparison" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">时序对比</span>
            </TabsTrigger>
            <TabsTrigger value="alerts" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">告警规则</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab Content */}
          <TabsContent value="geo" className="space-y-6">
            <GeoAnalyticsTab />
          </TabsContent>

          <TabsContent value="p75" className="space-y-6">
            <P75AnalyticsTab />
          </TabsContent>

          <TabsContent value="p95" className="space-y-6">
            <P95AnalyticsTab />
          </TabsContent>

          <TabsContent value="comparison" className="space-y-6">
            <ComparisonTab />
          </TabsContent>

          <TabsContent value="alerts" className="space-y-6">
            <AlertsTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

export default App;
