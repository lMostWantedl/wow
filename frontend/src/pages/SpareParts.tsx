import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { sparePartsService } from '../services/spareParts';
import { Plus, Search, Package, AlertTriangle, Edit, Trash2 } from 'lucide-react';
import { DEFAULT_SPARE_PART_CATEGORIES } from '../constants/sparePartOptions';

const SpareParts: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);

  const { data: sparePartsData, isLoading, refetch } = useQuery(
    ['spare-parts', page, search, category, showLowStock],
    () => sparePartsService.getSpareParts({
      page,
      limit: 10,
      ...(search && { search }),
      ...(category && { category }),
      ...(showLowStock && { lowStock: true }),
    }),
    {
      keepPreviousData: true,
    }
  );

  const { data: categories } = useQuery('spare-part-categories', () => sparePartsService.getCategories());

  const mergedCategories = Array.from(new Set([
    ...DEFAULT_SPARE_PART_CATEGORIES,
    ...(categories?.categories || [])
  ])).sort((a, b) => a.localeCompare(b));

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Spare Parts Inventory</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Manage stock levels, inventory valuation, and catalog pricing</p>
        </div>
        {user?.role !== 'CUSTOMER' && (
          <button
            onClick={() => navigate('/spare-parts/create')}
            className="btn btn-primary flex items-center gap-2 self-start sm:self-auto shadow-sm"
          >
            <Plus className="h-4 w-4" />
            New Spare Part
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
                placeholder="Search by part name or number..."
                className="input pl-10 w-full text-xs"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">Category</label>
            <select
              className="input text-xs"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {mergedCategories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center pt-5 sm:pt-6">
            <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                className="rounded border-gray-300 dark:border-slate-700 text-primary-600 focus:ring-primary-500 h-4 w-4"
                checked={showLowStock}
                onChange={(e) => setShowLowStock(e.target.checked)}
              />
              <span>Filter Low Stock Items</span>
            </label>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearch('');
                setCategory('');
                setShowLowStock(false);
                setPage(1);
              }}
              className="btn btn-secondary w-full text-xs py-2"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Spare Parts Table */}
      <div className="card bg-white dark:bg-[#0c101c] border border-gray-200 dark:border-slate-800/90 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80">
                <th className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Part Name</th>
                <th className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Part Number</th>
                <th className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Category</th>
                <th className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider text-center">Stock Available</th>
                <th className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider text-right">Unit Price</th>
                <th className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60">
              {sparePartsData?.spareParts.map((part) => {
                const isLow = part.stock <= part.minStock;
                return (
                  <tr key={part.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-4 font-bold text-gray-900 dark:text-slate-100">{part.name}</td>
                    <td className="py-3 px-4 font-mono text-slate-500 dark:text-slate-400">{part.partNumber || '—'}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {part.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-semibold">
                      <div className="inline-flex items-center gap-1.5">
                        <span className={isLow ? 'text-red-600 dark:text-red-400 font-bold' : 'text-slate-800 dark:text-slate-200'}>
                          {Math.floor(part.stock)} {part.unit || 'pcs'}
                        </span>
                        {isLow && (
                          <span title="Low stock warning">
                            <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-bold text-gray-900 dark:text-slate-100 text-right">₹{(part.price || 0).toLocaleString()}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => navigate(`/spare-parts/${part.id}`)}
                          className="p-1.5 rounded-lg text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/50 transition-colors"
                          title="View Details"
                        >
                          <Package className="h-4 w-4" />
                        </button>
                        {user?.role !== 'CUSTOMER' && (
                          <>
                            <button
                              onClick={() => navigate(`/spare-parts/${part.id}/edit`)}
                              className="p-1.5 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors"
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            {user?.role === 'MANAGER' && (
                              <button
                                onClick={() => {
                                  if (window.confirm('Are you sure you want to delete this spare part?')) {
                                    sparePartsService.deleteSparePart(part.id).then(() => {
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
                );
              })}
            </tbody>
          </table>
        </div>

        {sparePartsData?.spareParts.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <p>No spare parts found matching your criteria</p>
          </div>
        )}

        {/* Pagination */}
        {sparePartsData?.pagination && sparePartsData.pagination.pages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-600 dark:text-slate-400">
                Showing {((sparePartsData.pagination.page - 1) * sparePartsData.pagination.limit) + 1} to{' '}
                {Math.min(sparePartsData.pagination.page * sparePartsData.pagination.limit, sparePartsData.pagination.total)} of{' '}
                {sparePartsData.pagination.total} results
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
                  disabled={page === sparePartsData.pagination.pages}
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

export default SpareParts;
