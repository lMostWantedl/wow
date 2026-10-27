import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNavigate, Link } from 'react-router-dom';
import { customersService } from '../services/customers';
import { usersService } from '../services/users';
import { servicesService } from '../services/services';
import { sparePartsService } from '../services/spareParts';
import { jobCardsService } from '../services/jobCards';
import { CreateJobCardData, JobCardPriority } from '../types';
import {
  ClipboardList,
  User,
  Wrench,
  Plus,
  Trash2,
  Save,
  ArrowLeft,
  Users,
  Fuel,
  Gauge,
  CheckSquare,
  Info
} from 'lucide-react';
import toast from 'react-hot-toast';

const FUEL_LEVELS = ['EMPTY', '25%', '50%', '75%', '100%'];

const DEFAULT_CHECKLIST = {
  spare_wheel: true,
  toolkit: true,
  jack: true,
  stereo: true,
  floor_mats: true,
  documents: false
};

const CreateJobCard: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Queries for data
  const { data: customersData } = useQuery('customers', () => customersService.getCustomers());
  const { data: technicians } = useQuery('technicians', () => usersService.getTechnicians()) as { data: any };
  const { data: servicesData } = useQuery('services', () => servicesService.getServices()) as { data: any };
  const { data: sparePartsData } = useQuery('spareParts', () => sparePartsService.getSpareParts()) as { data: any };

  const customersList = customersData?.customers || [];

  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [selectedTechnicianIds, setSelectedTechnicianIds] = useState<string[]>([]);
  const [priority, setPriority] = useState<JobCardPriority>('NORMAL');
  const [odometerReading, setOdometerReading] = useState<string>('');
  const [fuelLevel, setFuelLevel] = useState<string>('50%');
  const [customerComplaints, setCustomerComplaints] = useState('');
  const [technicianDiagnosis, setTechnicianDiagnosis] = useState('');
  const [visualInspectionNotes, setVisualInspectionNotes] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [checklist, setChecklist] = useState<Record<string, boolean>>(DEFAULT_CHECKLIST);

  // Initial Quotation Items
  const [services, setServices] = useState<Array<{
    serviceId: string;
    serviceName: string;
    description: string;
    hoursQty: number;
    unitPrice: number;
  }>>([]);

  const [spareParts, setSpareParts] = useState<Array<{
    sparePartId: string;
    partName: string;
    partNumber: string;
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
  }>>([]);

  // Selected customer object
  const selectedCustomer = customersList.find((c: any) => c.id === selectedCustomerId);
  const customerVehicles = selectedCustomer?.vehicles || [];

  // Toggle technician assignment (multi-select)
  const toggleTechnician = (techId: string) => {
    setSelectedTechnicianIds(prev =>
      prev.includes(techId)
        ? prev.filter(id => id !== techId)
        : [...prev, techId]
    );
  };

  // Toggle checklist item
  const toggleChecklist = (key: string) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Service helpers
  const addServiceRow = () => {
    setServices(prev => [
      ...prev,
      { serviceId: '', serviceName: '', description: '', hoursQty: 1, unitPrice: 0 }
    ]);
  };

  const removeServiceRow = (index: number) => {
    setServices(prev => prev.filter((_, i) => i !== index));
  };

  const handleServiceSelect = (index: number, serviceId: string) => {
    const s = servicesData?.services.find((item: any) => item.id === serviceId);
    setServices(prev => {
      const copy = [...prev];
      copy[index] = {
        serviceId,
        serviceName: s ? s.name : '',
        description: s ? (s.description || '') : '',
        hoursQty: 1,
        unitPrice: s ? (Number(s.price) || 0) : 0
      };
      return copy;
    });
  };

  // Spare part helpers
  const addPartRow = () => {
    setSpareParts(prev => [
      ...prev,
      { sparePartId: '', partName: '', partNumber: '', description: '', quantity: 1, unit: 'pieces', unitPrice: 0 }
    ]);
  };

  const removePartRow = (index: number) => {
    setSpareParts(prev => prev.filter((_, i) => i !== index));
  };

  const handlePartSelect = (index: number, partId: string) => {
    const p = sparePartsData?.spareParts.find((item: any) => item.id === partId);
    setSpareParts(prev => {
      const copy = [...prev];
      copy[index] = {
        sparePartId: partId,
        partName: p ? p.name : '',
        partNumber: p ? (p.part_number || '') : '',
        description: p ? (p.description || '') : '',
        quantity: 1,
        unit: p ? (p.unit || 'pieces') : 'pieces',
        unitPrice: p ? (Number(p.price) || 0) : 0
      };
      return copy;
    });
  };

  // Totals
  const servicesSubtotal = services.reduce((sum, s) => sum + (Number(s.hoursQty) * Number(s.unitPrice)), 0);
  const partsSubtotal = spareParts.reduce((sum, p) => sum + (Number(p.quantity) * Number(p.unitPrice)), 0);
  const estimatedTotal = servicesSubtotal + partsSubtotal;

  // Mutation
  const createMutation = useMutation(
    (data: CreateJobCardData) => jobCardsService.createJobCard(data),
    {
      onSuccess: (res) => {
        toast.success(`Job Card ${res.jobCard.job_card_number} created successfully!`);
        queryClient.invalidateQueries('job-cards');
        navigate(`/job-cards/${res.jobCard.id}`);
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.message || 'Failed to create Job Card');
      }
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCustomerId) {
      toast.error('Please select a customer');
      return;
    }

    const payload: CreateJobCardData = {
      customerId: selectedCustomerId,
      vehicleId: selectedVehicleId || undefined,
      priority,
      odometerReading: odometerReading ? parseInt(odometerReading, 10) : 0,
      fuelLevel,
      customerComplaints,
      technicianDiagnosis,
      inventoryChecklist: checklist,
      visualInspectionNotes,
      expectedDeliveryDate: expectedDeliveryDate || undefined,
      technicianIds: selectedTechnicianIds,
      services: services.filter(s => s.serviceName.trim() !== ''),
      spareParts: spareParts.filter(p => p.partName.trim() !== '')
    };

    createMutation.mutate(payload);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate('/job-cards')}
          className="btn btn-secondary flex items-center gap-2 p-2"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2.5">
            <ClipboardList className="h-6 w-6 text-primary-600 dark:text-primary-400" />
            New Vehicle Job Card
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Record vehicle intake vitals, customer complaints, assign technicians, and prepare quotation
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. Customer & Vehicle Intake Card */}
        <div className="card p-6 border border-gray-200 dark:border-slate-800 dark:bg-slate-850">
          <div className="flex items-center gap-2 pb-3 mb-4 border-b border-gray-100 dark:border-slate-800">
            <User className="h-5 w-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">1. Customer & Vehicle Information</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Customer Select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Select Customer *
              </label>
              <select
                value={selectedCustomerId}
                onChange={(e) => {
                  setSelectedCustomerId(e.target.value);
                  setSelectedVehicleId('');
                }}
                className="input"
                required
              >
                <option value="">-- Choose Customer --</option>
                {customersList.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone})
                  </option>
                ))}
              </select>
              <div className="mt-1 flex justify-between text-xs text-gray-500">
                <span>Select registered customer</span>
                <Link to="/customers/new" className="text-primary-600 hover:underline">
                  + Add New Customer
                </Link>
              </div>
            </div>

            {/* Vehicle Select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Select Vehicle
              </label>
              <select
                value={selectedVehicleId}
                onChange={(e) => setSelectedVehicleId(e.target.value)}
                className="input"
                disabled={!selectedCustomerId || customerVehicles.length === 0}
              >
                <option value="">
                  {customerVehicles.length > 0 ? '-- Choose Customer Vehicle --' : 'No vehicles registered for customer'}
                </option>
                {customerVehicles.map((v: any) => (
                  <option key={v.id} value={v.id}>
                    {v.licensePlate || 'No Plate'} - {v.makeName} {v.modelName} ({v.year || 'N/A'})
                  </option>
                ))}
              </select>
              {selectedCustomer && customerVehicles.length === 0 && (
                <p className="mt-1 text-xs text-amber-500">Customer has no vehicle on file. You can attach one later.</p>
              )}
            </div>

            {/* Odometer (KM) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Gauge className="h-4 w-4 text-slate-500" />
                Current Odometer Reading (KM)
              </label>
              <input
                type="number"
                value={odometerReading}
                onChange={(e) => setOdometerReading(e.target.value)}
                placeholder="e.g. 45200"
                min="0"
                className="input"
              />
            </div>

            {/* Fuel Level */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Fuel className="h-4 w-4 text-slate-500" />
                Fuel Level in Tank
              </label>
              <div className="grid grid-cols-5 gap-2">
                {FUEL_LEVELS.map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setFuelLevel(level)}
                    className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                      fuelLevel === level
                        ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                        : 'bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Job Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as JobCardPriority)}
                className="input"
              >
                <option value="LOW">Low</option>
                <option value="NORMAL">Normal</option>
                <option value="HIGH">High Priority</option>
                <option value="URGENT">Urgent Priority</option>
              </select>
            </div>

            {/* Expected Delivery Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Expected Delivery Date & Time
              </label>
              <input
                type="datetime-local"
                value={expectedDeliveryDate}
                onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                className="input"
              />
            </div>
          </div>
        </div>

        {/* 2. Multiple Technicians Assignment Card */}
        <div className="card p-6 border border-gray-200 dark:border-slate-800 dark:bg-slate-850">
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-gray-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                2. Assign Technicians (Multiple Team Members)
              </h2>
            </div>
            <span className="text-xs bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 px-2.5 py-0.5 rounded-full font-semibold">
              {selectedTechnicianIds.length} Assigned
            </span>
          </div>

          <div className="p-3 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-xl mb-4 flex items-start gap-2.5 text-xs text-blue-800 dark:text-blue-300">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <p>
              <strong>Workshop Isolation Rule:</strong> You can assign multiple technicians to this single job card for internal labor allocation and workshop tracking. These assignments are stored in the Job Card only and will <em>not</em> be carried over onto the customer's invoice.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {technicians?.technicians?.map((tech: any) => {
              const isSelected = selectedTechnicianIds.includes(tech.id);
              return (
                <div
                  key={tech.id}
                  onClick={() => toggleTechnician(tech.id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-primary-50/80 dark:bg-primary-950/40 border-primary-500 shadow-xs'
                      : 'bg-gray-50/50 dark:bg-slate-800/40 border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      isSelected ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300'
                    }`}>
                      {tech.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{tech.name}</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">{tech.phone}</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}} // handled by parent div
                    className="h-4 w-4 text-primary-600 rounded"
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Complaints, Inspection & Checklist */}
        <div className="card p-6 border border-gray-200 dark:border-slate-800 dark:bg-slate-850">
          <div className="flex items-center gap-2 pb-3 mb-4 border-b border-gray-100 dark:border-slate-800">
            <CheckSquare className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
              3. Complaints, Diagnosis & Vehicle Inspection
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Customer Reported Complaints & Symptoms *
              </label>
              <textarea
                value={customerComplaints}
                onChange={(e) => setCustomerComplaints(e.target.value)}
                rows={3}
                className="input"
                placeholder="e.g. 1. Engine knocking noise at 40km/h
2. AC not cooling effectively
3. Brake pedal pulsation"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Technician Initial Diagnosis / Scope
                </label>
                <textarea
                  value={technicianDiagnosis}
                  onChange={(e) => setTechnicianDiagnosis(e.target.value)}
                  rows={2}
                  className="input"
                  placeholder="Technician's preliminary findings or test drive observations..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Physical Condition / Scratches / Dents
                </label>
                <textarea
                  value={visualInspectionNotes}
                  onChange={(e) => setVisualInspectionNotes(e.target.value)}
                  rows={2}
                  className="input"
                  placeholder="e.g. Scratches on rear bumper left corner, minor dent on front fender..."
                />
              </div>
            </div>

            {/* Intake Inventory Checklist */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-2">
                Vehicle Intake Inventory Checklist:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                {[
                  { key: 'spare_wheel', label: 'Spare Tyre' },
                  { key: 'toolkit', label: 'Tool Kit' },
                  { key: 'jack', label: 'Jack & Handle' },
                  { key: 'stereo', label: 'Audio / Stereo' },
                  { key: 'floor_mats', label: 'Floor Mats' },
                  { key: 'documents', label: 'Car Documents' }
                ].map((item) => (
                  <label
                    key={item.key}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer text-xs font-medium ${
                      checklist[item.key]
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                        : 'bg-gray-50 dark:bg-slate-800/40 border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(checklist[item.key])}
                      onChange={() => toggleChecklist(item.key)}
                      className="rounded text-emerald-600"
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 4. Initial Quotation (Planned Services & Spare Parts) */}
        <div className="card p-6 border border-gray-200 dark:border-slate-800 dark:bg-slate-850">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                4. Initial Quotation / Estimate (Optional)
              </h2>
            </div>
            <div className="text-sm font-semibold text-gray-700 dark:text-slate-300">
              Estimated Total: <span className="text-primary-600 dark:text-primary-400 font-bold">₹{estimatedTotal.toLocaleString()}</span>
            </div>
          </div>

          <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">
            Add planned labor services and spare parts for the customer's preliminary estimate. You can always add extra work later as repairs proceed.
          </p>

          {/* Planned Labor Services */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-800 dark:text-slate-200 uppercase tracking-wide">
                Planned Labor Services ({services.length})
              </h3>
              <button
                type="button"
                onClick={addServiceRow}
                className="text-xs text-primary-600 dark:text-primary-400 font-semibold flex items-center gap-1 hover:underline"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Service
              </button>
            </div>

            {services.map((item, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-6 gap-3 p-3 bg-gray-50/70 dark:bg-slate-900/40 rounded-xl border border-gray-200/80 dark:border-slate-800">
                <div className="md:col-span-2">
                  <select
                    value={item.serviceId}
                    onChange={(e) => handleServiceSelect(index, e.target.value)}
                    className="input text-xs"
                  >
                    <option value="">-- Select Service --</option>
                    {servicesData?.services.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.name} (₹{s.price})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => {
                      const val = e.target.value;
                      setServices(prev => {
                        const copy = [...prev];
                        copy[index].description = val;
                        return copy;
                      });
                    }}
                    placeholder="Work scope / technician notes"
                    className="input text-xs"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    value={item.hoursQty}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setServices(prev => {
                        const copy = [...prev];
                        copy[index].hoursQty = val;
                        return copy;
                      });
                    }}
                    step="0.1"
                    min="0.1"
                    placeholder="Hours"
                    className="input text-xs text-center"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={item.unitPrice}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setServices(prev => {
                        const copy = [...prev];
                        copy[index].unitPrice = val;
                        return copy;
                      });
                    }}
                    placeholder="Rate (₹)"
                    className="input text-xs text-right"
                  />
                  <button
                    type="button"
                    onClick={() => removeServiceRow(index)}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Planned Spare Parts */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-800 dark:text-slate-200 uppercase tracking-wide">
                Planned Spare Parts ({spareParts.length})
              </h3>
              <button
                type="button"
                onClick={addPartRow}
                className="text-xs text-primary-600 dark:text-primary-400 font-semibold flex items-center gap-1 hover:underline"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Spare Part
              </button>
            </div>

            {spareParts.map((item, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-6 gap-3 p-3 bg-gray-50/70 dark:bg-slate-900/40 rounded-xl border border-gray-200/80 dark:border-slate-800">
                <div className="md:col-span-2">
                  <select
                    value={item.sparePartId}
                    onChange={(e) => handlePartSelect(index, e.target.value)}
                    className="input text-xs"
                  >
                    <option value="">-- Select Spare Part --</option>
                    {sparePartsData?.spareParts.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.name} - ₹{p.price} ({p.unit || 'pcs'})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSpareParts(prev => {
                        const copy = [...prev];
                        copy[index].description = val;
                        return copy;
                      });
                    }}
                    placeholder="Part specs / notes"
                    className="input text-xs"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setSpareParts(prev => {
                        const copy = [...prev];
                        copy[index].quantity = val;
                        return copy;
                      });
                    }}
                    step="0.001"
                    min="0.001"
                    placeholder="Qty"
                    className="input text-xs text-center"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={item.unitPrice}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setSpareParts(prev => {
                        const copy = [...prev];
                        copy[index].unitPrice = val;
                        return copy;
                      });
                    }}
                    placeholder="Price (₹)"
                    className="input text-xs text-right"
                  />
                  <button
                    type="button"
                    onClick={() => removePartRow(index)}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => navigate('/job-cards')}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createMutation.isLoading}
            className="btn btn-primary flex items-center gap-2 px-6 shadow-md"
          >
            <Save className="h-4 w-4" />
            {createMutation.isLoading ? 'Creating Job Card...' : 'Create Job Card & Open'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateJobCard;
