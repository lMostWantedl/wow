import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { usersService } from '../services/users';
import { useAuth } from '../contexts/AuthContext';
import { AVAILABLE_SCOPES, ROLE_DEFAULT_SCOPES } from '../constants/scopes';
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  ShieldCheck, 
  ShieldAlert, 
  Phone, 
  Mail, 
  Calendar, 
  User as UserIcon,
  CheckCircle,
  XCircle,
  Clock,
  KeyRound,
  Check,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';

const UserDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  const { data: userData, isLoading } = useQuery(
    ['user', id],
    () => usersService.getUser(id!),
    {
      enabled: !!id,
    }
  );

  const activateMutation = useMutation(
    () => usersService.activateUser(id!),
    {
      onSuccess: () => {
        toast.success('User activated successfully');
        queryClient.invalidateQueries(['user', id]);
        queryClient.invalidateQueries('users');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to activate user');
      }
    }
  );

  const deactivateMutation = useMutation(
    () => usersService.deactivateUser(id!),
    {
      onSuccess: () => {
        toast.success('User deactivated successfully');
        queryClient.invalidateQueries(['user', id]);
        queryClient.invalidateQueries('users');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to deactivate user');
      }
    }
  );

  const deleteMutation = useMutation(
    () => usersService.deleteUser(id!),
    {
      onSuccess: () => {
        toast.success('User deleted successfully');
        queryClient.invalidateQueries('users');
        navigate('/users');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to delete user');
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

  if (!userData?.user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">User not found</p>
        <button onClick={() => navigate('/users')} className="btn btn-secondary">
          Back to Users
        </button>
      </div>
    );
  }

  const user = userData.user;
  const isSelf = currentUser?.id === user.id;

  const userScopes: string[] = user.scopes && user.scopes.length > 0
    ? user.scopes
    : (ROLE_DEFAULT_SCOPES[user.role] || ['bills']);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'MANAGER':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'TECHNICIAN':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const handleToggleStatus = () => {
    if (isSelf) {
      toast.error('You cannot change your own account status');
      return;
    }

    if (user.isActive) {
      if (window.confirm(`Are you sure you want to deactivate ${user.name}? They will no longer be able to log in.`)) {
        deactivateMutation.mutate();
      }
    } else {
      if (window.confirm(`Activate ${user.name}'s account?`)) {
        activateMutation.mutate();
      }
    }
  };

  const handleDelete = () => {
    if (isSelf) {
      toast.error('You cannot delete your own account');
      return;
    }

    if (window.confirm(`Are you sure you want to permanently delete user "${user.name}"? This action cannot be undone.`)) {
      deleteMutation.mutate();
    }
  };

  return (
    <div>
      {/* Top Bar */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/users')}
              className="text-gray-600 hover:text-gray-800 transition-colors"
              title="Back to Users"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getRoleBadge(user.role)}`}>
                  {user.role}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {user.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="text-gray-600 text-sm mt-0.5">User profile & system account privileges</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/users/${user.id}/edit`)}
              className="btn btn-primary flex items-center gap-2"
            >
              <Edit className="h-4 w-4" />
              Edit User & Scopes
            </button>
            {!isSelf && (
              <>
                <button
                  onClick={handleToggleStatus}
                  disabled={activateMutation.isLoading || deactivateMutation.isLoading}
                  className={`btn ${user.isActive ? 'btn-secondary text-amber-700 hover:text-amber-900' : 'btn-secondary text-green-700 hover:text-green-900'} flex items-center gap-2`}
                >
                  {user.isActive ? (
                    <>
                      <ShieldAlert className="h-4 w-4" />
                      Deactivate
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" />
                      Activate
                    </>
                  )}
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteMutation.isLoading}
                  className="btn btn-secondary text-red-600 hover:text-red-800 flex items-center gap-2"
                  title="Delete user"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Card */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <UserIcon className="h-5 w-5 text-primary-600" />
              Contact & Profile Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-gray-100 rounded-lg text-gray-600">
                  <UserIcon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Full Name</div>
                  <div className="text-base font-medium text-gray-900">{user.name}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-gray-100 rounded-lg text-gray-600">
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Phone Number</div>
                  <div className="text-base font-medium text-gray-900">{user.phone}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-gray-100 rounded-lg text-gray-600">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Email Address</div>
                  <div className="text-base font-medium text-gray-900">{user.email || 'None registered'}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-gray-100 rounded-lg text-gray-600">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Member Since</div>
                  <div className="text-base font-medium text-gray-900">{formatDate(user.createdAt)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Assigned Scopes Card */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-primary-600" />
                Authorized Scopes & Module Permissions
              </h2>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary-50 text-primary-700 border border-primary-200">
                {userScopes.length} of {AVAILABLE_SCOPES.length} Enabled
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {AVAILABLE_SCOPES.map(scope => {
                const isGranted = userScopes.includes(scope.id);

                return (
                  <div 
                    key={scope.id} 
                    className={`p-3 rounded-lg border flex items-start gap-3 ${
                      isGranted 
                        ? 'border-green-200 bg-green-50/40 text-gray-900' 
                        : 'border-gray-100 bg-gray-50/50 text-gray-400 opacity-60'
                    }`}
                  >
                    <div className="mt-0.5">
                      {isGranted ? (
                        <div className="p-1 rounded bg-green-100 text-green-700">
                          <Check className="h-3.5 w-3.5" />
                        </div>
                      ) : (
                        <div className="p-1 rounded bg-gray-200 text-gray-400">
                          <X className="h-3.5 w-3.5" />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-medium flex items-center gap-2">
                        <span className={isGranted ? 'text-gray-900' : 'text-gray-500'}>
                          {scope.name}
                        </span>
                        <span className="text-[10px] font-semibold uppercase px-1 rounded border border-gray-200 text-gray-500">
                          {scope.category}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {scope.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Role & Privileges */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary-600" />
              Role Description
            </h2>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2 font-semibold text-gray-900 mb-1">
                <span>System Role:</span>
                <span className={`px-2 py-0.5 rounded text-xs ${getRoleBadge(user.role)}`}>
                  {user.role}
                </span>
              </div>
              <p className="text-sm text-gray-600">
                {user.role === 'MANAGER' && 'Has master administrative access across the platform, including financial ledger and revenue charts, staff accounts, bill generation, inventory stock management, and customer directories.'}
                {user.role === 'TECHNICIAN' && 'Authorized garage staff member with permissions to create and edit bills, inspect customer vehicles, manage inventory spare parts, and perform vehicle service jobs.'}
                {user.role === 'CUSTOMER' && 'Registered garage customer account with access to vehicle service records, invoices, and billing history.'}
              </p>
            </div>
          </div>
        </div>

        {/* Sidebar Summary */}
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Summary</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <span className="text-sm text-gray-600">Status</span>
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  {user.isActive ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-green-700">Active</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-red-600" />
                      <span className="text-red-700">Inactive</span>
                    </>
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <span className="text-sm text-gray-600">Access Scope</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                  {userScopes.length === AVAILABLE_SCOPES.length ? 'Full Access' : `${userScopes.length} Scopes`}
                </span>
              </div>

              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <span className="text-sm text-gray-600">User ID</span>
                <span className="text-xs font-mono text-gray-500 truncate max-w-[150px]" title={user.id}>
                  {user.id}
                </span>
              </div>

              {user.updatedAt && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    Last Updated
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatDate(user.updatedAt)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDetails;
