import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useAuth } from '../contexts/AuthContext';
import { customersService } from '../services/customers';
import { ArrowLeft, Edit, Plus, Trash2, Car, AlertTriangle, FileText, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

const CustomerDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const isCustomerUser = user?.role === 'CUSTOMER';
  const isStaff = user?.role === 'MANAGER' || user?.role === 'TECHNICIAN';
  const canManage = isStaff && (user?.role === 'MANAGER' || (user?.scopes && user.scopes.includes('customers')));
  const canEdit = canManage || isCustomerUser;

  const { data: customerData, isLoading } = useQuery(
    ['customer', id],
    () => customersService.getCustomer(id!),
    {
      enabled: !!id,
    }
  );

  const deleteCustomerMutation = useMutation(
    () => customersService.deleteCustomer(id!),
    {
      onSuccess: () => {
        toast.success('Customer deleted successfully');
        setShowDeleteModal(false);
        queryClient.invalidateQueries(['customers']);
        navigate('/customers');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to delete customer');
      }
    }
  );

  const deleteVehicleMutation = useMutation(
    (vehicleId: string) => customersService.deleteCustomerVehicle(id!, vehicleId),
    {
      onSuccess: () => {
        toast.success('Vehicle removed successfully');
        queryClient.invalidateQueries(['customer', id]);
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to remove vehicle');
      }
    }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!customerData?.customer) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-slate-400">Customer not found</p>
        <button
          onClick={() => navigate('/customers')}
          className="btn btn-primary mt-4"
        >
          Back to Customers
        </button>
      </div>
    );
  }

  const customer = customerData.customer;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/customers')}
            className="p-2 rounded-lg text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            title="Back to Customers"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{customer.name}</h1>
            <p className="text-gray-600 dark:text-slate-400 text-sm">Customer Record & Registered Vehicles</p>
          </div>
        </div>

        <div className="flex items-center space-x-3 self-start sm:self-auto">
          {canEdit && (
            <button
              onClick={() => navigate(`/customers/${customer.id}/edit`)}
              className="btn btn-primary flex items-center gap-2"
            >
              <Edit className="h-4 w-4" />
              Edit Customer
            </button>
          )}
          {canManage && !isCustomerUser && (
            <button
              onClick={() => setShowDeleteModal(true)}
              className="btn bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete Customer
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Information Card */}
          <div className="card bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/50">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Contact & Profile Information</h2>
            </div>
            <div className="p-6">
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <dt className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Full Name</dt>
                  <dd className="mt-1 text-base text-gray-900 dark:text-slate-100 font-semibold">{customer.name}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Phone Number</dt>
                  <dd className="mt-1 font-mono text-base text-gray-900 dark:text-slate-100">{customer.phone}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Email Address</dt>
                  <dd className="mt-1 text-sm text-gray-800 dark:text-slate-300">{customer.email || 'Not provided'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Customer Since</dt>
                  <dd className="mt-1 text-sm text-gray-800 dark:text-slate-300">
                    {new Date(customer.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                  </dd>
                </div>
                <div className="md:col-span-2">
                  <dt className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Address</dt>
                  <dd className="mt-1 text-sm text-gray-800 dark:text-slate-300 bg-gray-50 dark:bg-slate-900/40 p-3 rounded-lg border border-gray-100 dark:border-slate-700">
                    {customer.address || 'No physical address recorded'}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Vehicles Card */}
          <div className="card bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Car className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Registered Vehicles</h2>
              </div>
              {canEdit && (
                <button
                  onClick={() => navigate(`/customers/${customer.id}/edit`)}
                  className="btn btn-secondary text-sm flex items-center gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  Manage Vehicles
                </button>
              )}
            </div>
            <div className="p-6">
              {customer.vehicles && customer.vehicles.length > 0 ? (
                <div className="space-y-4">
                  {customer.vehicles.map((vehicle, index) => (
                    <div 
                      key={vehicle.id || index} 
                      className="border border-gray-200 dark:border-slate-700 rounded-xl p-5 bg-gray-50/60 dark:bg-slate-900/50 hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base font-bold text-gray-900 dark:text-slate-100">
                              {vehicle.makeName || 'Vehicle'} {vehicle.modelName || ''} {vehicle.variantName || ''}
                            </h3>
                            {vehicle.isPrimary && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                <CheckCircle2 className="h-3 w-3" />
                                Primary Vehicle
                              </span>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm text-gray-600 dark:text-slate-400 pt-1">
                            <div>
                              <span className="text-xs font-medium text-gray-500 dark:text-slate-500">License Plate:</span>{' '}
                              <span className="font-mono font-bold text-gray-900 dark:text-slate-100">
                                {vehicle.licensePlate || 'N/A'}
                              </span>
                            </div>
                            {vehicle.year ? (
                              <div>
                                <span className="text-xs font-medium text-gray-500 dark:text-slate-500">Model Year:</span>{' '}
                                <span className="font-semibold text-gray-900 dark:text-slate-200">{vehicle.year}</span>
                              </div>
                            ) : null}
                            {vehicle.vin && (
                              <div className="sm:col-span-2">
                                <span className="text-xs font-medium text-gray-500 dark:text-slate-500">VIN / Chassis:</span>{' '}
                                <span className="font-mono text-xs bg-gray-200 dark:bg-slate-800 px-2 py-0.5 rounded text-gray-800 dark:text-slate-200 select-all">
                                  {vehicle.vin}
                                </span>
                              </div>
                            )}
                            {vehicle.colorName && (
                              <div>
                                <span className="text-xs font-medium text-gray-500 dark:text-slate-500">Color:</span>{' '}
                                <span className="text-gray-800 dark:text-slate-200">{vehicle.colorName}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {canEdit && (
                          <button
                            onClick={() => {
                              if (window.confirm('Are you sure you want to remove this vehicle from the customer record?')) {
                                deleteVehicleMutation.mutate(vehicle.id);
                              }
                            }}
                            className="p-1.5 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 rounded-md hover:bg-red-50 dark:hover:bg-slate-800 transition-colors"
                            title="Delete Vehicle"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 px-4">
                  <Car className="mx-auto h-10 w-10 text-gray-300 dark:text-slate-600 mb-2" />
                  <p className="text-gray-500 dark:text-slate-400 text-sm">No vehicles currently registered for this customer.</p>
                  {canEdit && (
                    <button
                      onClick={() => navigate(`/customers/${customer.id}/edit`)}
                      className="btn btn-primary mt-4 inline-flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Vehicle
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Cards */}
        <div className="space-y-6">
          {/* Quick Stats Card */}
          <div className="card bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/50">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Customer Stats</h3>
            </div>
            <div className="p-6">
              <dl className="space-y-5">
                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-slate-900/40 border border-gray-100 dark:border-slate-700/60">
                  <div className="flex items-center gap-2.5">
                    <FileText className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                    <dt className="text-sm font-medium text-gray-600 dark:text-slate-400">Total Bills</dt>
                  </div>
                  <dd className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                    {customer.bill_count || 0}
                  </dd>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-slate-900/40 border border-gray-100 dark:border-slate-700/60">
                  <div className="flex items-center gap-2.5">
                    <Car className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <dt className="text-sm font-medium text-gray-600 dark:text-slate-400">Vehicles on File</dt>
                  </div>
                  <dd className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {customer.vehicles?.length || 0}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Customer Deletion */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="card max-w-md w-full p-6 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-xl rounded-xl">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">
                Delete Customer
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-slate-300 mb-2">
              Are you sure you want to delete <strong className="text-gray-900 dark:text-white">{customer.name}</strong> ({customer.phone})?
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-400 mb-6 bg-gray-50 dark:bg-slate-900 p-3 rounded-lg border border-gray-200 dark:border-slate-700">
              This action will remove the customer profile, associated vehicle records, and their login portal account. Existing bill records will be preserved for accounting history.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleteCustomerMutation.isLoading}
                className="btn btn-secondary text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteCustomerMutation.mutate()}
                disabled={deleteCustomerMutation.isLoading}
                className="btn bg-red-600 hover:bg-red-700 text-white text-sm flex items-center gap-2"
              >
                {deleteCustomerMutation.isLoading ? (
                  <>
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Delete Customer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerDetails;