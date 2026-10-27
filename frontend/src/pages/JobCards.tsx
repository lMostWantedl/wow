import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { jobCardsService } from '../services/jobCards';
import { JobCardStatus } from '../types';
import {
  ClipboardList,
  Plus,
  Search,
  Eye,
  ArrowRight,
  FileText,
  UserCheck
} from 'lucide-react';
import { format, isValid } from 'date-fns';

const safeFormatDate = (dateString: string | null | undefined, formatString: string = 'MMM dd, yyyy'): string => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return isValid(date) ? format(date, formatString) : 'N/A';
};

const JobCards: React.FC = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');

  const { data, isLoading } = useQuery(
    ['job-cards', statusFilter, priorityFilter, search],
    () => jobCardsService.getJobCards({
      status: statusFilter,
      priority: priorityFilter,
      search: search || undefined
    }),
    {
      refetchInterval: 15000
    }
  );

  const jobCards = data?.jobCards || [];

  const getStatusBadge = (status: JobCardStatus) => {
    switch (status) {
      case 'OPEN':
        return 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800';
      case 'ESTIMATED':
        return 'bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800';
      case 'IN_PROGRESS':
        return 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 animate-pulse';
      case 'COMPLETED':
        return 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800';
      case 'INVOICED':
        return 'bg-green-100 dark:bg-green-950/40 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800';
      case 'CANCELLED':
        return 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800';
      default:
        return 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-red-500 text-white font-bold';
      case 'HIGH':
        return 'bg-orange-500 text-white font-semibold';
      case 'LOW':
        return 'bg-slate-500 text-white font-medium';
      default:
        return 'bg-blue-500 text-white font-medium';
    }
  };

  const statusCounts = {
    ALL: jobCards.length,
    OPEN: jobCards.filter(j => j.status === 'OPEN').length,
    IN_PROGRESS: jobCards.filter(j => j.status === 'IN_PROGRESS').length,
    COMPLETED: jobCards.filter(j => j.status === 'COMPLETED').length,
    INVOICED: jobCards.filter(j => j.status === 'INVOICED').length,
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary-50 dark:bg-primary-950/50 rounded-xl text-primary-600 dark:text-primary-400">
              <ClipboardList className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                Job Cards & Quotations
              </h1>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                Manage vehicle intake, quotations, technician work, and invoice conversion
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/job-cards/new"
            className="btn btn-primary flex items-center gap-2 text-sm shadow-md"
          >
            <Plus className="h-4 w-4" />
            Create Job Card
          </Link>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex overflow-x-auto gap-2 pb-1 no-scrollbar">
        {[
          { key: 'ALL', label: 'All Job Cards' },
          { key: 'OPEN', label: 'Intake / Open' },
          { key: 'IN_PROGRESS', label: 'In Progress' },
          { key: 'COMPLETED', label: 'Work Completed' },
          { key: 'INVOICED', label: 'Invoiced' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 border ${
              statusFilter === tab.key
                ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-400 border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/60'
            }`}
          >
            <span>{tab.label}</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] ${
              statusFilter === tab.key
                ? 'bg-white/20 text-white'
                : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300'
            }`}>
              {statusCounts[tab.key as keyof typeof statusCounts] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="card p-4 border border-gray-200 dark:border-slate-800 dark:bg-slate-850">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Job Card #, Customer Name, Phone, or Vehicle Number..."
              className="input pl-10"
            />
          </div>
          <div>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="input"
            >
              <option value="ALL">All Priorities</option>
              <option value="URGENT">Urgent Priority</option>
              <option value="HIGH">High Priority</option>
              <option value="NORMAL">Normal Priority</option>
              <option value="LOW">Low Priority</option>
            </select>
          </div>
        </div>
      </div>

      {/* Job Cards Table */}
      <div className="card overflow-hidden border border-gray-200 dark:border-slate-800 dark:bg-slate-850 shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
          </div>
        ) : jobCards.length === 0 ? (
          <div className="text-center py-16 px-4">
            <ClipboardList className="mx-auto h-12 w-12 text-gray-300 dark:text-slate-600 mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">No Job Cards Found</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              {search || statusFilter !== 'ALL'
                ? 'Try adjusting your search criteria or filter tabs.'
                : 'Create a new Job Card when a vehicle arrives for inspection or service.'}
            </p>
            <Link
              to="/job-cards/new"
              className="btn btn-primary inline-flex items-center gap-2 mt-5 text-sm"
            >
              <Plus className="h-4 w-4" />
              Create First Job Card
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr>
                  <th>Job Card #</th>
                  <th>Customer & Vehicle</th>
                  <th>Assigned Technicians</th>
                  <th>Status</th>
                  <th>Complaints / Scope</th>
                  <th className="text-right">Estimated / Actual</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {jobCards.map((jc) => (
                  <tr
                    key={jc.id}
                    className="hover:bg-gray-50/80 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td>
                      <div>
                        <Link
                          to={`/job-cards/${jc.id}`}
                          className="font-bold text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1.5"
                        >
                          {jc.job_card_number}
                        </Link>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold uppercase ${getPriorityBadge(jc.priority)}`}>
                            {jc.priority}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-slate-400">
                            {safeFormatDate(jc.created_at, 'dd MMM')}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-slate-100">
                          {jc.customer_name || 'Walk-in Customer'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">{jc.customer_phone}</p>
                        {(jc.vehicle_number || jc.vehicle_model) && (
                          <div className="flex items-center gap-1.5 mt-1">
                            {jc.vehicle_number && (
                              <span className="font-mono text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-200 border border-gray-200 dark:border-slate-700">
                                {jc.vehicle_number}
                              </span>
                            )}
                            <span className="text-xs text-gray-500 dark:text-slate-400 truncate max-w-[120px]">
                              {jc.vehicle_model}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>

                    <td>
                      {jc.technicians && jc.technicians.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {jc.technicians.map((t: any) => (
                            <span
                              key={t.id}
                              className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                              title={`Technician: ${t.name}`}
                            >
                              <UserCheck className="h-3 w-3 text-primary-600 dark:text-primary-400" />
                              {t.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 dark:text-slate-500 italic">Unassigned</span>
                      )}
                    </td>

                    <td>
                      <div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusBadge(jc.status)}`}>
                          {jc.status.replace('_', ' ')}
                        </span>
                        {jc.bill_number && (
                          <div className="mt-1">
                            <Link
                              to={`/bills/${jc.bill_id}`}
                              className="text-[11px] text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1 font-mono"
                            >
                              <FileText className="h-3 w-3" />
                              #{jc.bill_number}
                            </Link>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="max-w-xs">
                      <p className="text-xs text-gray-700 dark:text-slate-300 line-clamp-2">
                        {jc.customer_complaints || 'No specific complaints recorded'}
                      </p>
                      <div className="flex items-center gap-3 text-[11px] text-gray-500 dark:text-slate-400 mt-1">
                        <span>{jc.services_count || 0} services</span>
                        <span>•</span>
                        <span>{jc.parts_count || 0} parts</span>
                        {jc.odometer_reading ? (
                          <>
                            <span>•</span>
                            <span>{jc.odometer_reading} KM</span>
                          </>
                        ) : null}
                      </div>
                    </td>

                    <td className="text-right">
                      <div>
                        <p className="font-bold text-gray-900 dark:text-slate-100 text-sm">
                          ₹{(Number(jc.actual_amount) || Number(jc.estimated_amount) || 0).toLocaleString()}
                        </p>
                        {jc.estimated_amount && Number(jc.estimated_amount) !== Number(jc.actual_amount) && (
                          <p className="text-[11px] text-gray-400 dark:text-slate-500 line-through">
                            Est: ₹{Number(jc.estimated_amount).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </td>

                    <td className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          to={`/job-cards/${jc.id}`}
                          className="btn btn-secondary p-1.5 rounded-lg text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                          title="View & Edit Job Card"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        {jc.status !== 'INVOICED' ? (
                          <Link
                            to={`/job-cards/${jc.id}?action=convert`}
                            className="btn btn-primary p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1"
                            title="Convert to Invoice"
                          >
                            <span>Invoice</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        ) : (
                          <Link
                            to={`/bills/${jc.bill_id}`}
                            className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
                          >
                            Billed
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default JobCards;
