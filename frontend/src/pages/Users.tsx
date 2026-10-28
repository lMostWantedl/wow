import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usersService } from '../services/users';
import { Plus, Search, Edit, Trash2, Power, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

const ROLE_DEFAULT_SCOPES: Record<string, string[]> = {
  MANAGER: ['dashboard', 'job_cards', 'bills', 'customers', 'spare_parts', 'services', 'financial', 'users'],
  TECHNICIAN: ['dashboard', 'job_cards', 'bills', 'customers', 'spare_parts', 'services'],
  CUSTOMER: ['bills']
};

const Users: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const { data: usersData, isLoading, refetch } = useQuery(
    ['users', page, search, roleFilter],
    () => usersService.getUsers({
      page,
      limit: 10,
      ...(search && { search }),
      ...(roleFilter && { role: roleFilter }),
    }),
    {
      keepPreviousData: true,
      enabled: user?.role === 'MANAGER'
    }
  );

  const activateMutation = useMutation(
    (id: string) => usersService.activateUser(id),
    {
      onSuccess: () => {
        toast.success('User activated successfully');
        refetch();
        queryClient.invalidateQueries('users');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to activate user');
      }
    }
  );

  const deactivateMutation = useMutation(
    (id: string) => usersService.deactivateUser(id),
    {
      onSuccess: () => {
        toast.success('User deactivated successfully');
        refetch();
        queryClient.invalidateQueries('users');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to deactivate user');
      }
    }
  );

  const deleteMutation = useMutation(
    (id: string) => usersService.deleteUser(id),
    {
      onSuccess: () => {
        toast.success('User deleted successfully');
        refetch();
        queryClient.invalidateQueries('users');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to delete user');
      }
    }
  );

  if (user?.role !== 'MANAGER') {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-slate-400 font-medium">Access denied. Manager role required.</p>
      </div>
    );
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'MANAGER':
        return 'badge-danger';
      case 'TECHNICIAN':
        return 'badge-warning';
      case 'CUSTOMER':
        return 'badge-info';
      default:
        return 'badge-info';
    }
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? 'badge-success' : 'badge-danger';
  };

  const handleToggleStatus = (userItem: any) => {
    const isUserActive = userItem.isActive ?? (userItem as any).is_active;
    if (isUserActive) {
      if (window.confirm(`Are you sure you want to deactivate ${userItem.name}?`)) {
        deactivateMutation.mutate(userItem.id);
      }
    } else {
      if (window.confirm(`Are you sure you want to activate ${userItem.name}?`)) {
        activateMutation.mutate(userItem.id);
      }
    }
  };

  const handleDeleteUser = (userItem: any) => {
    if (window.confirm(`Are you sure you want to delete ${userItem.name}? This action cannot be undone.`)) {
      deleteMutation.mutate(userItem.id);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">User Management</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Manage workshop personnel, customer accounts, and access scopes</p>
        </div>
        <button
          onClick={() => navigate('/users/create')}
          className="btn btn-primary flex items-center gap-2 self-start sm:self-auto shadow-sm"
        >
          <Plus className="h-4 w-4" />
          New User
        </button>
      </div>

      {/* Filters */}
      <div className="card p-5 bg-white dark:bg-[#0c101c] border border-gray-200 dark:border-slate-800/90 rounded-xl shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Search by name, phone, or email..."
                className="input pl-10 w-full text-xs"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">Role Filter</label>
            <select
              className="input text-xs"
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Roles</option>
              <option value="MANAGER">Manager</option>
              <option value="TECHNICIAN">Technician</option>
              <option value="CUSTOMER">Customer</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearch('');
                setRoleFilter('');
                setPage(1);
              }}
              className="btn btn-secondary w-full text-xs py-2"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="card bg-white dark:bg-[#0c101c] border border-gray-200 dark:border-slate-800/90 rounded-xl shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80">
                  <th className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Name</th>
                  <th className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Phone</th>
                  <th className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Email</th>
                  <th className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Role</th>
                  <th className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Scopes</th>
                  <th className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60">
                {usersData?.users.map((userItem) => {
                  const isUserActive = userItem.isActive ?? (userItem as any).is_active ?? true;
                  const isCurrentAuthUser = userItem.id === user?.id;
                  const itemScopes = userItem.scopes && userItem.scopes.length > 0 
                    ? userItem.scopes 
                    : (ROLE_DEFAULT_SCOPES[userItem.role] || ['bills']);

                  return (
                    <tr key={userItem.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-gray-900 dark:text-slate-100">
                        {userItem.name}
                        {isCurrentAuthUser && (
                          <span className="ml-2 text-[10px] font-semibold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/60 px-2 py-0.5 rounded-full border border-primary-200 dark:border-primary-800">
                            You
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300">{userItem.phone}</td>
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400">{userItem.email || '—'}</td>
                      <td className="py-3 px-4">
                        <span className={`badge ${getRoleBadge(userItem.role)}`}>
                          {userItem.role}
                        </span>
                        {userItem.role !== 'CUSTOMER' && Number(userItem.baseSalary || (userItem as any).base_salary) > 0 && (
                          <span className="block mt-1 font-mono text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                            ₹{Number(userItem.baseSalary || (userItem as any).base_salary).toLocaleString('en-IN')}/mo
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {itemScopes.slice(0, 3).map((scope: string) => (
                            <span 
                              key={scope} 
                              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                            >
                              {scope.replace('_', ' ')}
                            </span>
                          ))}
                          {itemScopes.length > 3 && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                              +{itemScopes.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`badge ${getStatusBadge(isUserActive)}`}>
                          {isUserActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => navigate(`/users/${userItem.id}`)}
                            className="p-1.5 rounded-lg text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/50 transition-colors"
                            title="View User Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => navigate(`/users/${userItem.id}/edit`)}
                            className="p-1.5 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors"
                            title="Edit User"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          {!isCurrentAuthUser && (
                            <>
                              <button
                                onClick={() => handleToggleStatus(userItem)}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  isUserActive 
                                    ? 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50' 
                                    : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50'
                                }`}
                                title={isUserActive ? 'Deactivate User' : 'Activate User'}
                              >
                                <Power className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(userItem)}
                                className="p-1.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
                                title="Delete User"
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
        )}

        {usersData?.users.length === 0 && !isLoading && (
          <div className="text-center py-12 text-slate-400">
            <p>No users found matching your filters</p>
          </div>
        )}

        {/* Pagination */}
        {usersData?.pagination && usersData.pagination.pages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-600 dark:text-slate-400">
                Showing {((usersData.pagination.page - 1) * usersData.pagination.limit) + 1} to{' '}
                {Math.min(usersData.pagination.page * usersData.pagination.limit, usersData.pagination.total)} of{' '}
                {usersData.pagination.total} users
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
                  disabled={page === usersData.pagination.pages}
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

export default Users;
