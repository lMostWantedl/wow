import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { servicesService } from '../services/services';
import { ArrowLeft, Save } from 'lucide-react';
import toast from 'react-hot-toast';

interface EditServiceFormData {
  name: string;
  description: string;
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

  const { register, handleSubmit, formState: { errors }, setValue } = useForm<EditServiceFormData>({
    defaultValues: {
      name: '',
      description: '',
      basePrice: 0,
      duration: 0
    }
  });

  // Populate form when data is loaded
  useEffect(() => {
    if (data?.service) {
      setValue('name', data.service.name || '');
      setValue('description', data.service.description || '');
      setValue('basePrice', data.service.price || 0);
      setValue('duration', data.service.duration || 0);
    }
  }, [data, setValue]);

  const updateServiceMutation = useMutation(
    (data: EditServiceFormData) => servicesService.updateService(id!, {
      name: data.name,
      description: data.description,
      price: data.basePrice,
      duration: data.duration
    }),
    {
      onSuccess: () => {
        toast.success('Service updated successfully');
        queryClient.invalidateQueries('services');
        queryClient.invalidateQueries(['service', id]);
        navigate('/services');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to update service');
      }
    }
  );

  const onSubmit = async (data: EditServiceFormData) => {
    setIsSubmitting(true);
    try {
      await updateServiceMutation.mutateAsync(data);
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
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/services')}
            className="text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Service</h1>
            <p className="text-gray-600">Update service information</p>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Service Name *
            </label>
            <input
              type="text"
              className="input"
              {...register('name', { required: 'Service name is required' })}
              placeholder="Enter service name"
            />
            {errors.name && (
              <p className="text-red-600 text-sm mt-1">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              className="input"
              rows={3}
              {...register('description')}
              placeholder="Enter service description"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Base Price (₹) *
              </label>
              <input
                type="number"
                className="input"
                {...register('basePrice', { 
                  required: 'Base price is required',
                  min: { value: 0, message: 'Price must be positive' }
                })}
                step="0.01"
                min="0"
                placeholder="0.00"
              />
              {errors.basePrice && (
                <p className="text-red-600 text-sm mt-1">{errors.basePrice.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration (minutes) *
              </label>
              <input
                type="number"
                className="input"
                {...register('duration', { 
                  required: 'Duration is required',
                  min: { value: 1, message: 'Duration must be at least 1 minute' }
                })}
                min="1"
                placeholder="0"
              />
              {errors.duration && (
                <p className="text-red-600 text-sm mt-1">{errors.duration.message}</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-4">
            <button
              type="button"
              onClick={() => navigate('/services')}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {isSubmitting ? 'Updating...' : 'Update Service'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditService;
