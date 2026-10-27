import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import {
  LayoutDashboard,
  ClipboardList,
  FileText,
  Users,
  Package,
  Wrench,
  DollarSign,
  User,
  LogOut,
  Menu,
  X,
  Plus,
  Sun,
  Moon,
  Box,
} from 'lucide-react';

const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const navigation = (() => {
    const hasScope = (scopeId: string) => {
      if (user?.role === 'MANAGER') return true;
      if (scopeId === 'job_cards' && user?.role === 'TECHNICIAN') return true;
      if (user?.scopes && user.scopes.length > 0) {
        return user.scopes.includes(scopeId);
      }
      if (user?.role === 'TECHNICIAN') {
        return ['dashboard', 'job_cards', 'bills', 'customers', 'spare_parts', 'services'].includes(scopeId);
      }
      if (user?.role === 'CUSTOMER') {
        return scopeId === 'bills';
      }
      return false;
    };

    const items = [];
    if (hasScope('dashboard')) {
      items.push({ name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard });
    }
    if (hasScope('job_cards')) {
      items.push({ name: 'Job Cards', href: '/job-cards', icon: ClipboardList });
    }
    if (hasScope('bills')) {
      items.push({ name: 'Bills', href: '/bills', icon: FileText });
    }
    if (hasScope('customers')) {
      items.push({ name: 'Customers', href: '/customers', icon: Users });
    }
    if (hasScope('spare_parts')) {
      items.push({ name: 'Spare Parts', href: '/spare-parts', icon: Package });
    }
    if (hasScope('services')) {
      items.push({ name: 'Services', href: '/services', icon: Wrench });
    }
    if (hasScope('financial')) {
      items.push({ name: 'Financial', href: '/financial', icon: DollarSign });
    }
    if (hasScope('users')) {
      items.push({ name: 'Users', href: '/users', icon: User });
    }

    if (items.length === 0) {
      items.push({ name: 'Bills', href: '/bills', icon: FileText });
    }

    return items;
  })();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (href: string) => location.pathname === href;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-[#0b0f19] border-r border-slate-850 shadow-2xl">
          <div className="flex h-18 items-center justify-between px-4 border-b border-slate-800/80">
            <div className="flex items-center gap-3">
              <div className="p-1 rounded-xl bg-slate-950/90 border border-slate-800 shadow-inner flex items-center justify-center">
                <img 
                  src="/logo.png" 
                  alt="Wings on Wheels Logo" 
                  className="h-9 w-auto object-contain drop-shadow-sm"
                />
              </div>
              <div>
                <h1 className="text-base font-bold text-white leading-tight">Wings on Wheels</h1>
                <p className="text-[10px] font-bold text-primary-400 uppercase tracking-widest">Garage Portal</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-slate-400 hover:text-white"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex-1 space-y-1 px-3 py-4">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.name}
                  onClick={() => {
                    navigate(item.href);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${
                    isActive(item.href)
                      ? 'bg-primary-950/70 text-primary-300 font-semibold border-r-2 border-primary-500 shadow-sm'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
                  }`}
                >
                  <Icon className={`mr-3 h-5 w-5 ${isActive(item.href) ? 'text-primary-400' : 'text-slate-500'}`} />
                  {item.name}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col z-30">
        <div className="flex flex-col flex-grow bg-[#0c101c] border-r border-slate-800/80 shadow-lg">
          <div className="flex h-20 items-center px-4 py-3 border-b border-slate-800/80">
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-xl bg-slate-950/90 border border-slate-800/90 shadow-inner flex items-center justify-center">
                <img 
                  src="/logo.png" 
                  alt="Wings on Wheels Logo" 
                  className="h-10 w-auto object-contain drop-shadow-sm"
                />
              </div>
              <div>
                <h1 className="text-base font-bold text-white leading-tight tracking-tight">Wings on Wheels</h1>
                <p className="text-[10px] font-bold text-primary-400 uppercase tracking-widest">Garage Portal</p>
              </div>
            </div>
          </div>
          <nav className="flex-1 space-y-1.5 px-3 py-4">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.name}
                  onClick={() => navigate(item.href)}
                  className={`w-full flex items-center px-3.5 py-2.5 text-sm font-medium rounded-lg transition-all ${
                    isActive(item.href)
                      ? 'bg-primary-950/70 text-primary-300 font-semibold border-r-2 border-primary-500 shadow-sm'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
                  }`}
                >
                  <Icon className={`mr-3 h-5 w-5 ${isActive(item.href) ? 'text-primary-400' : 'text-slate-500'}`} />
                  {item.name}
                </button>
              );
            })}
          </nav>
          <div className="flex-shrink-0 border-t border-slate-800/80 p-4 bg-[#0a0e19]">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-9 w-9 rounded-full bg-primary-600 flex items-center justify-center text-white shadow-sm">
                  <span className="text-sm font-bold">
                    {user?.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="ml-3 truncate">
                <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
                <p className="text-xs text-primary-400 font-medium capitalize">{user?.role.toLowerCase()}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="mt-3 w-full flex items-center px-3 py-2 text-sm font-medium text-slate-400 rounded-lg hover:bg-slate-800/70 hover:text-white transition-colors"
            >
              <LogOut className="mr-3 h-4 w-4 text-slate-500" />
              Sign out
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200/80 dark:border-slate-800 bg-white/95 dark:bg-[#0f1423]/95 backdrop-blur-md px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8 transition-colors">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-700 dark:text-slate-300 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1"></div>
            <div className="flex items-center gap-x-3 lg:gap-x-4">
              {/* 3D Live Floor shortcut */}
              <a
                href="http://127.0.0.1:4317"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary-600/10 text-primary-600 dark:text-primary-400 hover:bg-primary-600/20 border border-primary-500/30 transition-all shadow-xs"
                title="Open 3D Live Agent & Workshop Floor"
              >
                <Box className="h-4 w-4 text-primary-500 animate-pulse" />
                <span>3D Live Floor</span>
              </a>

              {/* Dark/Light mode toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-full text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
              >
                {isDark ? (
                  <Sun className="h-5 w-5 text-amber-400" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </button>

              {/* Quick actions */}
              {user?.role !== 'CUSTOMER' && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate('/job-cards/new')}
                    className="btn btn-secondary hidden sm:flex items-center gap-1.5 text-xs py-1.5 px-3"
                    title="Intake Vehicle / Create Job Card"
                  >
                    <ClipboardList className="h-4 w-4 text-primary-500" />
                    <span>New Job Card</span>
                  </button>
                  <button
                    onClick={() => navigate('/bills/create')}
                    className="btn btn-primary flex items-center gap-2 text-sm py-1.5 px-3.5"
                  >
                    <Plus className="h-4 w-4" />
                    New Bill
                  </button>
                </div>
              )}
              
              {/* User menu */}
              <div className="flex items-center gap-x-3">
                <div className="hidden lg:block text-right">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{user?.name}</p>
                  <p className="text-xs text-primary-600 dark:text-primary-400 font-medium capitalize">{user?.role.toLowerCase()}</p>
                </div>
                <button
                  onClick={() => navigate('/profile')}
                  className="h-9 w-9 rounded-full bg-primary-600 flex items-center justify-center hover:bg-primary-700 text-white shadow-sm transition-colors"
                  title="My Profile"
                >
                  <span className="text-sm font-bold">
                    {user?.name?.charAt(0).toUpperCase()}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
