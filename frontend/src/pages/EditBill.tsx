import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { billsService } from '../services/bills';
import { customersService } from '../services/customers';
import { sparePartsService } from '../services/spareParts';
import { servicesService } from '../services/services';
import { usersService } from '../services/users';
import { vehiclesService } from '../services/vehicles';
import { CreateBillData } from '../types';
import { Plus, Trash2, Save, X, UserPlus, ArrowLeft, Wrench, Package } from 'lucide-react';
import toast from 'react-hot-toast';

interface EditBillFormData {
  technicianId?: string;
  spareParts: Array<{
    sparePartId: string;
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
  services: Array<{
    serviceId: string;
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
  discountAmount?: number;
  taxRate?: number;
}

const EditBill: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showServiceDialog, setShowServiceDialog] = useState(false);
  const [selectedServiceRowIndex, setSelectedServiceRowIndex] = useState<number | null>(null);
  const [newServiceData, setNewServiceData] = useState({
    name: '',
    description: '',
    price: '',
    duration: '60'
  });

  // Fetch existing bill data
  const { data: billData, isLoading: billLoading } = useQuery(
    ['bill', id],
    () => billsService.getBill(id!),
    {
      enabled: !!id,
    }
  );

  const bill = billData?.bill;

  // Fetch other data
  const { data: customers } = useQuery('customers', () => customersService.getCustomers());
  const { data: spareParts } = useQuery('spareParts', () => sparePartsService.getSpareParts()) as { data: any };
  const { data: services } = useQuery('services', () => servicesService.getServices()) as { data: any };
  const { data: technicians } = useQuery('technicians', () => usersService.getTechnicians()) as { data: any };

  const { register, control, handleSubmit, setValue, watch, reset } = useForm<EditBillFormData>({
    defaultValues: {
      spareParts: [],
      services: [],
      discountAmount: 0,
      taxRate: 0,
    },
  });

  const { fields: sparePartFields, append: appendSparePart, remove: removeSparePartField } = useFieldArray({
    control,
    name: 'spareParts'
  });

  const { fields: serviceFields, append: appendService, remove: removeServiceField } = useFieldArray({
    control,
    name: 'services'
  });

  // Populate form with existing bill data
  useEffect(() => {
    if (bill) {
      // Convert services to form format
      const servicesData = bill.services?.map(service => ({
        serviceId: service.service_id || service.id,
        description: service.description || '',
        quantity: service.quantity != null ? Number(service.quantity) : 1,
        unitPrice: service.unit_price != null ? Number(service.unit_price) : 0
      })) || [];

      // Convert spare parts to form format
      const sparePartsData = bill.spareParts?.map(part => ({
        sparePartId: part.spare_part_id || part.id,
        description: part.description || '',
        quantity: part.quantity != null ? Number(part.quantity) : 1,
        unitPrice: part.unit_price != null ? Number(part.unit_price) : 0
      })) || [];

      reset({
        technicianId: bill.technician_id,
        spareParts: sparePartsData,
        services: servicesData,
        discountAmount: bill.discount_amount != null ? Number(bill.discount_amount) : 0,
        taxRate: bill.tax_rate != null ? Number(bill.tax_rate) : 0,
      });
    }
  }, [bill, reset]);

  const createServiceMutation = useMutation(
    (data: any) => servicesService.createService(data),
    {
      onSuccess: (data: any) => {
        toast.success('Service created successfully!');
        queryClient.invalidateQueries('services');
        setShowServiceDialog(false);
        const created = data?.service || data;
        if (created?.id && selectedServiceRowIndex !== null) {
          setValue(`services.${selectedServiceRowIndex}.serviceId`, created.id);
          setValue(`services.${selectedServiceRowIndex}.description`, created.description || '');
          setValue(`services.${selectedServiceRowIndex}.unitPrice`, parseFloat(created.price) || 0);
          setSelectedServiceRowIndex(null);
        }
        setNewServiceData({
          name: '',
          description: '',
          price: '',
          duration: '60'
        });
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to create service');
      }
    }
  );

  const handleCloseServiceDialog = () => {
    if (selectedServiceRowIndex !== null) {
      setValue(`services.${selectedServiceRowIndex}.serviceId`, '');
      setSelectedServiceRowIndex(null);
    }
    setShowServiceDialog(false);
  };

  const updateBillMutation = useMutation(
    (data: CreateBillData) => billsService.updateBill(id!, data),
    {
      onSuccess: () => {
        toast.success('Bill updated successfully!');
        queryClient.invalidateQueries(['bill', id]);
        navigate(`/bills/${id}`);
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to update bill');
      }
    }
  );

  const onSubmit = (data: EditBillFormData) => {
    const billData: CreateBillData = {
      customerId: bill?.customer_id || '',
      technicianId: data.technicianId,
      vehicleId: bill?.vehicle_id,
      serviceDate: bill?.service_date || new Date().toISOString(),
      spareParts: data.spareParts || [],
      services: data.services || [],
      discountAmount: data.discountAmount,
      taxRate: data.taxRate
    };

    updateBillMutation.mutate(billData);
  };

  const addSparePart = () => {
    appendSparePart({ sparePartId: '', description: '', quantity: 1, unitPrice: 0 });
  };

  const removeSparePart = (index: number) => {
    if (sparePartFields.length > 0) {
      removeSparePartField(index);
    }
  };

  const addService = () => {
    appendService({ serviceId: '', description: '', quantity: 1, unitPrice: 0 });
  };

  const removeService = (index: number) => {
    if (serviceFields.length > 0) {
      removeServiceField(index);
    }
  };

  const handleSparePartChange = (index: number, sparePartId: string) => {
    const sparePart = spareParts?.spareParts.find((sp: any) => sp.id === sparePartId);
    if (sparePart) {
      setValue(`spareParts.${index}.sparePartId`, sparePartId);
      setValue(`spareParts.${index}.description`, sparePart.description || '');
      setValue(`spareParts.${index}.unitPrice`, Number(sparePart.price) || 0);
    }
  };

  const handleServiceChange = (index: number, serviceId: string) => {
    if (serviceId === 'add-new') {
      setSelectedServiceRowIndex(index);
      setShowServiceDialog(true);
      return;
    }
    const service = services?.services.find((s: any) => s.id === serviceId);
    if (service) {
      setValue(`services.${index}.serviceId`, serviceId);
      setValue(`services.${index}.description`, service.description || '');
      setValue(`services.${index}.unitPrice`, Number(service.price) || 0);
    }
  };

  const watchedSpareParts = watch('spareParts') || [];
  const watchedServices = watch('services') || [];
  const watchedDiscount = watch('discountAmount') || 0;
  const watchedTaxRate = watch('taxRate') || 0;

  const sparePartsSubtotal = watchedSpareParts.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const servicesSubtotal = watchedServices.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const subtotal = sparePartsSubtotal + servicesSubtotal;
  const taxAmount = (subtotal - watchedDiscount) * (watchedTaxRate / 100);
  const totalAmount = subtotal - watchedDiscount + taxAmount;

  if (billLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Bill not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(`/bills/${id}`)}
          className="btn btn-secondary flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <h1 className="text-2xl font-bold">Edit Bill</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Bill Information */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Bill Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bill Number
              </label>
              <input
                type="text"
                value={bill.bill_number || 'N/A'}
                disabled
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer
              </label>
              <input
                type="text"
                value={bill.customer_name || 'N/A'}
                disabled
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Technician
              </label>
              <select
                {...register('technicianId')}
                className="input"
              >
                <option value="">Select Technician</option>
                {technicians?.technicians
                  ?.map((tech: any) => (
                    <option key={tech.id} value={tech.id}>
                      {tech.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        </div>

        {/* Spare Parts Section */}
        <div className="card">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Spare Parts & Materials</h2>
              <span className="text-xs bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold px-2.5 py-0.5 rounded-full">
                {sparePartFields.length}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold text-gray-600 dark:text-slate-400">
                Parts Subtotal: <span className="text-blue-600 dark:text-blue-400 font-bold">₹{sparePartsSubtotal.toLocaleString()}</span>
              </span>
              <button
                type="button"
                onClick={addSparePart}
                className="btn btn-primary flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Spare Part
              </button>
            </div>
          </div>

          {sparePartFields.map((field, index) => {
            const currentPartId = watch(`spareParts.${index}.sparePartId`);
            const selectedPart = spareParts?.spareParts.find((p: any) => p.id === currentPartId);
            const partQty = watchedSpareParts[index]?.quantity || 0;
            const partPrice = watchedSpareParts[index]?.unitPrice || 0;
            const lineTotal = partQty * partPrice;

            return (
              <div key={field.id} className="border border-gray-200 dark:border-slate-800 rounded-lg p-4 mb-4 bg-gray-50/50 dark:bg-slate-900/40">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900 dark:text-slate-100">Spare Part #{index + 1}</h3>
                    {selectedPart?.part_number && (
                      <span className="font-mono text-xs px-2 py-0.5 bg-gray-200 dark:bg-slate-800 rounded text-gray-700 dark:text-slate-300">
                        {selectedPart.part_number}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-600 dark:text-slate-400">
                      Line Total: <span className="font-bold text-gray-900 dark:text-slate-100">₹{lineTotal.toLocaleString()}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => removeSparePart(index)}
                      className="btn btn-danger flex items-center gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                      Spare Part
                    </label>
                    <select
                      {...register(`spareParts.${index}.sparePartId`)}
                      onChange={(e) => handleSparePartChange(index, e.target.value)}
                      className="input"
                    >
                      <option value="">Select Spare Part</option>
                      {spareParts?.spareParts.map((part: any) => (
                        <option key={part.id} value={part.id}>
                          {part.name} - ₹{part.price} ({part.unit || 'pieces'})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                      Part Description / Notes
                    </label>
                    <input
                      {...register(`spareParts.${index}.description`)}
                      className="input"
                      placeholder="e.g. OEM / specific specs"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                      Quantity {selectedPart?.unit ? `(${selectedPart.unit})` : ''}
                    </label>
                    <input
                      type="number"
                      {...register(`spareParts.${index}.quantity`, { valueAsNumber: true })}
                      className="input"
                      min="0.001"
                      step="0.001"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                      Unit Price (₹)
                    </label>
                    <input
                      type="number"
                      {...register(`spareParts.${index}.unitPrice`, { valueAsNumber: true })}
                      className="input"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Services Section */}
        <div className="card">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-primary-600" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Labor & Services</h2>
              <span className="text-xs bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 font-semibold px-2.5 py-0.5 rounded-full">
                {serviceFields.length}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-gray-600 dark:text-slate-400">
                Labor Subtotal: <span className="text-primary-600 dark:text-primary-400 font-bold">₹{servicesSubtotal.toLocaleString()}</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectedServiceRowIndex(null);
                  setShowServiceDialog(true);
                }}
                className="btn btn-secondary flex items-center gap-1.5 text-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                New Service
              </button>
              <button
                type="button"
                onClick={addService}
                className="btn btn-primary flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Service
              </button>
            </div>
          </div>

          {serviceFields.map((field, index) => {
            const sQty = watchedServices[index]?.quantity || 0;
            const sPrice = watchedServices[index]?.unitPrice || 0;
            const lineTotal = sQty * sPrice;

            return (
              <div key={field.id} className="border border-gray-200 dark:border-slate-800 rounded-lg p-4 mb-4 bg-gray-50/50 dark:bg-slate-900/40">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 dark:text-slate-100">Labor Service #{index + 1}</h3>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-600 dark:text-slate-400">
                      Line Total: <span className="font-bold text-gray-900 dark:text-slate-100">₹{lineTotal.toLocaleString()}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => removeService(index)}
                      className="btn btn-danger flex items-center gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                      Labor / Service Name
                    </label>
                    <select
                      {...register(`services.${index}.serviceId`)}
                      onChange={(e) => handleServiceChange(index, e.target.value)}
                      className="input"
                    >
                      <option value="">Select Service</option>
                      <option value="add-new" className="font-semibold text-primary-600 dark:text-primary-400">
                        + Add New Service...
                      </option>
                      {services?.services.map((service: any) => (
                        <option key={service.id} value={service.id}>
                          {service.name} - ₹{service.price} ({service.duration || 60}m)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                      Labor Scope / Notes
                    </label>
                    <input
                      {...register(`services.${index}.description`)}
                      className="input"
                      placeholder="Scope of work / technician notes"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                      Labor Hours / Qty
                    </label>
                    <input
                      type="number"
                      {...register(`services.${index}.quantity`, { valueAsNumber: true })}
                      className="input"
                      min="0.1"
                      step="0.1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                      Labor Charge / Rate (₹)
                    </label>
                    <input
                      type="number"
                      {...register(`services.${index}.unitPrice`, { valueAsNumber: true })}
                      className="input"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bill Summary */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Bill Summary</h2>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Labor Subtotal:</span>
              <span className="font-medium text-gray-900 dark:text-slate-100">₹{servicesSubtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Spare Parts Subtotal:</span>
              <span className="font-medium text-gray-900 dark:text-slate-100">₹{sparePartsSubtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm border-t border-gray-100 dark:border-slate-800 pt-2 font-semibold">
              <span>Combined Subtotal:</span>
              <span>₹{subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm text-green-600">
              <span>Discount:</span>
              <span>-₹{watchedDiscount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Tax ({watchedTaxRate}%):</span>
              <span>₹{taxAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-bold text-lg border-t border-gray-200 dark:border-slate-700 pt-2">
              <span>Total:</span>
              <span className="text-primary-600">₹{totalAmount.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Discount and Tax */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Discount & Tax</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Discount Amount (₹)
              </label>
              <input
                type="number"
                {...register('discountAmount', { valueAsNumber: true })}
                className="input"
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Tax Rate (%)
              </label>
              <input
                type="number"
                {...register('taxRate', { valueAsNumber: true })}
                className="input"
                min="0"
                max="100"
                step="0.01"
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate(`/bills/${id}`)}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={updateBillMutation.isLoading}
            className="btn btn-primary flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {updateBillMutation.isLoading ? 'Updating...' : 'Update Bill'}
          </button>
        </div>
      </form>

      {/* Add New Service Dialog */}
      {showServiceDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="card max-w-xl w-full p-6 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-2xl rounded-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-gray-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-50 dark:bg-primary-950/40 rounded-lg text-primary-600 dark:text-primary-400">
                  <Wrench className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">Add New Service</h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400">Create a workshop service offering and insert into this bill</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseServiceDialog}
                className="text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              createServiceMutation.mutate({
                name: newServiceData.name.trim(),
                description: newServiceData.description.trim() || undefined,
                price: parseFloat(newServiceData.price),
                duration: parseInt(newServiceData.duration) || 60
              });
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Service Name *
                </label>
                <input
                  type="text"
                  value={newServiceData.name}
                  onChange={(e) => setNewServiceData(prev => ({ ...prev, name: e.target.value }))}
                  className="input"
                  placeholder="e.g. Throttle Body & Injector Cleaning"
                  required
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Base Price (₹) *
                  </label>
                  <input
                    type="number"
                    value={newServiceData.price}
                    onChange={(e) => setNewServiceData(prev => ({ ...prev, price: e.target.value }))}
                    className="input"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Est. Duration (Minutes) *
                  </label>
                  <input
                    type="number"
                    value={newServiceData.duration}
                    onChange={(e) => setNewServiceData(prev => ({ ...prev, duration: e.target.value }))}
                    className="input"
                    min="5"
                    step="5"
                    placeholder="60"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  value={newServiceData.description}
                  onChange={(e) => setNewServiceData(prev => ({ ...prev, description: e.target.value }))}
                  className="input"
                  rows={3}
                  placeholder="Service details, labor scope, checklist items..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={handleCloseServiceDialog}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createServiceMutation.isLoading}
                  className="btn btn-primary flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {createServiceMutation.isLoading ? 'Creating...' : 'Save Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditBill;
