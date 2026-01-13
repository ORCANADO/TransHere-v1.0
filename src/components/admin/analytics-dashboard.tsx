'use client';

import { useState, useEffect, useCallback } from 'react';
import { Eye, MousePointer, Percent, Globe, RefreshCw, Calendar } from 'lucide-react';
import { StatCard } from './stat-card';
import { AnalyticsChart } from './analytics-chart';
import { ModelAnalyticsCard } from './model-analytics-card';
import { DatePicker } from '@/components/ui/date-picker';
import type { DashboardData, TimePeriod } from '@/types/analytics';

interface AnalyticsDashboardProps {
  adminKey: string;
}

const TIME_PERIODS: { value: TimePeriod; label: string }[] = [
  { value: 'hour', label: 'Last Hour' },
  { value: 'today', label: 'Today' },
  { value: '7days', label: 'Last 7 Days' },
  { value: '30days', label: 'Last 30 Days' },
  { value: '90days', label: 'Last 90 Days' },
  { value: 'all', label: 'All Time' },
  { value: 'custom', label: 'Custom Range' },
];

export function AnalyticsDashboard({ adminKey }: AnalyticsDashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<TimePeriod>('7days');
  const [country, setCountry] = useState<string>('all');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        key: adminKey,
        period,
        ...(country !== 'all' && { country }),
        ...(period === 'custom' && startDate && { startDate }),
        ...(period === 'custom' && endDate && { endDate }),
      });
      
      const res = await fetch(`/api/admin/dashboard?${params}`);
      const json = await res.json();
      
      if (!res.ok) {
        throw new Error(json.error || 'Failed to fetch analytics');
      }
      
      setData(json);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [adminKey, period, country, startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-400 mb-4">Error: {error}</p>
        <button 
          onClick={fetchData}
          className="px-4 py-2 bg-[#7A27FF] text-white rounded-lg hover:bg-[#7A27FF]/80 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics Dashboard</h1>
          {lastUpdated && (
            <p className="text-muted-foreground text-sm">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
        
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-3">
            {/* Time Period Filter */}
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as TimePeriod)}
                className="pl-10 pr-4 py-2 bg-card border border-white/10 rounded-lg text-white text-sm appearance-none cursor-pointer hover:border-white/20 transition-colors min-w-[150px]"
              >
                {TIME_PERIODS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            
            {/* Custom Date Range */}
            {period === 'custom' && (
              <>
                <DatePicker
                  value={startDate}
                  onChange={setStartDate}
                  placeholder="Start date"
                  max={endDate || undefined}
                  className="min-w-[150px]"
                />
                <DatePicker
                  value={endDate}
                  onChange={setEndDate}
                  placeholder="End date"
                  min={startDate || undefined}
                  className="min-w-[150px]"
                />
              </>
            )}
            
            {/* Country Filter */}
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="pl-10 pr-4 py-2 bg-card border border-white/10 rounded-lg text-white text-sm appearance-none cursor-pointer hover:border-white/20 transition-colors min-w-[150px]"
              >
                <option value="all">All Countries</option>
                {data?.availableCountries.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            
            {/* Refresh Button */}
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2 bg-card border border-white/10 rounded-lg text-white hover:border-white/20 transition-colors disabled:opacity-50"
              aria-label="Refresh data"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          
          {/* Custom date range validation message */}
          {period === 'custom' && (!startDate || !endDate) && (
            <p className="text-sm text-yellow-400">
              Please select both start and end dates
            </p>
          )}
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && !data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card border border-white/10 rounded-xl p-6 animate-pulse">
              <div className="h-4 bg-white/10 rounded w-20 mb-2" />
              <div className="h-8 bg-white/10 rounded w-24" />
            </div>
          ))}
        </div>
      )}

      {/* Dashboard content */}
      {data && (
        <>
          {/* Overview Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Page Views"
              value={data.overview.totalVisits}
              icon={<Eye className="w-5 h-5 text-[#7A27FF]" />}
              change={data.overview.visitsChange}
            />
            <StatCard
              title="Total Clicks"
              value={data.overview.totalClicks}
              subtitle="OnlyFans/Fansly redirects"
              icon={<MousePointer className="w-5 h-5 text-[#00FF85]" />}
              change={data.overview.clicksChange}
            />
            <StatCard
              title="Conversion Rate"
              value={`${data.overview.conversionRate.toFixed(2)}%`}
              subtitle="Clicks / Views"
              icon={<Percent className="w-5 h-5 text-[#D4AF37]" />}
            />
            <StatCard
              title="Countries"
              value={data.overview.uniqueCountries}
              subtitle="Unique visitor locations"
              icon={<Globe className="w-5 h-5 text-white" />}
            />
          </div>

          {/* Chart */}
          <AnalyticsChart 
            data={data.chartData} 
            title="Traffic Over Time" 
          />

          {/* Country Breakdown */}
          {data.countryBreakdown.length > 0 && (
            <div className="bg-card border border-white/10 rounded-xl p-4 lg:p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Top Countries</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {data.countryBreakdown.slice(0, 10).map(({ country, visits, clicks }) => (
                  <div 
                    key={country}
                    className="p-3 bg-white/5 rounded-lg"
                  >
                    <p className="font-medium text-white">{country}</p>
                    <div className="flex justify-between mt-1 text-sm">
                      <span className="text-[#7A27FF]">{visits} views</span>
                      <span className="text-[#00FF85]">{clicks} clicks</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Model Analytics */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">
              Model Performance ({data.modelAnalytics.length} models)
            </h3>
            <div className="space-y-3">
              {data.modelAnalytics.map((model) => (
                <ModelAnalyticsCard key={model.modelSlug} model={model} />
              ))}
              
              {data.modelAnalytics.length === 0 && (
                <div className="bg-card border border-white/10 rounded-xl p-8 text-center">
                  <p className="text-muted-foreground">
                    No model-specific data for this period
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
