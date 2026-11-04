import React, { useState } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { servicesService } from '../services/services';
import { ArrowLeft, Save } from 'lucide-react';
import toast from 'react-hot-toast';

export const SERVICE_CATEGORIES = [
  'Periodic & Maintenance',
  'Engine & Diagnostics',
  'Brakes & Safety',
  'Suspension & Steering',
  'Clutch & Transmission',
  'AC & Climate',
  'Electrical & Battery',
  'Fuel System & Intake',
  'Detailing & Body Care',
  'General'
];

interface CreateServiceFormData {
  name: string;
  description: string;
  category: string;
  basePrice: number;
  duration: number;
}

const CreateService: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<CreateServiceFormData>({
    defaultValues: {
      name: '',
      description: '',
      category: 'General',
      basePrice: 0,
      duration: 60
    }
  });

  const createServiceMutation = useMutation(
    (data: CreateServiceFormData) => servicesService.createService({
      name: data.name,
      description: data.description,
      category: data.category || 'General',
      price: data.basePrice,
      duration: data.duration
    }),
    {
      onSuccess: () => {
        toast.success('Service created successfully');
        queryClient.invalidateQueries('services');
        queryClient.invalidateQueries('service-categories');
        navigate('/services');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to create service');
      }
    }
  );

  const onSubmit = async (data: CreateServiceFormData) => {
    setIsSubmitting(true);
    try {
      await createServiceMutation.mutateAsync(data);
    } finally {
      setIsSubmitting(false);
    }
  };

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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Create Service</h1>
            <p className="text-sm text-gray-500 dark:text-slate-400">Add a new standard labor service to your catalog</p>
          </div>
        </div>
      </div>

      <div className="card p-6 bg-white dark:bg-[#0c101c] border border-gray-200 dark:border-slate-800 rounded-xl shadow-xs">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Service Name *
              </label>
              <input
                type="text"
                className="input w-full text-xs"
                {...register('name', { required: 'Service name is required' })}
                placeholder="e.g. AC Gas Recharge, Front Brake Overhaul"
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

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Description
            </label>
            <textarea
              className="input w-full text-xs"
              rows={3}
              {...register('description')}
              placeholder="Scope of service, operations included, inspection details..."
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
              {isSubmitting ? 'Creating...' : 'Create Service'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateService;
