import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { servicesService } from '../services/services';
import { Plus, Search, Wrench, Edit, Trash2 } from 'lucide-react';

const Services: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data: servicesData, isLoading, refetch } = useQuery(
    ['services', page, search],
    () => servicesService.getServices({
      page,
      limit: 10,
      ...(search && { search }),
    }),
    {
      keepPreviousData: true,
    }
  );

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Services Catalog</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Manage standard garage labor, services, and base rates</p>
        </div>
        {user?.role !== 'CUSTOMER' && (
          <button
            onClick={() => navigate('/services/create')}
            className="btn btn-primary flex items-center gap-2 self-start sm:self-auto shadow-sm"
          >
            <Plus className="h-4 w-4" />
            New Service
          </button>
        )}
      </div>

      {/* Search */}
      <div className="card p-5 bg-white dark:bg-[#0c101c] border border-gray-200 dark:border-slate-800/90 rounded-xl shadow-xs">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search services by name or description..."
            className="input pl-10 w-full text-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Services Table */}
      <div className="card bg-white dark:bg-[#0c101c] border border-gray-200 dark:border-slate-800/90 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80">
                <th className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Service Name</th>
                <th className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Description</th>
                <th className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider text-right">Standard Rate</th>
                <th className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider text-center">Duration</th>
                <th className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60">
              {servicesData?.services.map((service) => (
                <tr key={service.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors">
                  <td className="py-3 px-4 font-bold text-gray-900 dark:text-slate-100">{service.name}</td>
                  <td className="py-3 px-4 text-slate-500 dark:text-slate-400">{service.description || '—'}</td>
                  <td className="py-3 px-4 font-bold text-gray-900 dark:text-slate-100 text-right">₹{(service.price || 0).toLocaleString()}</td>
                  <td className="py-3 px-4 text-center font-medium text-slate-700 dark:text-slate-300">{service.duration || 0} min</td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => navigate(`/services/${service.id}`)}
                        className="p-1.5 rounded-lg text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/50 transition-colors"
                        title="View Details"
                      >
                        <Wrench className="h-4 w-4" />
                      </button>
                      {user?.role !== 'CUSTOMER' && (
                        <>
                          <button
                            onClick={() => navigate(`/services/${service.id}/edit`)}
                            className="p-1.5 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          {user?.role === 'MANAGER' && (
                            <button
                              onClick={() => {
                                if (window.confirm('Are you sure you want to delete this service?')) {
                                  servicesService.deleteService(service.id).then(() => {
                                    refetch();
                                  });
                                }
                              }}
                              className="p-1.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
                              title="Delete"
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

        {servicesData?.services.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <p>No services found matching your search</p>
          </div>
        )}

        {/* Pagination */}
        {servicesData?.pagination && servicesData.pagination.pages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-600 dark:text-slate-400">
                Showing {((servicesData.pagination.page - 1) * servicesData.pagination.limit) + 1} to{' '}
                {Math.min(servicesData.pagination.page * servicesData.pagination.limit, servicesData.pagination.total)} of{' '}
                {servicesData.pagination.total} results
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
                  disabled={page === servicesData.pagination.pages}
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

export default Services;
