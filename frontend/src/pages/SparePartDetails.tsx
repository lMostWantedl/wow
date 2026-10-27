import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { sparePartsService } from '../services/spareParts';
import { ArrowLeft, Edit, Package, AlertTriangle } from 'lucide-react';

const SparePartDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: sparePartResponse, isLoading, error } = useQuery(
    ['spare-part', id],
    () => sparePartsService.getSparePart(id!),
    {
      enabled: !!id
    }
  );

  const sparePart = sparePartResponse?.sparePart;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !sparePart) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 dark:text-red-400">Spare part not found</p>
        <button
          onClick={() => navigate('/spare-parts')}
          className="btn btn-primary mt-4"
        >
          Back to Spare Parts
        </button>
      </div>
    );
  }

  const isLowStock = (sparePart.stock || 0) <= (sparePart.minStock || 0);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/spare-parts')}
            className="p-2 rounded-lg text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            title="Back to Spare Parts"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{sparePart.name}</h1>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Part details, stock inventory, and margin analysis</p>
          </div>
        </div>

        <button
          onClick={() => navigate(`/spare-parts/${id}/edit`)}
          className="btn btn-primary flex items-center gap-2 self-start sm:self-auto shadow-sm"
        >
          <Edit className="h-4 w-4" />
          Edit Spare Part
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Basic Information */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6 bg-white dark:bg-[#0c101c] border border-gray-200 dark:border-slate-800/90 rounded-xl shadow-xs">
            <h3 className="text-base font-bold text-gray-900 dark:text-slate-100 mb-4 pb-2 border-b border-gray-100 dark:border-slate-800">
              Basic Part Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="font-semibold text-gray-500 dark:text-slate-400 block mb-1">Part Name</label>
                <p className="font-bold text-sm text-gray-900 dark:text-slate-100">{sparePart.name}</p>
              </div>
              <div>
                <label className="font-semibold text-gray-500 dark:text-slate-400 block mb-1">Part Number</label>
                <p className="font-mono text-sm font-semibold text-gray-900 dark:text-slate-100">{sparePart.partNumber || '—'}</p>
              </div>
              <div>
                <label className="font-semibold text-gray-500 dark:text-slate-400 block mb-1">Category</label>
                <p className="font-medium text-gray-800 dark:text-slate-200">{sparePart.category}</p>
              </div>
              <div>
                <label className="font-semibold text-gray-500 dark:text-slate-400 block mb-1">Supplier</label>
                <p className="font-medium text-gray-800 dark:text-slate-200">{sparePart.supplier || '—'}</p>
              </div>
              {sparePart.description && (
                <div className="sm:col-span-2 pt-2">
                  <label className="font-semibold text-gray-500 dark:text-slate-400 block mb-1">Description / Notes</label>
                  <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{sparePart.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Pricing Information */}
          <div className="card p-6 bg-white dark:bg-[#0c101c] border border-gray-200 dark:border-slate-800/90 rounded-xl shadow-xs">
            <h3 className="text-base font-bold text-gray-900 dark:text-slate-100 mb-4 pb-2 border-b border-gray-100 dark:border-slate-800">
              Pricing & Margin Analysis
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-gray-100 dark:border-slate-800">
                <label className="font-semibold text-gray-500 dark:text-slate-400 block mb-1">Selling Price</label>
                <p className="text-lg font-bold text-gray-900 dark:text-white">₹{(sparePart.price || 0).toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-gray-100 dark:border-slate-800">
                <label className="font-semibold text-gray-500 dark:text-slate-400 block mb-1">Cost Price (COGS)</label>
                <p className="text-lg font-bold text-gray-900 dark:text-white">₹{(sparePart.cost || 0).toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50">
                <label className="font-semibold text-emerald-700 dark:text-emerald-400 block mb-1">Profit Margin</label>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  ₹{((sparePart.price || 0) - (sparePart.cost || 0)).toLocaleString()}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50">
                <label className="font-semibold text-emerald-700 dark:text-emerald-400 block mb-1">Margin %</label>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {sparePart.cost ? (((sparePart.price || 0) - (sparePart.cost || 0)) / (sparePart.cost || 1) * 100).toFixed(1) : '0.0'}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stock Information */}
        <div className="space-y-6">
          <div className="card p-6 bg-white dark:bg-[#0c101c] border border-gray-200 dark:border-slate-800/90 rounded-xl shadow-xs">
            <h3 className="text-base font-bold text-gray-900 dark:text-slate-100 mb-4 pb-2 border-b border-gray-100 dark:border-slate-800">
              Inventory & Stock Status
            </h3>
            <div className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-gray-500 dark:text-slate-400 block mb-1">Current Available Stock</label>
                <div className="flex items-center mt-1">
                  <span className={`text-2xl font-bold ${isLowStock ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                    {Math.floor(sparePart.stock || 0)} {sparePart.unit || 'pieces'}
                  </span>
                  {isLowStock && (
                    <AlertTriangle className="h-5 w-5 text-red-500 ml-2" />
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="font-semibold text-gray-500 dark:text-slate-400 block mb-1">Threshold Min Stock</label>
                  <p className="text-sm font-semibold text-gray-900 dark:text-slate-200">{Math.floor(sparePart.minStock || 0)} {sparePart.unit || 'pieces'}</p>
                </div>
                <div>
                  <label className="font-semibold text-gray-500 dark:text-slate-400 block mb-1">Unit Type</label>
                  <p className="text-sm font-semibold text-gray-900 dark:text-slate-200 capitalize">{sparePart.unitType || 'discrete'}</p>
                </div>
              </div>
              <div className="pt-2">
                <label className="font-semibold text-gray-500 dark:text-slate-400 block mb-1">Status Badge</label>
                <div className="mt-1">
                  {isLowStock ? (
                    <span className="badge badge-danger">
                      Low Stock Warning
                    </span>
                  ) : (
                    <span className="badge badge-success">
                      Adequate Stock
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card p-6 bg-white dark:bg-[#0c101c] border border-gray-200 dark:border-slate-800/90 rounded-xl shadow-xs">
            <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100 mb-3">Quick Actions</h3>
            <div className="space-y-2.5">
              <button
                onClick={() => navigate(`/spare-parts/${id}/edit`)}
                className="btn btn-primary w-full flex items-center justify-center gap-2 text-xs py-2"
              >
                <Edit className="h-3.5 w-3.5" />
                Edit Spare Part
              </button>
              <button
                onClick={() => navigate('/spare-parts')}
                className="btn btn-secondary w-full flex items-center justify-center gap-2 text-xs py-2"
              >
                <Package className="h-3.5 w-3.5" />
                Back to Inventory
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SparePartDetails;
