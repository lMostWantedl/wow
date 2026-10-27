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
  TrendingUp,
  AlertTriangle,
  Calendar,
  Clock,
  ClipboardList,
  Plus,
  ArrowRight,
  CheckCircle2,
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
                  <FileText className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Total Bills</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{data.billCount || 0}</p>
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
                  <Calendar className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500 dark:text-slate-400">This {period}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{data.billCount || 0} bills</p>
                </div>
              </div>
            </div>
          </div>

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
                  My Job Cards
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
                <div className="p-3 bg-primary-50 dark:bg-primary-950/40 rounded-xl text-primary-600 dark:text-primary-400">
                  <FileText className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Jobs Completed</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{data.billCount || 0}</p>
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
            <div className="card p-6 border border-gray-200 dark:border-slate-800">
              <div className="flex items-center">
                <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl text-blue-600 dark:text-blue-400">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500 dark:text-slate-400">This {period}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{data.billCount || 0} jobs</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Jobs */}
          <div className="card border border-gray-200 dark:border-slate-800">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Recent Jobs</h3>
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

          {/* Manager Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="card p-6 border border-gray-200 dark:border-slate-800 dark:bg-slate-850">
              <div className="flex items-center">
                <div className="p-3 bg-green-50 dark:bg-green-950/40 rounded-xl text-green-600 dark:text-green-400">
                  <DollarSign className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                    ₹{(data.managerRevenue || 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            <div className="card p-6 border border-gray-200 dark:border-slate-800 dark:bg-slate-850">
              <div className="flex items-center">
                <div className="p-3 bg-primary-50 dark:bg-primary-950/40 rounded-xl text-primary-600 dark:text-primary-400">
                  <FileText className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Total Bills</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{data.totalBills || 0}</p>
                </div>
              </div>
            </div>
            <div className="card p-6 border border-gray-200 dark:border-slate-800 dark:bg-slate-850">
              <div className="flex items-center">
                <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl text-blue-600 dark:text-blue-400">
                  <Users className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Customers</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{data.totalCustomers || 0}</p>
                </div>
              </div>
            </div>
            <div className="card p-6 border border-gray-200 dark:border-slate-800 dark:bg-slate-850">
              <div className="flex items-center">
                <div className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-xl text-purple-600 dark:text-purple-400">
                  <Package className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Spare Parts</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{data.totalSpareParts || 0}</p>
                </div>
              </div>
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
