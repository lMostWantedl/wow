import React from 'react';
import { useQuery } from 'react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { servicesService } from '../services/services';
import { ArrowLeft, Edit, Wrench } from 'lucide-react';

const ServiceDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data, isLoading, error } = useQuery(
    ['service', id],
    () => servicesService.getService(id!),
    {
      enabled: !!id,
    }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !data?.service) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-2">Service not found</h2>
        <p className="text-gray-600 dark:text-slate-400 mb-4">The service you're looking for doesn't exist.</p>
        <button
          onClick={() => navigate('/services')}
          className="btn btn-primary"
        >
          Back to Services
        </button>
      </div>
    );
  }

  const service = data.service;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/services')}
            className="p-2 rounded-lg text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            title="Back to Services"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{service.name}</h1>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Labor service description, pricing, and estimated duration</p>
          </div>
        </div>
        {user?.role !== 'CUSTOMER' && (
          <button
            onClick={() => navigate(`/services/${service.id}/edit`)}
            className="btn btn-primary flex items-center gap-2 self-start sm:self-auto shadow-sm"
          >
            <Edit className="h-4 w-4" />
            Edit Service
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="card p-6 bg-white dark:bg-[#0c101c] border border-gray-200 dark:border-slate-800/90 rounded-xl shadow-xs">
            <h2 className="text-base font-bold text-gray-900 dark:text-slate-100 mb-4 pb-2 border-b border-gray-100 dark:border-slate-800">
              Service Information
            </h2>
            <div className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-gray-500 dark:text-slate-400 block mb-1">Service Name</label>
                <p className="text-base font-bold text-gray-900 dark:text-slate-100">{service.name}</p>
              </div>
              
              {service.description && (
                <div>
                  <label className="font-semibold text-gray-500 dark:text-slate-400 block mb-1">Description & Scope</label>
                  <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{service.description}</p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-gray-100 dark:border-slate-800">
                  <label className="font-semibold text-gray-500 dark:text-slate-400 block mb-1">Base Price / Rate</label>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">₹{(service.price || 0).toLocaleString()}</p>
                </div>
                
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-gray-100 dark:border-slate-800">
                  <label className="font-semibold text-gray-500 dark:text-slate-400 block mb-1">Estimated Duration</label>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{service.duration || 0} minutes</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6 bg-white dark:bg-[#0c101c] border border-gray-200 dark:border-slate-800/90 rounded-xl shadow-xs">
            <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100 mb-3">Quick Navigation</h3>
            <div className="space-y-2.5">
              <button
                onClick={() => navigate('/services')}
                className="btn btn-secondary w-full flex items-center justify-center gap-2 text-xs py-2"
              >
                <Wrench className="h-3.5 w-3.5" />
                Back to Services Catalog
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceDetails;
