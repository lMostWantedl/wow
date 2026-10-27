import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from 'react-query';
import { usersService, CreateUserData } from '../services/users';
import { 
  AVAILABLE_SCOPES, 
  ROLE_DEFAULT_SCOPES, 
  SCOPE_PRESETS 
} from '../constants/scopes';
import { 
  ArrowLeft, 
  Save, 
  User, 
  Phone, 
  Mail, 
  Lock, 
  ShieldCheck, 
  KeyRound,
  Check
} from 'lucide-react';
import toast from 'react-hot-toast';

const CreateUser: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<CreateUserData>({
    name: '',
    phone: '',
    email: '',
    password: '',
    role: 'TECHNICIAN',
    isActive: true,
    scopes: ROLE_DEFAULT_SCOPES['TECHNICIAN']
  });

  const createUserMutation = useMutation(
    (data: CreateUserData) => usersService.createUser(data),
    {
      onSuccess: () => {
        toast.success('User created successfully!');
        queryClient.invalidateQueries('users');
        navigate('/users');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to create user');
      }
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Please enter user name');
      return;
    }

    if (!formData.phone.trim()) {
      toast.error('Please enter phone number');
      return;
    }

    if (!formData.password || formData.password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    createUserMutation.mutate({
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      email: formData.email?.trim() || undefined,
      password: formData.password,
      role: formData.role,
      isActive: formData.isActive,
      scopes: formData.scopes
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value as 'CUSTOMER' | 'TECHNICIAN' | 'MANAGER';
    setFormData(prev => ({
      ...prev,
      role: newRole,
      scopes: ROLE_DEFAULT_SCOPES[newRole] || ['bills']
    }));
  };

  const handleToggleScope = (scopeId: string) => {
    setFormData(prev => {
      const currentScopes = prev.scopes || [];
      const has = currentScopes.includes(scopeId);
      const newScopes = has 
        ? currentScopes.filter(s => s !== scopeId) 
        : [...currentScopes, scopeId];
      return { ...prev, scopes: newScopes };
    });
  };

  const applyPreset = (presetScopes: string[]) => {
    setFormData(prev => ({ ...prev, scopes: presetScopes }));
    toast.success('Applied scope preset');
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'core':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'operations':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'management':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const selectedScopes = formData.scopes || [];

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-2">
          <button
            onClick={() => navigate('/users')}
            className="text-gray-600 hover:text-gray-800 transition-colors"
            title="Back to Users"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">New User</h1>
            <p className="text-gray-600">Add a new staff member or customer and configure their access permissions</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
        {/* User Account Details */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <User className="h-5 w-5 text-primary-600" />
            User Account Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleInputChange}
                className="input"
                placeholder="e.g. Rahul Sharma"
              />
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="tel"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="input pl-10"
                  placeholder="e.g. 9876543210"
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="input pl-10"
                  placeholder="e.g. rahul@example.com (optional)"
                />
              </div>
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                System Role <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <ShieldCheck className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleRoleChange}
                  className="input pl-10"
                >
                  <option value="TECHNICIAN">Technician (Garage Staff)</option>
                  <option value="MANAGER">Manager (Full Admin Access)</option>
                  <option value="CUSTOMER">Customer (Client Portal)</option>
                </select>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {formData.role === 'MANAGER' && 'Full access to financial analytics, user management, inventory & billing.'}
                {formData.role === 'TECHNICIAN' && 'Access to create & edit bills, manage customers, vehicles, services & parts.'}
                {formData.role === 'CUSTOMER' && 'Access to view their vehicle service history and bills.'}
              </p>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="password"
                  name="password"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={handleInputChange}
                  className="input pl-10"
                  placeholder="Minimum 6 characters"
                />
              </div>
            </div>

            {/* Active Status */}
            <div className="flex items-center pt-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <span className="text-sm font-medium text-gray-900">
                  Account is Active
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Access Scope & Permissions Section */}
        <div className="card p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 pb-4 border-b border-gray-100">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-primary-600" />
                Access Scopes & Permissions
              </h2>
              <p className="text-sm text-gray-500">
                Grant or restrict access to specific system areas for this user.
              </p>
            </div>

            {/* Presets */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-gray-400 font-medium mr-1">Presets:</span>
              {SCOPE_PRESETS.map(preset => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset.scopes)}
                  className="px-2.5 py-1 text-xs font-medium bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 rounded transition-colors"
                >
                  {preset.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => applyPreset([])}
                className="px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 rounded transition-colors"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {AVAILABLE_SCOPES.map(scope => {
              const isChecked = selectedScopes.includes(scope.id);

              return (
                <div
                  key={scope.id}
                  onClick={() => handleToggleScope(scope.id)}
                  className={`p-3.5 rounded-lg border transition-all cursor-pointer select-none flex items-start gap-3 ${
                    isChecked 
                      ? 'border-primary-500 bg-primary-50/40 dark:bg-primary-950/40 shadow-sm ring-1 ring-primary-500/30' 
                      : 'border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700 hover:bg-gray-50/50 dark:hover:bg-slate-900/60'
                  }`}
                >
                  <div className="pt-0.5">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}} // handled by parent div
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded cursor-pointer"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm font-semibold text-gray-900">
                        {scope.name}
                      </span>
                      <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border ${getCategoryBadge(scope.category)}`}>
                        {scope.category}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      {scope.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>
              {selectedScopes.length} of {AVAILABLE_SCOPES.length} scopes granted
            </span>
            <span className="flex items-center gap-1 text-green-700">
              <Check className="h-3.5 w-3.5" />
              Default scopes applied based on selected role
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/users')}
            className="btn btn-secondary"
            disabled={createUserMutation.isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary flex items-center gap-2"
            disabled={createUserMutation.isLoading}
          >
            <Save className="h-4 w-4" />
            {createUserMutation.isLoading ? 'Creating...' : 'Create User'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateUser;
