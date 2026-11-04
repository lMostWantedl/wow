import React, { useState, useMemo } from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { sparePartsService } from '../services/spareParts';
import { Plus, Search, Package, AlertTriangle, Edit, Trash2, Car, X } from 'lucide-react';
import { DEFAULT_SPARE_PART_CATEGORIES } from '../constants/sparePartOptions';
import { POPULAR_VEHICLE_MAKES } from '../constants/vehicleCompatibility';
import toast from 'react-hot-toast';

const SpareParts: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);

  // Load distinct vehicle fits from DB if available
  const { data: vehicleFitsData } = useQuery('spare-parts-vehicle-fits', () =>
    sparePartsService.getVehicleFits()
  );

  // Compute available makes combining DB fits and popular makes
  const availableMakes = useMemo(() => {
    const set = new Set<string>();
    POPULAR_VEHICLE_MAKES.forEach(m => set.add(m.make));
    (vehicleFitsData?.makes || []).forEach(m => {
      if (m && m.trim()) set.add(m.trim());
    });
    return Array.from(set).sort();
  }, [vehicleFitsData]);

  // Compute available models for selected make
  const availableModels = useMemo(() => {
    if (!make) return [];
    const models = new Set<string>();
    
    // Check preset
    const preset = POPULAR_VEHICLE_MAKES.find(m => m.make.toLowerCase() === make.toLowerCase());
    if (preset) {
      preset.models.forEach(m => models.add(m.name));
    }

    // Check DB fits
    (vehicleFitsData?.models || []).forEach(item => {
      if (item.make.toLowerCase() === make.toLowerCase() && item.model) {
        models.add(item.model);
      }
    });

    return Array.from(models).sort();
  }, [make, vehicleFitsData]);

  const { data: sparePartsData, isLoading, refetch } = useQuery(
    ['spare-parts', page, search, category, make, model, showLowStock],
    () => sparePartsService.getSpareParts({
      page,
      limit: 12,
      ...(search && { search }),
      ...(category && { category }),
      ...(make && { make }),
      ...(model && { model }),
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

  const hasActiveFilters = !!(search || category || make || model || showLowStock);

  const clearAllFilters = () => {
    setSearch('');
    setCategory('');
    setMake('');
    setModel('');
    setShowLowStock(false);
    setPage(1);
  };

  const getPartTypeBadgeClass = (partType?: string) => {
    switch (partType) {
      case 'OEM Genuine':
        return 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60';
      case 'OES (Original Equipment Supplier)':
        return 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60';
      case 'Aftermarket Premium':
      case 'Aftermarket Standard':
        return 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800/60';
      case 'Universal / Consumable':
        return 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700';
    }
  };

  if (isLoading && !sparePartsData) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Spare Parts Inventory</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800/60">
              Car-Specific Catalog
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            Manage car-specific spare parts, brand variants, OEM fitments, and warehouse stock levels
          </p>
        </div>
        {user?.role !== 'CUSTOMER' && (
          <button
            onClick={() => navigate('/spare-parts/create')}
            className="btn btn-primary flex items-center gap-2 self-start sm:self-auto shadow-sm text-xs font-semibold px-4 py-2"
          >
            <Plus className="h-4 w-4" />
            New Spare Part
          </button>
        )}
      </div>

      {/* Filters Card */}
      <div className="card p-5 bg-white dark:bg-[#0c101c] border border-gray-200 dark:border-slate-800/90 rounded-xl shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
          {/* Search */}
          <div className="lg:col-span-2">
            <label className="block text-[11px] font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Search Parts & Numbers
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Search part name, OEM #, car model..."
                className="input pl-9 w-full text-xs"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>

          {/* Vehicle Make Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Car Make / Brand
            </label>
            <select
              className="input w-full text-xs"
              value={make}
              onChange={(e) => {
                setMake(e.target.value);
                setModel('');
                setPage(1);
              }}
            >
              <option value="">All Makes / Brands</option>
              <option value="Universal">🌐 Universal / Consumables</option>
              {availableMakes.filter(m => m !== 'Universal').map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Vehicle Model Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Car Model
            </label>
            <select
              className="input w-full text-xs"
              value={model}
              onChange={(e) => {
                setModel(e.target.value);
                setPage(1);
              }}
              disabled={!make || make === 'Universal'}
            >
              <option value="">{make ? 'All Models' : 'Select Make First'}</option>
              {availableModels.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Category
            </label>
            <select
              className="input w-full text-xs"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Categories</option>
              {mergedCategories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Second Row: Low Stock Toggle & Clear Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-100 dark:border-slate-800">
          <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              className="rounded border-gray-300 dark:border-slate-700 text-primary-600 focus:ring-primary-500 h-4 w-4"
              checked={showLowStock}
              onChange={(e) => {
                setShowLowStock(e.target.checked);
                setPage(1);
              }}
            />
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              Only Low Stock Items
            </span>
          </label>

          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="text-xs text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1 font-medium"
            >
              <X className="h-3.5 w-3.5" />
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Spare Parts Table */}
      <div className="card bg-white dark:bg-[#0c101c] border border-gray-200 dark:border-slate-800/90 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80">
                <th className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider text-left">
                  Part & Vehicle Compatibility
                </th>
                <th className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider text-left">
                  Part Numbers
                </th>
                <th className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider text-left">
                  Type & Category
                </th>
                <th className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider text-center">
                  Stock
                </th>
                <th className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider text-right">
                  Price
                </th>
                <th className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60">
              {sparePartsData?.spareParts.map((part) => {
                const isLow = (part.stock || 0) <= (part.minStock || 0);
                const isUniv = (part.make || '').toLowerCase() === 'universal';

                return (
                  <tr key={part.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors">
                    {/* Part & Compatibility */}
                    <td className="py-3 px-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => navigate(`/spare-parts/${part.id}`)}
                            className="font-bold text-gray-900 dark:text-slate-100 hover:text-primary-600 dark:hover:text-primary-400 text-left transition-colors"
                          >
                            {part.name}
                          </button>
                          {part.brand && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              {part.brand}
                            </span>
                          )}
                        </div>

                        {/* Vehicle Fitment Pill */}
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          {isUniv ? (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              🌐 Universal / Consumable
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60">
                              <Car className="h-3 w-3 shrink-0" />
                              {part.make} {part.model}
                              {part.generation && part.generation !== 'All Generations' && (
                                <span className="opacity-80 font-normal"> · {part.generation}</span>
                              )}
                              {part.fuelType && part.fuelType !== 'All Fuels' && (
                                <span className="opacity-75 font-normal text-[10px]">({part.fuelType})</span>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Part Numbers */}
                    <td className="py-3 px-4">
                      <div className="space-y-0.5">
                        {part.oemPartNumber && (
                          <div className="flex items-center gap-1 text-[11px] font-mono">
                            <span className="text-slate-400 font-sans text-[10px] uppercase">OEM:</span>
                            <span className="font-semibold text-primary-600 dark:text-primary-400">{part.oemPartNumber}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                          <span className="text-slate-400 font-sans text-[10px] uppercase">SKU:</span>
                          <span>{part.partNumber || '—'}</span>
                        </div>
                      </div>
                    </td>

                    {/* Type & Category */}
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        {part.partType && (
                          <div>
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${getPartTypeBadgeClass(part.partType)}`}>
                              {part.partType}
                            </span>
                          </div>
                        )}
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {part.category}
                        </span>
                      </div>
                    </td>

                    {/* Stock */}
                    <td className="py-3 px-4 text-center font-semibold">
                      <div className="inline-flex items-center gap-1.5">
                        <span className={isLow ? 'text-red-600 dark:text-red-400 font-bold' : 'text-slate-800 dark:text-slate-200'}>
                          {Math.floor(part.stock || 0)} {part.unit || 'pcs'}
                        </span>
                        {isLow && (
                          <span title="Low stock warning">
                            <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Price */}
                    <td className="py-3 px-4 font-bold text-gray-900 dark:text-slate-100 text-right">
                      ₹{(part.price || 0).toLocaleString()}
                    </td>

                    {/* Actions */}
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
                            {(user?.role === 'MANAGER' || user?.scopes?.includes('spare_parts')) && (
                              <button
                                onClick={async () => {
                                  if (window.confirm(`Are you sure you want to delete "${part.name}"?`)) {
                                    try {
                                      await sparePartsService.deleteSparePart(part.id);
                                      toast.success('Spare part deleted successfully');
                                      refetch();
                                    } catch (err: any) {
                                      toast.error(err.response?.data?.message || 'Failed to delete spare part');
                                    }
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
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="btn btn-secondary text-xs mt-3"
              >
                Reset All Filters
              </button>
            )}
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
