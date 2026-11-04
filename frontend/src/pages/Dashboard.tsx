import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { dashboardService } from '../services/dashboard';
import {
  DollarSign,
  FileText,
  Users,
  Package,
  AlertTriangle,
  Clock,
  ClipboardList,
  Plus,
  ArrowRight,
  CheckCircle2,
  Car,
  Wrench,
  ChevronRight,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, isValid } from 'date-fns';

// Helper function to format quantities cleanly (e.g. 0 instead of 0.000)
const formatQuantity = (qty: any): string => {
  if (qty == null || qty === '') return '0';
  const num = parseFloat(qty);
  if (isNaN(num)) return String(qty);
  if (Number.isInteger(num)) return num.toString();
  return parseFloat(num.toFixed(3)).toString();
};

const getJobCardStatusBadge = (status: string) => {
  switch (status) {
    case 'IN_PROGRESS':
      return {
        bg: 'bg-amber-100 dark:bg-amber-950/40',
        text: 'text-amber-800 dark:text-amber-300',
        border: 'border-amber-300 dark:border-amber-800',
        label: 'In Progress'
      };
    case 'COMPLETED':
      return {
        bg: 'bg-emerald-100 dark:bg-emerald-950/40',
        text: 'text-emerald-800 dark:text-emerald-300',
        border: 'border-emerald-300 dark:border-emerald-800',
        label: 'Completed'
      };
    case 'INVOICED':
      return {
        bg: 'bg-blue-100 dark:bg-blue-950/40',
        text: 'text-blue-800 dark:text-blue-300',
        border: 'border-blue-300 dark:border-blue-800',
        label: 'Invoiced'
      };
    case 'ESTIMATED':
      return {
        bg: 'bg-purple-100 dark:bg-purple-950/40',
        text: 'text-purple-800 dark:text-purple-300',
        border: 'border-purple-300 dark:border-purple-800',
        label: 'Estimated'
      };
    case 'OPEN':
    default:
      return {
        bg: 'bg-sky-100 dark:bg-sky-950/40',
        text: 'text-sky-800 dark:text-sky-300',
        border: 'border-sky-300 dark:border-sky-800',
        label: 'Intake / Open'
      };
  }
};

const getPriorityBadgeClass = (priority: string) => {
  switch (priority) {
    case 'URGENT':
      return 'bg-red-500/10 text-red-500 border-red-500/30';
    case 'HIGH':
      return 'bg-amber-500/10 text-amber-500 border-amber-500/30';
    case 'LOW':
      return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    case 'NORMAL':
    default:
      return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
  }
};

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [period, setPeriod] = useState('month');

  // Safe date formatting helper
  const safeFormatDate = (dateString: string | null | undefined, formatString: string = 'MMM dd, yyyy'): string => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return isValid(date) ? format(date, formatString) : 'N/A';
  };

  const { data: dashboardData, isLoading } = useQuery(
    ['dashboard', period],
    () => dashboardService.getDashboardData(period),
    {
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  const { data: statistics } = useQuery(
    ['statistics', period],
    () => dashboardService.getStatistics(period, 'revenue'),
    {
      enabled: user?.role === 'MANAGER',
    }
  );

  const getRoleBasedContent = () => {
    if (!dashboardData) return null;

    const { data } = dashboardData;

    if (user?.role === 'CUSTOMER') {
      return (
        <div className="space-y-6">
          {/* Customer Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card p-6 border border-gray-200 dark:border-slate-800">
              <div className="flex items-center">
                <div className="p-3 bg-primary-50 dark:bg-primary-950/40 rounded-xl text-primary-600 dark:text-primary-400">
                  <ClipboardList className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Active Job Cards</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{data.activeJobCardsCount || 0}</p>
                </div>
              </div>
            </div>
            <div className="card p-6 border border-gray-200 dark:border-slate-800">
              <div className="flex items-center">
                <div className="p-3 bg-green-50 dark:bg-green-950/40 rounded-xl text-green-600 dark:text-green-400">
                  <DollarSign className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Total Spent</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                    ₹{(data.totalSpent || 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            <div className="card p-6 border border-gray-200 dark:border-slate-800">
              <div className="flex items-center">
                <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl text-blue-600 dark:text-blue-400">
                  <FileText className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Total Bills</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{data.billCount || 0}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Job Cards */}
          {data.jobCards && data.jobCards.length > 0 && (
            <div className="card border border-gray-200 dark:border-slate-800 bg-white dark:bg-[#0c101c]">
              <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Car className="h-5 w-5 text-primary-500" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">My Vehicle Service Cards</h3>
                </div>
                <Link to="/job-cards" className="text-xs text-primary-600 dark:text-primary-400 hover:underline font-medium">
                  View All
                </Link>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {data.jobCards.map((jc: any) => {
                    const statusBadge = getJobCardStatusBadge(jc.status);
                    return (
                      <Link
                        key={jc.id}
                        to={`/job-cards/${jc.id}`}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50/80 dark:bg-slate-900/50 hover:bg-gray-100 dark:hover:bg-slate-800/80 border border-gray-100 dark:border-slate-800/80 rounded-xl transition-colors block gap-3"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-gray-900 dark:text-slate-100">{jc.job_card_number}</span>
                            {jc.license_plate && (
                              <span className="text-xs px-2 py-0.5 rounded bg-gray-200 dark:bg-slate-800 text-gray-700 dark:text-slate-300 font-mono">
                                {jc.license_plate}
                              </span>
                            )}
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border}`}>
                              {statusBadge.label}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                            {jc.vehicle_make} {jc.vehicle_model} • Intake: {safeFormatDate(jc.created_at)}
                          </p>
                        </div>
                        <div className="sm:text-right">
                          <p className="font-bold text-gray-900 dark:text-slate-100">₹{(jc.actual_amount || jc.estimated_amount || 0).toLocaleString()}</p>
                          <span className="text-xs text-primary-600 dark:text-primary-400 font-medium inline-flex items-center gap-1">
                            Track Status <ChevronRight className="h-3 w-3" />
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Recent Bills */}
          <div className="card border border-gray-200 dark:border-slate-800">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Recent Bills</h3>
              <Link to="/bills" className="text-xs text-primary-600 dark:text-primary-400 hover:underline font-medium">
                View All
              </Link>
            </div>
            <div className="p-6">
              {data.recentBills && data.recentBills.length > 0 ? (
                <div className="space-y-3">
                  {data.recentBills.map((bill: any) => (
                    <Link
                      key={bill.id}
                      to={`/bills/${bill.id}`}
                      className="flex items-center justify-between p-4 bg-gray-50/80 dark:bg-slate-900/50 hover:bg-gray-100 dark:hover:bg-slate-800/80 border border-gray-100 dark:border-slate-800/80 rounded-xl transition-colors block"
                    >
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-slate-100">{bill.bill_number}</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                          {safeFormatDate(bill.service_date)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900 dark:text-slate-100">₹{(bill.total_amount || 0).toLocaleString()}</p>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold mt-1 ${
                          bill.payment_status === 'PAID'
                            ? 'bg-green-100 dark:bg-green-950/40 text-green-800 dark:text-green-300'
                            : bill.payment_status === 'PARTIAL'
                            ? 'bg-yellow-100 dark:bg-yellow-950/40 text-yellow-800 dark:text-yellow-300'
                            : 'bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-300'
                        }`}>
                          {bill.payment_status}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-slate-400 text-center py-8">No recent bills found</p>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (user?.role === 'TECHNICIAN') {
      return (
        <div className="space-y-6">
          {/* Quick Actions Bar for Technician */}
          <div className="card p-4 bg-gradient-to-r from-slate-900/90 to-slate-800/90 border border-slate-700/60 shadow-md">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs uppercase tracking-wider font-bold text-slate-400">Technician Workspace:</span>
              <div className="flex items-center gap-2.5">
                <Link
                  to="/job-cards"
                  className="btn btn-primary flex items-center gap-2 text-xs py-2 px-3.5 shadow-sm"
                >
                  <ClipboardList className="h-4 w-4" />
                  My Job Cards ({data.activeJobCardsCount || 0} Active)
                </Link>
                <Link
                  to="/job-cards/new"
                  className="btn btn-secondary flex items-center gap-2 text-xs py-2 px-3.5 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
                >
                  <Plus className="h-4 w-4" />
                  New Job Card
                </Link>
              </div>
            </div>
          </div>

          {/* Technician Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card p-6 border border-gray-200 dark:border-slate-800">
              <div className="flex items-center">
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl text-amber-600 dark:text-amber-400">
                  <ClipboardList className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Active Job Cards</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{data.activeJobCardsCount || 0}</p>
                </div>
              </div>
            </div>
            <div className="card p-6 border border-gray-200 dark:border-slate-800">
              <div className="flex items-center">
                <div className="p-3 bg-primary-50 dark:bg-primary-950/40 rounded-xl text-primary-600 dark:text-primary-400">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Jobs Completed</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{data.completedJobCardsCount || data.billCount || 0}</p>
                </div>
              </div>
            </div>
            <div className="card p-6 border border-gray-200 dark:border-slate-800">
              <div className="flex items-center">
                <div className="p-3 bg-green-50 dark:bg-green-950/40 rounded-xl text-green-600 dark:text-green-400">
                  <DollarSign className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Revenue Generated</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                    ₹{(data.technicianRevenue || 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Technician Assigned Job Cards Queue */}
          <div className="card border border-gray-200 dark:border-slate-800 bg-white dark:bg-[#0c101c]">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-amber-500" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">My Assigned Job Cards</h3>
              </div>
              <Link to="/job-cards" className="text-xs text-primary-600 dark:text-primary-400 hover:underline font-medium">
                View All Job Cards
              </Link>
            </div>
            <div className="p-6">
              {data.jobCards && data.jobCards.length > 0 ? (
                <div className="space-y-3">
                  {data.jobCards.map((jc: any) => {
                    const statusBadge = getJobCardStatusBadge(jc.status);
                    return (
                      <Link
                        key={jc.id}
                        to={`/job-cards/${jc.id}`}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50/80 dark:bg-slate-900/50 hover:bg-gray-100 dark:hover:bg-slate-800/80 border border-gray-100 dark:border-slate-800/80 rounded-xl transition-colors block gap-3"
                      >
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-gray-900 dark:text-slate-100">{jc.job_card_number}</span>
                            {jc.license_plate && (
                              <span className="text-xs px-2 py-0.5 rounded bg-gray-200 dark:bg-slate-800 text-gray-700 dark:text-slate-300 font-mono">
                                {jc.license_plate}
                              </span>
                            )}
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border}`}>
                              {statusBadge.label}
                            </span>
                            {jc.priority && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${getPriorityBadgeClass(jc.priority)}`}>
                                {jc.priority}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 dark:text-slate-300 mt-1">
                            Customer: <span className="font-semibold">{jc.customer_name}</span> ({jc.vehicle_make} {jc.vehicle_model})
                          </p>
                          {jc.customer_complaints && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1 italic">
                              "{jc.customer_complaints}"
                            </p>
                          )}
                        </div>
                        <div className="sm:text-right shrink-0">
                          <p className="font-bold text-gray-900 dark:text-slate-100 text-sm">
                            ₹{(jc.actual_amount || jc.estimated_amount || 0).toLocaleString()}
                          </p>
                          <span className="text-xs text-primary-600 dark:text-primary-400 font-semibold inline-flex items-center gap-1 mt-1">
                            Open Job Card <ChevronRight className="h-3 w-3" />
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs">No active job cards currently assigned to you</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Bills */}
          <div className="card border border-gray-200 dark:border-slate-800">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Recent Completed Invoices</h3>
              <Link to="/bills" className="text-xs text-primary-600 dark:text-primary-400 hover:underline font-medium">
                View All
              </Link>
            </div>
            <div className="p-6">
              {data.recentBills && data.recentBills.length > 0 ? (
                <div className="space-y-3">
                  {data.recentBills.map((bill: any) => (
                    <Link
                      key={bill.id}
                      to={`/bills/${bill.id}`}
                      className="flex items-center justify-between p-4 bg-gray-50/80 dark:bg-slate-900/50 hover:bg-gray-100 dark:hover:bg-slate-800/80 border border-gray-100 dark:border-slate-800/80 rounded-xl transition-colors block"
                    >
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-slate-100">{bill.bill_number}</p>
                        <p className="text-sm text-gray-600 dark:text-slate-300 mt-0.5">{bill.customer_name}</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">
                          {safeFormatDate(bill.service_date)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900 dark:text-slate-100">₹{(bill.total_amount || 0).toLocaleString()}</p>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold mt-1 ${
                          bill.status === 'COMPLETED'
                            ? 'bg-green-100 dark:bg-green-950/40 text-green-800 dark:text-green-300'
                            : bill.status === 'PENDING'
                            ? 'bg-yellow-100 dark:bg-yellow-950/40 text-yellow-800 dark:text-yellow-300'
                            : 'bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300'
                        }`}>
                          {bill.status}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-slate-400 text-center py-8">No recent jobs found</p>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (user?.role === 'MANAGER') {
      return (
        <div className="space-y-6">
          {/* Quick Actions Bar */}
          <div className="card p-4 bg-gradient-to-r from-slate-900/90 to-slate-800/90 border border-slate-700/60 shadow-md">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider font-bold text-slate-400">Quick Actions:</span>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <Link
                  to="/job-cards/new"
                  className="btn btn-primary flex items-center gap-2 text-xs py-2 px-3.5 shadow-sm"
                >
                  <ClipboardList className="h-4 w-4" />
                  + New Job Card
                </Link>
                <Link
                  to="/bills/new"
                  className="btn btn-secondary flex items-center gap-2 text-xs py-2 px-3.5 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <FileText className="h-4 w-4" />
                  + New Bill
                </Link>
                <Link
                  to="/customers/new"
                  className="btn btn-secondary flex items-center gap-2 text-xs py-2 px-3.5 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <Users className="h-4 w-4" />
                  + Add Customer
                </Link>
                <Link
                  to="/spare-parts/new"
                  className="btn btn-secondary flex items-center gap-2 text-xs py-2 px-3.5 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <Package className="h-4 w-4" />
                  + Add Part
                </Link>
              </div>
            </div>
          </div>

          {/* Manager Stats Grid: 5 Core Garage Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Active Job Cards KPI */}
            <Link
              to="/job-cards"
              className="card p-5 border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-transparent hover:border-amber-500/60 transition-all block group"
            >
              <div className="flex items-center justify-between">
                <div className="p-2.5 bg-amber-500/20 text-amber-500 rounded-xl">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <span className="text-[11px] font-bold text-amber-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                  View <ChevronRight className="h-3 w-3" />
                </span>
              </div>
              <div className="mt-3">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active Job Cards</p>
                <p className="text-2xl font-extrabold text-gray-900 dark:text-slate-100 mt-0.5">
                  {data.activeJobCardsCount || 0}
                </p>
                <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 font-medium">
                  {data.inProgressJobCardsCount || 0} in progress • {data.readyOrEstimatedJobCardsCount || 0} intake
                </p>
              </div>
            </Link>

            {/* Total Revenue */}
            <div className="card p-5 border border-gray-200 dark:border-slate-800 dark:bg-slate-850">
              <div className="flex items-center">
                <div className="p-2.5 bg-green-50 dark:bg-green-950/40 rounded-xl text-green-600 dark:text-green-400">
                  <DollarSign className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Revenue</p>
                <p className="text-2xl font-extrabold text-gray-900 dark:text-slate-100 mt-0.5">
                  ₹{(data.managerRevenue || 0).toLocaleString()}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">This {period}</p>
              </div>
            </div>

            {/* Total Bills */}
            <Link
              to="/bills"
              className="card p-5 border border-gray-200 dark:border-slate-800 dark:bg-slate-850 hover:border-slate-700 transition-colors block"
            >
              <div className="flex items-center justify-between">
                <div className="p-2.5 bg-primary-50 dark:bg-primary-950/40 rounded-xl text-primary-600 dark:text-primary-400">
                  <FileText className="h-5 w-5" />
                </div>
                <span className="text-[11px] text-slate-400 font-medium">All Bills</span>
              </div>
              <div className="mt-3">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Bills</p>
                <p className="text-2xl font-extrabold text-gray-900 dark:text-slate-100 mt-0.5">
                  {data.totalBills || 0}
                </p>
                <p className="text-[11px] text-orange-500 font-medium mt-1">
                  {data.pendingBills || 0} pending payment
                </p>
              </div>
            </Link>

            {/* Customers */}
            <Link
              to="/customers"
              className="card p-5 border border-gray-200 dark:border-slate-800 dark:bg-slate-850 hover:border-slate-700 transition-colors block"
            >
              <div className="flex items-center justify-between">
                <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 rounded-xl text-blue-600 dark:text-blue-400">
                  <Users className="h-5 w-5" />
                </div>
                <span className="text-[11px] text-slate-400 font-medium">Directory</span>
              </div>
              <div className="mt-3">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Registered Clients</p>
                <p className="text-2xl font-extrabold text-gray-900 dark:text-slate-100 mt-0.5">
                  {data.totalCustomers || 0}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">Vehicle owners</p>
              </div>
            </Link>

            {/* Spare Parts */}
            <Link
              to="/spare-parts"
              className="card p-5 border border-gray-200 dark:border-slate-800 dark:bg-slate-850 hover:border-slate-700 transition-colors block"
            >
              <div className="flex items-center justify-between">
                <div className="p-2.5 bg-purple-50 dark:bg-purple-950/40 rounded-xl text-purple-600 dark:text-purple-400">
                  <Package className="h-5 w-5" />
                </div>
                <span className="text-[11px] text-slate-400 font-medium">Inventory</span>
              </div>
              <div className="mt-3">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Parts in Stock</p>
                <p className="text-2xl font-extrabold text-gray-900 dark:text-slate-100 mt-0.5">
                  {data.totalSpareParts || 0}
                </p>
                <p className="text-[11px] text-red-500 font-medium mt-1">
                  {data.lowStockItems?.length || 0} low stock alerts
                </p>
              </div>
            </Link>
          </div>

          {/* DEDICATED JOB CARDS WORKFLOW OVERVIEW SECTION */}
          <div className="card border border-gray-200 dark:border-slate-800 dark:bg-slate-850 overflow-hidden shadow-xs">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                    Active Workshop Job Cards
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
                      {data.activeJobCardsCount || 0} In Garage
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Live workshop bay tracking, intake inspections, and active vehicle repairs
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <Link
                  to="/job-cards/new"
                  className="btn btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 shadow-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  New Job Card
                </Link>
                <Link
                  to="/job-cards"
                  className="btn btn-secondary text-xs py-1.5 px-3 dark:bg-slate-800 dark:border-slate-700"
                >
                  View All ({data.totalJobCards || 0})
                </Link>
              </div>
            </div>

            {/* Quick Status Sub-Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-gray-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/20 text-xs">
              <div className="p-3 text-center border-r border-gray-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Intake / Open</span>
                <span className="font-extrabold text-sky-500 text-sm">{data.readyOrEstimatedJobCardsCount || 0}</span>
              </div>
              <div className="p-3 text-center border-r border-gray-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 block text-[11px]">In Progress</span>
                <span className="font-extrabold text-amber-500 text-sm">{data.inProgressJobCardsCount || 0}</span>
              </div>
              <div className="p-3 text-center border-r border-gray-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Completed & Ready</span>
                <span className="font-extrabold text-emerald-500 text-sm">{data.completedJobCardsCount || 0}</span>
              </div>
              <div className="p-3 text-center">
                <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Total Recorded</span>
                <span className="font-extrabold text-slate-700 dark:text-slate-300 text-sm">{data.totalJobCards || 0}</span>
              </div>
            </div>

            {/* Recent Job Cards List */}
            <div className="p-6">
              {data.recentJobCards && data.recentJobCards.length > 0 ? (
                <div className="space-y-3">
                  {data.recentJobCards.map((jc: any) => {
                    const statusBadge = getJobCardStatusBadge(jc.status);
                    return (
                      <div
                        key={jc.id}
                        className="flex flex-col lg:flex-row lg:items-center justify-between p-4 bg-gray-50/70 dark:bg-slate-900/40 hover:bg-slate-100/70 dark:hover:bg-slate-900/70 border border-gray-200/80 dark:border-slate-800 rounded-xl transition-colors gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <Link
                              to={`/job-cards/${jc.id}`}
                              className="font-mono font-bold text-sm text-primary-600 dark:text-primary-400 hover:underline"
                            >
                              {jc.job_card_number}
                            </Link>

                            {jc.license_plate && (
                              <span className="text-xs px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-semibold">
                                {jc.license_plate}
                              </span>
                            )}

                            <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border}`}>
                              {statusBadge.label}
                            </span>

                            {jc.priority && (
                              <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${getPriorityBadgeClass(jc.priority)}`}>
                                {jc.priority}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300 flex-wrap">
                            <span>
                              Client: <strong className="text-gray-900 dark:text-slate-100">{jc.customer_name || 'Walk-in'}</strong>
                              {jc.customer_phone && <span className="text-slate-400"> ({jc.customer_phone})</span>}
                            </span>
                            <span>•</span>
                            <span>Vehicle: <strong className="text-gray-900 dark:text-slate-100">{jc.vehicle_make} {jc.vehicle_model}</strong></span>
                            <span>•</span>
                            <span className="text-slate-500 dark:text-slate-400">
                              Created: {safeFormatDate(jc.created_at)}
                            </span>
                          </div>

                          {jc.customer_complaints && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 italic line-clamp-1">
                              Complaints: "{jc.customer_complaints}"
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between lg:justify-end gap-5 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-gray-100 dark:border-slate-800">
                          <div className="text-right">
                            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block">Total Est / Actual</span>
                            <span className="text-sm font-extrabold text-gray-900 dark:text-slate-100">
                              ₹{(jc.actual_amount || jc.estimated_amount || 0).toLocaleString()}
                            </span>
                          </div>

                          <Link
                            to={`/job-cards/${jc.id}`}
                            className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1 dark:bg-slate-800 dark:border-slate-700"
                          >
                            Open Details <ArrowRight className="h-3 w-3" />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10 text-slate-400">
                  <ClipboardList className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-semibold">No Job Cards Registered Yet</p>
                  <p className="text-xs text-slate-500 mt-1">Start intake for incoming vehicles by creating a Job Card</p>
                  <Link
                    to="/job-cards/new"
                    className="btn btn-primary text-xs mt-3 inline-flex items-center gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Create First Job Card
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Alerts & Operational Status */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card border border-gray-200 dark:border-slate-800 dark:bg-slate-850">
              <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Low Stock Alert</h3>
                </div>
                <Link to="/spare-parts" className="text-xs text-primary-600 dark:text-primary-400 hover:underline font-medium">
                  Manage Inventory
                </Link>
              </div>
              <div className="p-6">
                {data.lowStockItems && data.lowStockItems.length > 0 ? (
                  <div className="space-y-3">
                    {data.lowStockItems.slice(0, 5).map((item: any) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3.5 bg-red-50/70 dark:bg-red-950/20 border border-red-200/80 dark:border-red-900/40 rounded-xl"
                      >
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-slate-100">{item.name}</p>
                          <p className="text-xs font-mono text-gray-500 dark:text-slate-400">{item.partNumber || 'No Part #'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-red-600 dark:text-red-400">{formatQuantity(item.stock)} left</p>
                          <p className="text-xs text-gray-500 dark:text-slate-400">Min: {formatQuantity(item.minStock)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2 py-8 text-green-600 dark:text-green-400">
                    <CheckCircle2 className="h-5 w-5" />
                    <p className="text-sm font-medium">All items are well stocked</p>
                  </div>
                )}
              </div>
            </div>

            <div className="card border border-gray-200 dark:border-slate-800 dark:bg-slate-850">
              <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-orange-500" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Pending Bills</h3>
                </div>
                <Link to="/bills" className="text-xs text-primary-600 dark:text-primary-400 hover:underline font-medium">
                  View All Bills
                </Link>
              </div>
              <div className="p-6">
                <div className="text-center py-4">
                  <div className="text-4xl font-extrabold text-orange-600 dark:text-orange-400">{data.pendingBills || 0}</div>
                  <p className="text-sm text-gray-500 dark:text-slate-400 mt-2 font-medium">Bills pending completion or payment</p>
                  <Link
                    to="/bills"
                    className="inline-flex items-center gap-1.5 text-xs text-primary-600 dark:text-primary-400 font-semibold mt-4 hover:underline"
                  >
                    Open Billing Queue <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Revenue Chart */}
          {statistics && (
            <div className="card border border-gray-200 dark:border-slate-800 dark:bg-slate-850">
              <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Revenue Trend</h3>
              </div>
              <div className="p-6">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={statistics.statistics.labels.map((label: string, index: number) => ({
                    date: label,
                    revenue: statistics.statistics.revenue[index] || 0,
                    bills: statistics.statistics.billCount[index] || 0,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                    <XAxis dataKey="date" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', color: '#f8fafc' }}
                      formatter={(value: any, name: string) => [
                        name === 'revenue' ? `₹${(value || 0).toLocaleString()}` : value,
                        name === 'revenue' ? 'Revenue' : 'Bills'
                      ]}
                    />
                    <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Recent Bills */}
          <div className="card border border-gray-200 dark:border-slate-800 dark:bg-slate-850">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Recent Bills</h3>
              <Link to="/bills" className="text-xs text-primary-600 dark:text-primary-400 hover:underline font-medium">
                View All Bills
              </Link>
            </div>
            <div className="p-6">
              {data.managerRecentBills && data.managerRecentBills.length > 0 ? (
                <div className="space-y-3">
                  {data.managerRecentBills.map((bill: any) => (
                    <Link
                      key={bill.id}
                      to={`/bills/${bill.id}`}
                      className="flex items-center justify-between p-4 bg-gray-50/80 dark:bg-slate-900/50 hover:bg-gray-100 dark:hover:bg-slate-800/80 border border-gray-100 dark:border-slate-800/80 rounded-xl transition-colors block"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900 dark:text-slate-100">{bill.bill_number}</p>
                          {bill.vehicle_number && (
                            <span className="text-xs px-2 py-0.5 rounded bg-gray-200 dark:bg-slate-800 text-gray-700 dark:text-slate-300 font-mono">
                              {bill.vehicle_number}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-slate-300 mt-0.5">{bill.customer_name || 'Walk-in Customer'}</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">
                          {safeFormatDate(bill.service_date)}
                          {bill.technician_name && ` • Tech: ${bill.technician?.name || bill.technician_name}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900 dark:text-slate-100 text-base">₹{(bill.total_amount || 0).toLocaleString()}</p>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold mt-1 ${
                          bill.payment_status === 'PAID'
                            ? 'bg-green-100 dark:bg-green-950/40 text-green-800 dark:text-green-300'
                            : bill.payment_status === 'PARTIAL'
                            ? 'bg-yellow-100 dark:bg-yellow-950/40 text-yellow-800 dark:text-yellow-300'
                            : 'bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-300'
                        }`}>
                          {bill.payment_status || 'PENDING'}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-slate-400 text-center py-8">No recent bills found</p>
              )}
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Dashboard</h1>
            <p className="text-gray-600 dark:text-slate-400 mt-0.5">
              Welcome back, {user?.name}! Here's what's happening with your garage.
            </p>
          </div>
          {user?.role === 'MANAGER' && (
            <div className="p-1 bg-gray-100 dark:bg-slate-900/90 rounded-xl border border-gray-200 dark:border-slate-800 flex items-center gap-1 self-start sm:self-auto">
              {['day', 'week', 'month', 'year'].map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    period === p
                      ? 'bg-primary-600 text-white shadow-xs font-semibold'
                      : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 hover:bg-gray-200/60 dark:hover:bg-slate-800'
                  }`}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {getRoleBasedContent()}
    </div>
  );
};

export default Dashboard;
