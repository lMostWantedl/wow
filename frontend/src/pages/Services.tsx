import React, { useState, useMemo } from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { servicesService } from '../services/services';
import {
  Plus,
  Search,
  Wrench,
  Edit,
  Trash2,
  Clock,
  LayoutGrid,
  List,
  Layers,
  X,
  Tag
} from 'lucide-react';
import toast from 'react-hot-toast';

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'Periodic & Maintenance': { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  'Engine & Diagnostics': { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  'Brakes & Safety': { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30' },
  'Suspension & Steering': { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  'Clutch & Transmission': { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/30' },
  'AC & Climate': { bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/30' },
  'Electrical & Battery': { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  'Fuel System & Intake': { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30' },
  'Detailing & Body Care': { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' },
  'General': { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/30' },
};

const getCategoryStyle = (category?: string) => {
  return CATEGORY_COLORS[category || 'General'] || CATEGORY_COLORS['General'];
};

const Services: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'sections' | 'table'>('sections');

  // Fetch all services without small pagination limits so user can seamlessly search and categorize
  const { data: servicesData, isLoading, refetch } = useQuery(
    ['services', search, selectedCategory],
    () => servicesService.getServices({
      ...(search && { search }),
      ...(selectedCategory !== 'ALL' && { category: selectedCategory }),
    }),
    {
      keepPreviousData: true,
    }
  );

  const services = useMemo(() => servicesData?.services || [], [servicesData]);

  // Group services by category for sectioned view
  const groupedServices = useMemo(() => {
    const groups: Record<string, typeof services> = {};
    for (const service of services) {
      const cat = service.category || 'General';
      if (!groups[cat]) {
        groups[cat] = [];
      }
      groups[cat].push(service);
    }
    return groups;
  }, [services]);

  // Distinct categories available in current data or standard catalog
  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    services.forEach(s => set.add(s.category || 'General'));
    return Array.from(set).sort();
  }, [services]);

  const handleDelete = async (serviceId: string, serviceName: string) => {
    if (window.confirm(`Are you sure you want to delete service "${serviceName}"?`)) {
      try {
        await servicesService.deleteService(serviceId);
        toast.success(`Service "${serviceName}" deleted successfully`);
        refetch();
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to delete service');
      }
    }
  };

  const canManageServices = user?.role === 'MANAGER' || user?.scopes?.includes('services');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Services Catalog</h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-primary-100 dark:bg-primary-950/60 text-primary-700 dark:text-primary-400 border border-primary-200 dark:border-primary-800">
              {services.length} Total Services
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            Standard garage labor, repair packages, and base hourly rates
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View toggle button */}
          <div className="flex items-center bg-gray-100 dark:bg-slate-900 p-1 rounded-xl border border-gray-200 dark:border-slate-800">
            <button
              onClick={() => setViewMode('sections')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'sections'
                  ? 'bg-white dark:bg-slate-800 text-primary-600 dark:text-primary-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="Categorized Sections View"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Sections
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-800 text-primary-600 dark:text-primary-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="Full Table View"
            >
              <List className="h-3.5 w-3.5" />
              Table
            </button>
          </div>

          {user?.role !== 'CUSTOMER' && (
            <button
              onClick={() => navigate('/services/create')}
              className="btn btn-primary flex items-center gap-2 shadow-sm text-xs py-2 px-3.5"
            >
              <Plus className="h-4 w-4" />
              New Service
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card p-4 bg-white dark:bg-[#0c101c] border border-gray-200 dark:border-slate-800/90 rounded-xl shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Search services by name, description, or category (e.g. AC, Brake, Alignment, Oil)..."
              className="input pl-10 pr-9 w-full text-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Category Dropdown Filter */}
          <div className="w-full sm:w-64">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="input w-full text-xs"
            >
              <option value="ALL">All Categories ({services.length})</option>
              {categoriesList.map(cat => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Category Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar text-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1 shrink-0">
            <Tag className="h-3 w-3" /> Filter:
          </span>
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors shrink-0 ${
              selectedCategory === 'ALL'
                ? 'bg-primary-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            All Services
          </button>
          {categoriesList.map((cat) => {
            const isSelected = selectedCategory === cat;
            const style = getCategoryStyle(cat);
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(isSelected ? 'ALL' : cat)}
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors shrink-0 border ${
                  isSelected
                    ? 'bg-primary-600 text-white border-primary-500 shadow-xs'
                    : `${style.bg} ${style.text} ${style.border} hover:opacity-80`
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Zero Results State */}
      {services.length === 0 && (
        <div className="card p-12 text-center bg-white dark:bg-[#0c101c] border border-gray-200 dark:border-slate-800 rounded-xl">
          <Wrench className="h-12 w-12 text-slate-400 mx-auto mb-3 opacity-40" />
          <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100">No Services Found</h3>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            {search
              ? `No services matched your query "${search}". Try adjusting your keywords or clearing the category filter.`
              : 'No services available in this category.'}
          </p>
          {(search || selectedCategory !== 'ALL') && (
            <button
              onClick={() => {
                setSearch('');
                setSelectedCategory('ALL');
              }}
              className="btn btn-secondary text-xs mt-4"
            >
              Reset Filters
            </button>
          )}
        </div>
      )}

      {/* MODE 1: Categorized Sections View */}
      {viewMode === 'sections' && services.length > 0 && (
        <div className="space-y-6">
          {Object.entries(groupedServices).map(([categoryName, catServices]) => {
            const style = getCategoryStyle(categoryName);
            return (
              <div
                key={categoryName}
                className="card bg-white dark:bg-[#0c101c] border border-gray-200 dark:border-slate-800/90 rounded-xl shadow-xs overflow-hidden"
              >
                {/* Section Header */}
                <div className="px-5 py-3.5 bg-slate-50/80 dark:bg-slate-900/80 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold border ${style.bg} ${style.text} ${style.border}`}>
                      <Layers className="h-3.5 w-3.5" />
                      {categoryName}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      ({catServices.length} {catServices.length === 1 ? 'service' : 'services'})
                    </span>
                  </div>
                </div>

                {/* Section Items Grid / List */}
                <div className="divide-y divide-gray-100 dark:divide-slate-800/60">
                  {catServices.map((service) => (
                    <div
                      key={service.id}
                      className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors"
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-gray-900 dark:text-slate-100">
                            {service.name}
                          </h4>
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                            <Clock className="h-3 w-3" />
                            {service.duration || 60} mins
                          </span>
                        </div>
                        {service.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                            {service.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-6 shrink-0">
                        <div className="text-right">
                          <span className="text-xs text-slate-400 block uppercase tracking-wider font-semibold">Standard Rate</span>
                          <span className="text-base font-extrabold text-primary-600 dark:text-primary-400">
                            ₹{(service.price || 0).toLocaleString()}
                          </span>
                        </div>

                        {canManageServices && (
                          <div className="flex items-center gap-1.5 border-l border-gray-100 dark:border-slate-800 pl-4">
                            <button
                              onClick={() => navigate(`/services/${service.id}/edit`)}
                              className="p-1.5 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors"
                              title="Edit Service"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(service.id, service.name)}
                              className="p-1.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
                              title="Delete Service"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODE 2: Full Table View */}
      {viewMode === 'table' && services.length > 0 && (
        <div className="card bg-white dark:bg-[#0c101c] border border-gray-200 dark:border-slate-800/90 rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80">
                  <th className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Service Name</th>
                  <th className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Category</th>
                  <th className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Description</th>
                  <th className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider text-right">Standard Rate</th>
                  <th className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider text-center">Duration</th>
                  <th className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60">
                {services.map((service) => {
                  const style = getCategoryStyle(service.category);
                  return (
                    <tr key={service.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-gray-900 dark:text-slate-100">
                        {service.name}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${style.bg} ${style.text} ${style.border}`}>
                          {service.category || 'General'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400 max-w-xs truncate">
                        {service.description || '—'}
                      </td>
                      <td className="py-3 px-4 font-bold text-primary-600 dark:text-primary-400 text-right">
                        ₹{(service.price || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-center font-medium text-slate-700 dark:text-slate-300">
                        {service.duration || 60} min
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => navigate(`/services/${service.id}`)}
                            className="p-1.5 rounded-lg text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/50 transition-colors"
                            title="View Details"
                          >
                            <Wrench className="h-4 w-4" />
                          </button>
                          {canManageServices && (
                            <>
                              <button
                                onClick={() => navigate(`/services/${service.id}/edit`)}
                                className="p-1.5 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors"
                                title="Edit"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(service.id, service.name)}
                                className="p-1.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
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
        </div>
      )}
    </div>
  );
};

export default Services;
