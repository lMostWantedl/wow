import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { billsService } from '../services/bills';
import { BillListItem } from '../types';
import { Plus, Search, Eye, Edit, Trash2 } from 'lucide-react';
import { format, isValid } from 'date-fns';

// Helper function to safely format dates
const safeFormatDate = (dateString: string | null | undefined, formatString: string = 'MMM dd, yyyy'): string => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return isValid(date) ? format(date, formatString) : 'N/A';
};

const Bills: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');

  const { data: billsData, isLoading, refetch } = useQuery(
    ['bills', page, search, statusFilter, paymentStatusFilter],
    () => billsService.getBills({
      page,
      limit: 10,
      ...(search && { search }),
      ...(statusFilter && { status: statusFilter }),
      ...(paymentStatusFilter && { paymentStatus: paymentStatusFilter }),
    }),
    {
      keepPreviousData: true,
    }
  );

  const getStatusBadge = (status: string) => {
    const badges = {
      PENDING: 'badge-warning',
      COMPLETED: 'badge-success',
      PAID: 'badge-success',
      CANCELLED: 'badge-danger',
    };
    return badges[status as keyof typeof badges] || 'badge-info';
  };

  const getPaymentStatusBadge = (status: string) => {
    const badges = {
      PENDING: 'badge-warning',
      PAID: 'badge-success',
      PARTIAL: 'badge-info',
      OVERDUE: 'badge-danger',
    };
    return badges[status as keyof typeof badges] || 'badge-info';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Bills & Invoices</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Manage all your garage bills and invoice payments</p>
        </div>
        {user?.role !== 'CUSTOMER' && (
          <button
            onClick={() => navigate('/bills/create')}
            className="btn btn-primary flex items-center gap-2 self-start sm:self-auto shadow-sm"
          >
            <Plus className="h-4 w-4" />
            New Bill
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card p-5 bg-white dark:bg-[#0c101c] border border-gray-200 dark:border-slate-800/90 rounded-xl shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Search bills, customer, vehicle..."
                className="input pl-10 w-full text-xs"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">Work Status</label>
            <select
              className="input text-xs"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="COMPLETED">Completed</option>
              <option value="PAID">Paid</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">Payment Status</label>
            <select
              className="input text-xs"
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
            >
              <option value="">All Payment Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="PAID">Paid</option>
              <option value="PARTIAL">Partial</option>
              <option value="OVERDUE">Overdue</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearch('');
                setStatusFilter('');
                setPaymentStatusFilter('');
                setPage(1);
              }}
              className="btn btn-secondary w-full text-xs py-2"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Bills Table */}
      <div className="card bg-white dark:bg-[#0c101c] border border-gray-200 dark:border-slate-800/90 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80">
                <th className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Bill Number</th>
                <th className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Customer</th>
                <th className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Date</th>
                <th className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Amount</th>
                <th className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Status</th>
                <th className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Payment</th>
                <th className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60">
              {billsData?.bills.map((bill: BillListItem) => (
                <tr key={bill.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-gray-900 dark:text-slate-100">{bill.bill_number || 'N/A'}</td>
                  <td className="py-3 px-4 font-medium text-gray-800 dark:text-slate-200">{bill.customer_name || 'N/A'}</td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{safeFormatDate(bill.service_date)}</td>
                  <td className="py-3 px-4 font-bold text-gray-900 dark:text-slate-100">₹{(bill.total_amount || 0).toLocaleString()}</td>
                  <td className="py-3 px-4">
                    <span className={`badge ${getStatusBadge(bill.status)}`}>
                      {bill.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`badge ${getPaymentStatusBadge(bill.payment_status)}`}>
                      {bill.payment_status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => navigate(`/bills/${bill.id}`)}
                        className="p-1.5 rounded-lg text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/50 transition-colors"
                        title="View Bill Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {user?.role !== 'CUSTOMER' && (
                        <>
                          <button
                            onClick={() => navigate(`/bills/${bill.id}/edit`)}
                            className="p-1.5 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors"
                            title="Edit Bill"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          {user?.role === 'MANAGER' && (
                            <button
                              onClick={() => {
                                if (window.confirm('Are you sure you want to delete this bill?')) {
                                  billsService.deleteBill(bill.id).then(() => {
                                    refetch();
                                  });
                                }
                              }}
                              className="p-1.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
                              title="Delete Bill"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {billsData?.bills.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <p>No bills found matching your criteria</p>
          </div>
        )}

        {/* Pagination */}
        {billsData?.pagination && billsData.pagination.pages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-600 dark:text-slate-400">
                Showing {((billsData.pagination.page - 1) * billsData.pagination.limit) + 1} to{' '}
                {Math.min(billsData.pagination.page * billsData.pagination.limit, billsData.pagination.total)} of{' '}
                {billsData.pagination.total} results
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="btn btn-secondary text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page === billsData.pagination.pages}
                  className="btn btn-secondary text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Bills;
