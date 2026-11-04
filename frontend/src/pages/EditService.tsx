import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { servicesService } from '../services/services';
import { ArrowLeft, Save, Wrench, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { SERVICE_CATEGORIES } from './CreateService';

interface EditServiceFormData {
  name: string;
  description: string;
  category: string;
  serviceType: 'LABOR' | 'EXTERNAL_SERVICE';
  defaultVendor?: string;
  defaultCost?: number;
  basePrice: number;
  duration: number;
}

const EditService: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data, isLoading, error } = useQuery(
    ['service', id],
    () => servicesService.getService(id!),
    {
      enabled: !!id,
    }
  );

  const { register, handleSubmit, watch, formState: { errors }, setValue } = useForm<EditServiceFormData>({
    defaultValues: {
      name: '',
      description: '',
      category: 'General',
      serviceType: 'LABOR',
      defaultVendor: '',
      defaultCost: 0,
      basePrice: 0,
      duration: 60
    }
  });

  const selectedServiceType = watch('serviceType');

  // Populate form when data is loaded
  useEffect(() => {
    if (data?.service) {
      setValue('name', data.service.name || '');
      setValue('description', data.service.description || '');
      setValue('category', data.service.category || 'General');
      const st = data.service.service_type || (data.service as any).serviceType || 'LABOR';
      setValue('serviceType', st);
      setValue('defaultVendor', data.service.default_vendor || (data.service as any).defaultVendor || '');
      setValue('defaultCost', data.service.default_cost || (data.service as any).defaultCost || 0);
      setValue('basePrice', data.service.price || 0);
      setValue('duration', data.service.duration || 0);
    }
  }, [data, setValue]);

  const updateServiceMutation = useMutation(
    (formData: EditServiceFormData) => servicesService.updateService(id!, {
      name: formData.name,
      description: formData.description,
      category: formData.category || 'General',
      serviceType: formData.serviceType,
      defaultVendor: formData.serviceType === 'EXTERNAL_SERVICE' ? (formData.defaultVendor || undefined) : undefined,
      defaultCost: formData.serviceType === 'EXTERNAL_SERVICE' ? (Number(formData.defaultCost) || 0) : undefined,
      price: formData.basePrice,
      duration: formData.duration
    }),
    {
      onSuccess: () => {
        toast.success('Service updated successfully');
        queryClient.invalidateQueries('services');
        queryClient.invalidateQueries('service-categories');
        queryClient.invalidateQueries(['service', id]);
        navigate('/services');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to update service');
      }
    }
  );

  const onSubmit = async (formData: EditServiceFormData) => {
    setIsSubmitting(true);
    try {
      await updateServiceMutation.mutateAsync(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !data?.service) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Service not found</h2>
        <p className="text-gray-600 mb-4">The service you're looking for doesn't exist.</p>
        <button
          onClick={() => navigate('/services')}
          className="btn btn-primary"
        >
          Back to Services
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl pb-12">
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/services')}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Edit Service</h1>
            <p className="text-sm text-gray-500 dark:text-slate-400">Update standard labor service details & pricing</p>
          </div>
        </div>
      </div>

      <div className="card p-6 bg-white dark:bg-[#0c101c] border border-gray-200 dark:border-slate-800 rounded-xl shadow-xs">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Service Classification Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Service Classification & Department *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setValue('serviceType', 'LABOR')}
                className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all ${
                  selectedServiceType === 'LABOR'
                    ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 ring-1 ring-blue-500'
                    : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 mt-0.5">
                  <Wrench className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-bold text-xs text-gray-900 dark:text-slate-100">In-House Workshop Labor</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Operations performed by garage mechanics & technicians inside workshop bays.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setValue('serviceType', 'EXTERNAL_SERVICE')}
                className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all ${
                  selectedServiceType === 'EXTERNAL_SERVICE'
                    ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 ring-1 ring-indigo-500'
                    : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 mt-0.5">
                  <ExternalLink className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-bold text-xs text-indigo-700 dark:text-indigo-300">Specialized & External Sublet</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Jobs sent to specialist labs (injector testing, turbo overhaul, lathe disc skimming).
                  </p>
                </div>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Service Name *
              </label>
              <input
                type="text"
                className="input w-full text-xs"
                {...register('name', { required: 'Service name is required' })}
                placeholder={selectedServiceType === 'EXTERNAL_SERVICE' ? 'e.g. Diesel Fuel Injector Calibration' : 'e.g. Front Brake Pads Replacement'}
              />
              {errors.name && (
                <p className="text-red-600 text-xs mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Service Category *
              </label>
              <select
                className="input w-full text-xs"
                {...register('category', { required: 'Category is required' })}
              >
                {SERVICE_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {selectedServiceType === 'EXTERNAL_SERVICE' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-900/40">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Default Sublet Vendor / Lab Name
                </label>
                <input
                  type="text"
                  className="input w-full text-xs"
                  {...register('defaultVendor')}
                  placeholder="e.g. Bosch Diesel Calibration Center"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Default Sublet Procurement Cost (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="input w-full text-xs font-mono"
                  {...register('defaultCost')}
                  placeholder="0.00"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Description
            </label>
            <textarea
              className="input w-full text-xs"
              rows={3}
              {...register('description')}
              placeholder="Enter service description"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Base Price (₹) *
              </label>
              <input
                type="number"
                className="input w-full text-xs"
                {...register('basePrice', { 
                  required: 'Base price is required',
                  min: { value: 0, message: 'Price must be positive' }
                })}
                step="0.01"
                min="0"
                placeholder="0.00"
              />
              {errors.basePrice && (
                <p className="text-red-600 text-xs mt-1">{errors.basePrice.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Duration (minutes) *
              </label>
              <input
                type="number"
                className="input w-full text-xs"
                {...register('duration', { 
                  required: 'Duration is required',
                  min: { value: 1, message: 'Duration must be at least 1 minute' }
                })}
                min="1"
                placeholder="60"
              />
              {errors.duration && (
                <p className="text-red-600 text-xs mt-1">{errors.duration.message}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => navigate('/services')}
              className="btn btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary text-xs flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {isSubmitting ? 'Saving...' : 'Update Service'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditService;
