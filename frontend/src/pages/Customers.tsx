import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { customersService } from '../services/customers';
import { Customer } from '../types';
import { Plus, Search, Eye, Edit, Trash2, X, Car, AlertTriangle, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

const Customers: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);

  const isCustomerUser = user?.role === 'CUSTOMER';
  const isStaff = user?.role === 'MANAGER' || user?.role === 'TECHNICIAN';
  const canManage = isStaff && (user?.role === 'MANAGER' || (user?.scopes && user.scopes.includes('customers')));
  const canEdit = canManage || isCustomerUser;

  const { data: customersData, isLoading, isFetching } = useQuery(
    ['customers', page, search],
    () => customersService.getCustomers({
      page,
      limit: 10,
      ...(search.trim() && { search: search.trim() }),
    }),
    {
      keepPreviousData: true,
      staleTime: 5000,
    }
  );

  const deleteCustomerMutation = useMutation(
    (id: string) => customersService.deleteCustomer(id),
    {
      onSuccess: () => {
        toast.success('Customer deleted successfully');
        setCustomerToDelete(null);
        queryClient.invalidateQueries(['customers']);
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to delete customer');
      }
    }
  );

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const clearSearch = () => {
    setSearch('');
    setPage(1);
  };

  const handleDeleteConfirm = () => {
    if (customerToDelete) {
      deleteCustomerMutation.mutate(customerToDelete.id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const customers = customersData?.customers || [];
  const pagination = customersData?.pagination;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
            {isCustomerUser ? 'My Customer Record & Vehicles' : 'Customers'}
          </h1>
          <p className="text-gray-600 dark:text-slate-400">
            {isCustomerUser ? 'View and update your personal vehicle details and records' : 'Manage your customer database and vehicle records'}
          </p>
        </div>
        {canManage && !isCustomerUser && (
          <button
            onClick={() => navigate('/customers/create')}
            className="btn btn-primary flex items-center gap-2 self-start sm:self-auto shadow-sm"
          >
            <Plus className="h-4 w-4" />
            New Customer
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="card p-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search by customer name, phone number, or email..."
            className="input pl-10 pr-10 w-full dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
          {search && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200 p-1"
              title="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Customers Table */}
      <div className="card bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/50">
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-slate-400">Customer</th>
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-slate-400">Phone</th>
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-slate-400">Email</th>
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-slate-400">Vehicles</th>
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-slate-400">Bills</th>
                <th className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700/60">
              {customers.map((customer) => {
                const primaryVehicle = customer.vehicles?.find((v) => v.isPrimary) || customer.vehicles?.[0];
                const otherVehiclesCount = customer.vehicles ? Math.max(0, customer.vehicles.length - 1) : 0;

                return (
                  <tr 
                    key={customer.id}
                    className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors"
                  >
                    {/* Customer Name */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/customers/${customer.id}`)}
                          className="hover:text-primary-600 dark:hover:text-primary-400 text-left transition-colors"
                        >
                          {customer.name}
                        </button>
                      </div>
                      {customer.address && (
                        <p className="text-xs text-gray-500 dark:text-slate-400 truncate max-w-xs">{customer.address}</p>
                      )}
                    </td>

                    {/* Phone */}
                    <td className="py-3 px-4 font-mono text-sm text-gray-800 dark:text-slate-300">
                      {customer.phone}
                    </td>

                    {/* Email */}
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-slate-400">
                      {customer.email || '-'}
                    </td>

                    {/* Vehicles */}
                    <td className="py-3 px-4">
                      {customer.vehicles && customer.vehicles.length > 0 ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            <Car className="h-3 w-3" />
                            {primaryVehicle?.makeName || ''} {primaryVehicle?.modelName || ''}
                            {primaryVehicle?.licensePlate ? ` (${primaryVehicle.licensePlate})` : ''}
                          </span>
                          {otherVehiclesCount > 0 && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300">
                              +{otherVehiclesCount} more
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 dark:text-slate-500 italic">No vehicles</span>
                      )}
                    </td>

                    {/* Total Bills */}
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-slate-200">
                        <FileText className="h-3 w-3 text-gray-500 dark:text-slate-400" />
                        {customer.bill_count || 0}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => navigate(`/customers/${customer.id}`)}
                          className="p-1.5 text-gray-600 hover:text-primary-600 dark:text-slate-400 dark:hover:text-primary-400 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        {canEdit && (
                          <button
                            onClick={() => navigate(`/customers/${customer.id}/edit`)}
                            className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 rounded-md hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors"
                            title="Edit Customer"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        )}

                        {canManage && !isCustomerUser && (
                          <button
                            onClick={() => setCustomerToDelete(customer)}
                            className="p-1.5 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 rounded-md hover:bg-red-50 dark:hover:bg-slate-700 transition-colors"
                            title="Delete Customer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {customers.length === 0 && (
          <div className="text-center py-12 px-4">
            <Car className="mx-auto h-12 w-12 text-gray-300 dark:text-slate-600 mb-3" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-1">
              {search ? 'No customers matching your search' : 'No customers found'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-4 max-w-sm mx-auto">
              {search
                ? `No customer records matched "${search}". Try adjusting your keywords or clearing the search.`
                : 'Get started by creating your first customer profile with vehicle information.'}
            </p>
            {search ? (
              <button
                onClick={clearSearch}
                className="btn btn-secondary inline-flex items-center gap-2"
              >
                Clear Search
              </button>
            ) : canManage ? (
              <button
                onClick={() => navigate('/customers/create')}
                className="btn btn-primary inline-flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Customer
              </button>
            ) : null}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-600 dark:text-slate-400">
              Showing <span className="font-semibold text-gray-900 dark:text-slate-100">{((pagination.page - 1) * pagination.limit) + 1}</span> to{' '}
              <span className="font-semibold text-gray-900 dark:text-slate-100">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of{' '}
              <span className="font-semibold text-gray-900 dark:text-slate-100">{pagination.total}</span> customers
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || isFetching}
                className="btn btn-secondary px-3 py-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm font-medium px-2 text-gray-700 dark:text-slate-300">
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                disabled={page === pagination.pages || isFetching}
                className="btn btn-secondary px-3 py-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal for Customer Deletion */}
      {customerToDelete && (
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
              Are you sure you want to delete <strong className="text-gray-900 dark:text-white">{customerToDelete.name}</strong> ({customerToDelete.phone})?
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-400 mb-6 bg-gray-50 dark:bg-slate-900 p-3 rounded-lg border border-gray-200 dark:border-slate-700">
              This action will remove their profile and registered vehicles. Existing bill records will be preserved for accounting history.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setCustomerToDelete(null)}
                disabled={deleteCustomerMutation.isLoading}
                className="btn btn-secondary text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
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

export default Customers;