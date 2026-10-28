import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import RoleBasedRedirect from './components/RoleBasedRedirect';
import RoleBasedRoute from './components/RoleBasedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import JobCards from './pages/JobCards';
import CreateJobCard from './pages/CreateJobCard';
import JobCardDetails from './pages/JobCardDetails';
import Bills from './pages/Bills';
import CreateBill from './pages/CreateBill';
import EditBill from './pages/EditBill';
import BillDetails from './pages/BillDetails';
import Customers from './pages/Customers';
import CreateCustomer from './pages/CreateCustomer';
import CustomerDetails from './pages/CustomerDetails';
import EditCustomer from './pages/EditCustomer';
import SpareParts from './pages/SpareParts';
import CreateSparePart from './pages/CreateSparePart';
import SparePartDetails from './pages/SparePartDetails';
import EditSparePart from './pages/EditSparePart';
import Services from './pages/Services';
import CreateService from './pages/CreateService';  
import ServiceDetails from './pages/ServiceDetails';
import EditService from './pages/EditService';
import Financial from './pages/Financial';
import Users from './pages/Users';
import CreateUser from './pages/CreateUser';
import EditUser from './pages/EditUser';
import UserDetails from './pages/UserDetails';
import Profile from './pages/Profile';



function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<RoleBasedRedirect />} />
          <Route path="dashboard" element={
            <RoleBasedRoute allowedRoles={['TECHNICIAN', 'MANAGER']} requiredScope="dashboard">
              <Dashboard />
            </RoleBasedRoute>
          } />
          <Route path="job-cards" element={
            <RoleBasedRoute allowedRoles={['TECHNICIAN', 'MANAGER']} requiredScope="job_cards">
              <JobCards />
            </RoleBasedRoute>
          } />
          <Route path="job-cards/new" element={
            <RoleBasedRoute allowedRoles={['TECHNICIAN', 'MANAGER']} requiredScope="job_cards">
              <CreateJobCard />
            </RoleBasedRoute>
          } />
          <Route path="job-cards/:id" element={
            <RoleBasedRoute allowedRoles={['TECHNICIAN', 'MANAGER']} requiredScope="job_cards">
              <JobCardDetails />
            </RoleBasedRoute>
          } />
          <Route path="bills" element={<Bills />} />
          <Route path="bills/create" element={
            <RoleBasedRoute allowedRoles={['TECHNICIAN', 'MANAGER']} requiredScope="bills">
              <CreateBill />
            </RoleBasedRoute>
          } />
          <Route path="bills/:id" element={<BillDetails />} />
          <Route path="bills/:id/edit" element={
            <RoleBasedRoute allowedRoles={['TECHNICIAN', 'MANAGER']} requiredScope="bills">
              <EditBill />
            </RoleBasedRoute>
          } />
          <Route path="customers" element={
            <RoleBasedRoute allowedRoles={['TECHNICIAN', 'MANAGER']} requiredScope="customers">
              <Customers />
            </RoleBasedRoute>
          } />
          <Route path="customers/create" element={
            <RoleBasedRoute allowedRoles={['TECHNICIAN', 'MANAGER']} requiredScope="customers">
              <CreateCustomer />
            </RoleBasedRoute>
          } />
          <Route path="customers/:id" element={
            <RoleBasedRoute allowedRoles={['TECHNICIAN', 'MANAGER']} requiredScope="customers">
              <CustomerDetails />
            </RoleBasedRoute>
          } />
          <Route path="customers/:id/edit" element={
            <RoleBasedRoute allowedRoles={['TECHNICIAN', 'MANAGER']} requiredScope="customers">
              <EditCustomer />
            </RoleBasedRoute>
          } />
          <Route path="spare-parts" element={
            <RoleBasedRoute allowedRoles={['TECHNICIAN', 'MANAGER']} requiredScope="spare_parts">
              <SpareParts />
            </RoleBasedRoute>
          } />
          <Route path="spare-parts/create" element={
            <RoleBasedRoute allowedRoles={['TECHNICIAN', 'MANAGER']} requiredScope="spare_parts">
              <CreateSparePart />
            </RoleBasedRoute>
          } />
          <Route path="spare-parts/:id" element={
            <RoleBasedRoute allowedRoles={['TECHNICIAN', 'MANAGER']} requiredScope="spare_parts">
              <SparePartDetails />
            </RoleBasedRoute>
          } />
          <Route path="spare-parts/:id/edit" element={
            <RoleBasedRoute allowedRoles={['TECHNICIAN', 'MANAGER']} requiredScope="spare_parts">
              <EditSparePart />
            </RoleBasedRoute>
          } />
          <Route path="services" element={
            <RoleBasedRoute allowedRoles={['TECHNICIAN', 'MANAGER']} requiredScope="services">
              <Services />
            </RoleBasedRoute>
          } />
          <Route path="services/create" element={
            <RoleBasedRoute allowedRoles={['TECHNICIAN', 'MANAGER']} requiredScope="services">
              <CreateService />
            </RoleBasedRoute>
          } />
          <Route path="services/:id" element={
            <RoleBasedRoute allowedRoles={['TECHNICIAN', 'MANAGER']} requiredScope="services">
              <ServiceDetails />
            </RoleBasedRoute>
          } />
          <Route path="services/:id/edit" element={
            <RoleBasedRoute allowedRoles={['TECHNICIAN', 'MANAGER']} requiredScope="services">
              <EditService />
            </RoleBasedRoute>
          } />
          <Route path="financial" element={
            <RoleBasedRoute allowedRoles={['MANAGER']} requiredScope="financial">
              <Financial />
            </RoleBasedRoute>
          } />
          <Route path="users/create" element={
            <RoleBasedRoute allowedRoles={['MANAGER']} requiredScope="users">
              <CreateUser />
            </RoleBasedRoute>
          } />
          <Route path="users/:id" element={
            <RoleBasedRoute allowedRoles={['MANAGER']} requiredScope="users">
              <UserDetails />
            </RoleBasedRoute>
          } />
          <Route path="users/:id/edit" element={
            <RoleBasedRoute allowedRoles={['MANAGER']} requiredScope="users">
              <EditUser />
            </RoleBasedRoute>
          } />
          <Route path="users" element={
            <RoleBasedRoute allowedRoles={['MANAGER']} requiredScope="users">
              <Users />
            </RoleBasedRoute>
          } />
          <Route path="profile" element={<Profile />} />
        </Route>
      </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
