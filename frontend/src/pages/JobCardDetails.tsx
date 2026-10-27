import React, { useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { jobCardsService } from '../services/jobCards';
import { usersService } from '../services/users';
import { servicesService } from '../services/services';
import { sparePartsService } from '../services/spareParts';
import { JobCardStatus } from '../types';
import { format, isValid } from 'date-fns';
import { useReactToPrint } from 'react-to-print';
import toast from 'react-hot-toast';
import {
  ClipboardList,
  ArrowLeft,
  Wrench,
  Package,
  Plus,
  Trash2,
  Printer,
  FileText,
  CheckCircle2,
  AlertTriangle,
  User,
  Car,
  Fuel,
  Gauge,
  Users,
  ShieldCheck,
  CheckSquare,
  XSquare,
  Sparkles,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  DollarSign
} from 'lucide-react';

const safeFormatDate = (dateString: string | null | undefined, formatString: string = 'MMM dd, yyyy'): string => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return isValid(date) ? format(date, formatString) : 'N/A';
};

const formatQuantity = (qty: any): string => {
  if (qty == null || qty === '') return '0';
  const num = parseFloat(qty);
  if (isNaN(num)) return String(qty);
  if (Number.isInteger(num)) return num.toString();
  return parseFloat(num.toFixed(3)).toString();
};

const formatCurrency = (amount: any): string => {
  const num = Number(amount) || 0;
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const JobCardDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Print refs
  const jobCardPrintRef = useRef<HTMLDivElement>(null);
  const quotationPrintRef = useRef<HTMLDivElement>(null);

  // Modals state
  const [showExtraWorkModal, setShowExtraWorkModal] = useState(false);
  const [extraWorkTab, setExtraWorkTab] = useState<'service' | 'part'>('service');
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showTechModal, setShowTechModal] = useState(false);

  // Extra work form states
  const [extraServiceId, setExtraServiceId] = useState('');
  const [extraServiceName, setExtraServiceName] = useState('');
  const [extraServiceDesc, setExtraServiceDesc] = useState('');
  const [extraServiceHours, setExtraServiceHours] = useState('1');
  const [extraServicePrice, setExtraServicePrice] = useState('0');
  const [extraServiceTechId, setExtraServiceTechId] = useState('');

  const [extraPartId, setExtraPartId] = useState('');
  const [extraPartName, setExtraPartName] = useState('');
  const [extraPartNumber, setExtraPartNumber] = useState('');
  const [extraPartDesc, setExtraPartDesc] = useState('');
  const [extraPartQty, setExtraPartQty] = useState('1');
  const [extraPartUnit, setExtraPartUnit] = useState('pieces');
  const [extraPartPrice, setExtraPartPrice] = useState('0');

  // Convert to invoice states
  const [invoiceDiscount, setInvoiceDiscount] = useState('0');
  const [invoiceTaxRate, setInvoiceTaxRate] = useState('18');
  const [invoiceNotes, setInvoiceNotes] = useState('');

  // Edit technicians state
  const [editTechIds, setEditTechIds] = useState<string[]>([]);

  // Fetch Job Card
  const { data: jobCardData, isLoading } = useQuery(
    ['job-card', id],
    () => jobCardsService.getJobCard(id!),
    {
      enabled: !!id,
      onSuccess: (data) => {
        if (data?.jobCard?.technicians) {
          setEditTechIds(data.jobCard.technicians.map((t: any) => t.technician_id));
        }
      }
    }
  );

  // Catalogs for adding extra work
  const { data: technicians } = useQuery('technicians', () => usersService.getTechnicians()) as { data: any };
  const { data: servicesCatalog } = useQuery('services', () => servicesService.getServices()) as { data: any };
  const { data: sparePartsCatalog } = useQuery('spareParts', () => sparePartsService.getSpareParts()) as { data: any };

  const jobCard = jobCardData?.jobCard;

  // Print handlers
  const handlePrintJobCard = useReactToPrint({
    content: () => jobCardPrintRef.current,
    documentTitle: `JobCard-${jobCard?.job_card_number || 'Print'}`,
  });

  const handlePrintQuotation = useReactToPrint({
    content: () => quotationPrintRef.current,
    documentTitle: `Quotation-${jobCard?.job_card_number || 'Print'}`,
  });

  // Status update mutation
  const updateStatusMutation = useMutation(
    (newStatus: JobCardStatus) => jobCardsService.updateJobCard(id!, { status: newStatus }),
    {
      onSuccess: () => {
        toast.success('Job Card status updated');
        queryClient.invalidateQueries(['job-card', id]);
        queryClient.invalidateQueries('job-cards');
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.message || 'Failed to update status');
      }
    }
  );

  // Technicians update mutation
  const updateTechsMutation = useMutation(
    (techIds: string[]) => jobCardsService.updateJobCard(id!, { technicianIds: techIds }),
    {
      onSuccess: () => {
        toast.success('Technicians updated successfully');
        setShowTechModal(false);
        queryClient.invalidateQueries(['job-card', id]);
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.message || 'Failed to update technicians');
      }
    }
  );

  // Add extra service mutation
  const addServiceMutation = useMutation(
    (data: any) => jobCardsService.addService(id!, data),
    {
      onSuccess: () => {
        toast.success('Extra service added to Job Card!');
        setShowExtraWorkModal(false);
        resetServiceForm();
        queryClient.invalidateQueries(['job-card', id]);
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.message || 'Failed to add service');
      }
    }
  );

  // Remove service mutation
  const removeServiceMutation = useMutation(
    (serviceId: string) => jobCardsService.removeService(id!, serviceId),
    {
      onSuccess: () => {
        toast.success('Service removed');
        queryClient.invalidateQueries(['job-card', id]);
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.message || 'Failed to remove service');
      }
    }
  );

  // Add extra spare part mutation
  const addPartMutation = useMutation(
    (data: any) => jobCardsService.addSparePart(id!, data),
    {
      onSuccess: () => {
        toast.success('Extra spare part added to Job Card!');
        setShowExtraWorkModal(false);
        resetPartForm();
        queryClient.invalidateQueries(['job-card', id]);
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.message || 'Failed to add spare part');
      }
    }
  );

  // Remove spare part mutation
  const removePartMutation = useMutation(
    (partId: string) => jobCardsService.removeSparePart(id!, partId),
    {
      onSuccess: () => {
        toast.success('Spare part removed');
        queryClient.invalidateQueries(['job-card', id]);
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.message || 'Failed to remove spare part');
      }
    }
  );

  // Convert to Invoice mutation
  const convertToInvoiceMutation = useMutation(
    (data: any) => jobCardsService.convertToInvoice(id!, data),
    {
      onSuccess: (res) => {
        toast.success('Successfully converted to Invoice!');
        setShowInvoiceModal(false);
        queryClient.invalidateQueries(['job-card', id]);
        queryClient.invalidateQueries('job-cards');
        queryClient.invalidateQueries('bills');
        if (res.billId) {
          navigate(`/bills/${res.billId}`);
        }
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.message || 'Failed to convert to invoice');
      }
    }
  );

  const resetServiceForm = () => {
    setExtraServiceId('');
    setExtraServiceName('');
    setExtraServiceDesc('');
    setExtraServiceHours('1');
    setExtraServicePrice('0');
    setExtraServiceTechId('');
  };

  const resetPartForm = () => {
    setExtraPartId('');
    setExtraPartName('');
    setExtraPartNumber('');
    setExtraPartDesc('');
    setExtraPartQty('1');
    setExtraPartUnit('pieces');
    setExtraPartPrice('0');
  };

  const handleSelectCatalogService = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sId = e.target.value;
    setExtraServiceId(sId);
    if (sId) {
      const found = servicesCatalog?.services?.find((s: any) => s.id === sId) ||
                    servicesCatalog?.find((s: any) => s.id === sId);
      if (found) {
        setExtraServiceName(found.name);
        setExtraServiceDesc(found.description || '');
        setExtraServicePrice(found.rate || found.price || '0');
      }
    }
  };

  const handleSelectCatalogPart = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pId = e.target.value;
    setExtraPartId(pId);
    if (pId) {
      const found = sparePartsCatalog?.spareParts?.find((p: any) => p.id === pId) ||
                    sparePartsCatalog?.find((p: any) => p.id === pId);
      if (found) {
        setExtraPartName(found.name);
        setExtraPartNumber(found.part_number || '');
        setExtraPartDesc(found.description || '');
        setExtraPartPrice(found.price || '0');
        setExtraPartUnit(found.unit || 'pieces');
      }
    }
  };

  const handleAddExtraService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!extraServiceName.trim()) {
      toast.error('Please enter or select a service name');
      return;
    }
    addServiceMutation.mutate({
      serviceId: extraServiceId || undefined,
      serviceName: extraServiceName,
      description: extraServiceDesc,
      hoursQty: parseFloat(extraServiceHours) || 1,
      unitPrice: parseFloat(extraServicePrice) || 0,
      isExtraWork: true,
      technicianId: extraServiceTechId || undefined
    });
  };

  const handleAddExtraPart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!extraPartName.trim()) {
      toast.error('Please enter or select a spare part');
      return;
    }
    addPartMutation.mutate({
      sparePartId: extraPartId || undefined,
      partName: extraPartName,
      partNumber: extraPartNumber,
      description: extraPartDesc,
      quantity: parseFloat(extraPartQty) || 1,
      unit: extraPartUnit,
      unitPrice: parseFloat(extraPartPrice) || 0,
      isExtraWork: true
    });
  };

  const handleConvertToInvoiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    convertToInvoiceMutation.mutate({
      discountAmount: parseFloat(invoiceDiscount) || 0,
      taxRate: parseFloat(invoiceTaxRate) || 0,
      notes: invoiceNotes
    });
  };

  const toggleTechSelection = (techId: string) => {
    setEditTechIds(prev =>
      prev.includes(techId) ? prev.filter(t => t !== techId) : [...prev, techId]
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!jobCard) {
    return (
      <div className="text-center py-16">
        <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">Job Card Not Found</h2>
        <p className="text-gray-500 dark:text-slate-400 mt-2">The requested job card does not exist or has been removed.</p>
        <Link to="/job-cards" className="mt-6 inline-flex items-center btn btn-primary">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Job Cards
        </Link>
      </div>
    );
  }

  const services = jobCard.services || [];
  const spareParts = jobCard.spareParts || [];

  // Categorize initial quotation vs extra work
  const initialServices = services.filter(s => !s.is_extra_work);
  const extraServices = services.filter(s => s.is_extra_work);

  const initialParts = spareParts.filter(p => !p.is_extra_work);
  const extraParts = spareParts.filter(p => p.is_extra_work);

  // Subtotals
  const initialLaborSubtotal = initialServices.reduce((sum, s) => sum + Number(s.total_price || 0), 0);
  const extraLaborSubtotal = extraServices.reduce((sum, s) => sum + Number(s.total_price || 0), 0);
  const totalLabor = initialLaborSubtotal + extraLaborSubtotal;

  const initialPartsSubtotal = initialParts.reduce((sum, p) => sum + Number(p.total_price || 0), 0);
  const extraPartsSubtotal = extraParts.reduce((sum, p) => sum + Number(p.total_price || 0), 0);
  const totalParts = initialPartsSubtotal + extraPartsSubtotal;

  const totalEstimate = initialLaborSubtotal + initialPartsSubtotal;
  const totalExtra = extraLaborSubtotal + extraPartsSubtotal;
  const grandTotal = totalLabor + totalParts;

  // Invoice calculations for modal preview
  const previewDiscount = parseFloat(invoiceDiscount) || 0;
  const previewTaxRate = parseFloat(invoiceTaxRate) || 0;
  const previewTaxable = Math.max(0, grandTotal - previewDiscount);
  const previewTaxAmount = previewTaxable * (previewTaxRate / 100);
  const previewInvoiceTotal = previewTaxable + previewTaxAmount;

  const isLocked = jobCard.status === 'INVOICED' || jobCard.status === 'CANCELLED';

  const getStatusColor = (status: JobCardStatus) => {
    switch (status) {
      case 'OPEN':
        return 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'ESTIMATED':
        return 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'IN_PROGRESS':
        return 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'COMPLETED':
        return 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'INVOICED':
        return 'bg-green-100 dark:bg-green-950/60 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800';
      case 'CANCELLED':
        return 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800';
      default:
        return 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-red-500 text-white';
      case 'HIGH':
        return 'bg-orange-500 text-white';
      case 'LOW':
        return 'bg-slate-500 text-white';
      default:
        return 'bg-blue-500 text-white';
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Breadcrumb & Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-gray-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <Link
            to="/job-cards"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                {jobCard.job_card_number}
              </h1>
              <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${getStatusColor(jobCard.status)}`}>
                {jobCard.status.replace('_', ' ')}
              </span>
              <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${getPriorityBadge(jobCard.priority)}`}>
                {jobCard.priority}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Created on {safeFormatDate(jobCard.created_at, 'MMM dd, yyyy · hh:mm a')}
              {jobCard.expected_delivery_date && (
                <span> · Expected: {safeFormatDate(jobCard.expected_delivery_date)}</span>
              )}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Progression dropdown */}
          {!isLocked && (
            <select
              value={jobCard.status}
              onChange={(e) => updateStatusMutation.mutate(e.target.value as JobCardStatus)}
              className="text-xs font-semibold px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="OPEN">Mark OPEN</option>
              <option value="ESTIMATED">Mark ESTIMATED</option>
              <option value="IN_PROGRESS">Mark IN PROGRESS</option>
              <option value="COMPLETED">Mark COMPLETED</option>
              <option value="CANCELLED">Mark CANCELLED</option>
            </select>
          )}

          {/* Add Extra Work Button */}
          {!isLocked && (
            <button
              onClick={() => setShowExtraWorkModal(true)}
              className="btn bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1.5 text-xs py-2 px-3 shadow-sm"
              title="Add supplementary work discovered mid-repair"
            >
              <Plus className="h-4 w-4" />
              <span>+ Add Extra Work</span>
            </button>
          )}

          {/* Print Quotation */}
          <button
            onClick={handlePrintQuotation}
            className="btn btn-secondary flex items-center gap-1.5 text-xs py-2 px-3"
            title="Print Estimate / Quotation"
          >
            <Printer className="h-4 w-4" />
            <span>Quotation</span>
          </button>

          {/* Print Job Card */}
          <button
            onClick={handlePrintJobCard}
            className="btn btn-secondary flex items-center gap-1.5 text-xs py-2 px-3"
            title="Print Floor Job Card"
          >
            <ClipboardList className="h-4 w-4" />
            <span>Print Job Card</span>
          </button>

          {/* Convert to Invoice Button */}
          {jobCard.status !== 'INVOICED' ? (
            <button
              onClick={() => setShowInvoiceModal(true)}
              className="btn btn-primary flex items-center gap-1.5 text-xs py-2 px-3.5 shadow-sm"
              title="Generate final customer bill"
            >
              <FileText className="h-4 w-4" />
              <span>⚡ Convert to Invoice</span>
            </button>
          ) : (
            <Link
              to={`/bills/${jobCard.bill_id}`}
              className="btn bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 text-xs py-2 px-3.5 shadow-sm"
            >
              <FileText className="h-4 w-4" />
              <span>View Bill #{jobCard.bill_number}</span>
              <ExternalLink className="h-3.5 w-3.5 ml-1" />
            </Link>
          )}
        </div>
      </div>

      {/* Invoiced Alert Banner */}
      {jobCard.status === 'INVOICED' && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-emerald-900 dark:text-emerald-200">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <div>
              <p className="font-bold text-sm sm:text-base">
                Job Card Successfully Converted to Invoice
              </p>
              <p className="text-xs text-emerald-700 dark:text-emerald-300">
                Official Bill <strong>#{jobCard.bill_number}</strong> generated on {safeFormatDate(jobCard.updated_at)}. Payment Status: <span className="font-semibold uppercase">{jobCard.bill_payment_status || 'PENDING'}</span>.
              </p>
            </div>
          </div>
          <Link
            to={`/bills/${jobCard.bill_id}`}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition-colors whitespace-nowrap"
          >
            <span>Open Invoice</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {/* Vitals Grid (Customer, Vehicle, Technicians) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Customer Information Card */}
        <div className="card p-5 bg-white dark:bg-[#0c101c] border border-gray-200 dark:border-slate-800/90 rounded-xl shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-slate-800">
            <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400 font-bold text-sm">
              <User className="h-4 w-4" />
              <span>Customer Information</span>
            </div>
            {jobCard.customer_id && (
              <Link
                to={`/customers/${jobCard.customer_id}`}
                className="text-xs text-primary-500 hover:text-primary-600 flex items-center gap-0.5"
              >
                <span>Profile</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
          <div className="mt-3 space-y-2 text-xs text-slate-600 dark:text-slate-300">
            <div>
              <p className="font-bold text-base text-gray-900 dark:text-white">
                {jobCard.customer_name || 'N/A'}
              </p>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Phone:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {jobCard.customer_phone || 'N/A'}
              </span>
            </div>
            {jobCard.customer_email && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Email:</span>
                <span className="truncate max-w-[170px] text-slate-800 dark:text-slate-200">
                  {jobCard.customer_email}
                </span>
              </div>
            )}
            {jobCard.customer_address && (
              <div className="pt-1 text-[11px] text-slate-400">
                <span className="font-medium text-slate-500 dark:text-slate-400">Address: </span>
                {jobCard.customer_address}
              </div>
            )}
          </div>
        </div>

        {/* Vehicle Information Card */}
        <div className="card p-5 bg-white dark:bg-[#0c101c] border border-gray-200 dark:border-slate-800/90 rounded-xl shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-slate-800">
            <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400 font-bold text-sm">
              <Car className="h-4 w-4" />
              <span>Vehicle Vitals</span>
            </div>
            <span className="text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded">
              {jobCard.vehicle_number || 'N/A'}
            </span>
          </div>
          <div className="mt-3 space-y-2 text-xs text-slate-600 dark:text-slate-300">
            <div>
              <p className="font-bold text-sm text-gray-900 dark:text-white">
                {jobCard.vehicle_model || 'Vehicle Information'}
                {jobCard.vehicle_year ? ` (${jobCard.vehicle_year})` : ''}
              </p>
              {jobCard.vehicle_vin && (
                <p className="text-[11px] text-slate-400 font-mono">VIN: {jobCard.vehicle_vin}</p>
              )}
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="flex items-center gap-1.5 text-slate-400">
                <Gauge className="h-3.5 w-3.5" /> Odometer:
              </span>
              <span className="font-bold text-slate-900 dark:text-slate-100">
                {jobCard.odometer_reading ? `${Number(jobCard.odometer_reading).toLocaleString()} KM` : 'Not recorded'}
              </span>
            </div>

            {/* Fuel Level visual bar */}
            <div className="pt-1">
              <div className="flex items-center justify-between mb-1">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <Fuel className="h-3.5 w-3.5" /> Fuel Level:
                </span>
                <span className="font-bold text-primary-600 dark:text-primary-400 text-xs">
                  {jobCard.fuel_level || '50%'}
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden flex">
                <div
                  className="bg-primary-600 h-full rounded-full transition-all duration-300"
                  style={{
                    width: jobCard.fuel_level === '100%' ? '100%' :
                           jobCard.fuel_level === '75%' ? '75%' :
                           jobCard.fuel_level === '50%' ? '50%' :
                           jobCard.fuel_level === '25%' ? '25%' : '8%'
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Multiple Assigned Technicians Card */}
        <div className="card p-5 bg-white dark:bg-[#0c101c] border border-gray-200 dark:border-slate-800/90 rounded-xl shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-slate-800">
            <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400 font-bold text-sm">
              <Users className="h-4 w-4" />
              <span>Workshop Technicians</span>
            </div>
            {!isLocked && (
              <button
                onClick={() => setShowTechModal(true)}
                className="text-xs text-primary-500 hover:text-primary-600 font-medium"
              >
                Modify
              </button>
            )}
          </div>
          <div className="mt-3 space-y-2">
            {jobCard.technicians && jobCard.technicians.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {jobCard.technicians.map((t: any) => (
                  <div
                    key={t.id || t.technician_id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800/80"
                  >
                    <span className="h-2 w-2 rounded-full bg-primary-500"></span>
                    <span>{t.technician_name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No technicians assigned yet.</p>
            )}

            {/* Crucial Note about Isolation */}
            <div className="mt-3 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Workshop Internal:</strong> Multiple technicians assigned here are tracked solely in this Job Card and will not carry over into the customer invoice.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Vehicle Intake Inspection & Checklist */}
      <div className="card p-5 bg-white dark:bg-[#0c101c] border border-gray-200 dark:border-slate-800/90 rounded-xl shadow-xs">
        <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2 mb-3">
          <ClipboardList className="h-4 w-4 text-primary-500" />
          <span>Intake Inspection & Inventory Checklist</span>
        </h3>

        {/* Checklist items */}
        {jobCard.inventory_checklist && typeof jobCard.inventory_checklist === 'object' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 mb-4">
            {Object.entries(jobCard.inventory_checklist).map(([key, value]) => {
              const label = key.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
              const isPresent = Boolean(value);
              return (
                <div
                  key={key}
                  className={`flex items-center gap-2 p-2 rounded-lg text-xs font-medium border ${
                    isPresent
                      ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300'
                      : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-400 line-through'
                  }`}
                >
                  {isPresent ? (
                    <CheckSquare className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                  ) : (
                    <XSquare className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                  )}
                  <span className="truncate">{label}</span>
                </div>
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-gray-100 dark:border-slate-800 text-xs">
          <div>
            <span className="font-semibold text-slate-400 block mb-1">Customer Reported Complaints:</span>
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 min-h-[50px] whitespace-pre-wrap">
              {jobCard.customer_complaints || 'None reported.'}
            </div>
          </div>
          <div>
            <span className="font-semibold text-slate-400 block mb-1">Technician Diagnostic Findings:</span>
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 min-h-[50px] whitespace-pre-wrap">
              {jobCard.technician_diagnosis || 'Pending inspection.'}
            </div>
          </div>
          <div>
            <span className="font-semibold text-slate-400 block mb-1">Visual Inspection / Pre-existing Dents:</span>
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 min-h-[50px] whitespace-pre-wrap">
              {jobCard.visual_inspection_notes || 'Clean condition / No major dents.'}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 1: Services & Labor (Separating Initial Quotation vs Extra Work) */}
      <div className="card bg-white dark:bg-[#0c101c] border border-gray-200 dark:border-slate-800/90 rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary-100 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400">
              <Wrench className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-slate-100">
                Services & Labor
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {services.length} {services.length === 1 ? 'service item' : 'service items'} recorded
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
              Labor Total: <span className="text-primary-600 dark:text-primary-400">{formatCurrency(totalLabor)}</span>
            </span>
            {!isLocked && (
              <button
                onClick={() => {
                  setExtraWorkTab('service');
                  setShowExtraWorkModal(true);
                }}
                className="btn btn-secondary text-xs py-1.5 px-2.5 flex items-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Labor</span>
              </button>
            )}
          </div>
        </div>

        {services.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No labor services recorded in this Job Card.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold border-b border-gray-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Service / Scope</th>
                  <th className="py-3 px-4">Origin / Type</th>
                  <th className="py-3 px-4 text-center">Hours / Qty</th>
                  <th className="py-3 px-4 text-right">Rate</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  {!isLocked && <th className="py-3 px-4 text-center">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {services.map((item: any) => (
                  <tr
                    key={item.id}
                    className={`hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors ${
                      item.is_extra_work ? 'bg-amber-500/[0.03]' : ''
                    }`}
                  >
                    <td className="py-3 px-4">
                      <p className="font-bold text-gray-900 dark:text-slate-100">
                        {item.service_name}
                      </p>
                      {item.description && (
                        <p className="text-[11px] text-slate-400 mt-0.5">{item.description}</p>
                      )}
                      {item.technician_name && (
                        <p className="text-[10px] text-primary-500 font-medium mt-0.5">
                          Assigned: {item.technician_name}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {item.is_extra_work ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                          <Sparkles className="h-3 w-3 text-amber-500" />
                          Extra Work (Mid-Repair)
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          Initial Quotation
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center font-medium">
                      {formatQuantity(item.hours_qty)} hr
                    </td>
                    <td className="py-3 px-4 text-right font-medium">
                      {formatCurrency(item.unit_price)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-gray-900 dark:text-slate-100">
                      {formatCurrency(item.total_price)}
                    </td>
                    {!isLocked && (
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => removeServiceMutation.mutate(item.id)}
                          className="p-1 rounded text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
                          title="Remove service"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Labor Subtotal Breakdown */}
        {services.length > 0 && (
          <div className="p-3 bg-slate-50/70 dark:bg-slate-900/60 border-t border-gray-100 dark:border-slate-800 text-xs flex flex-wrap items-center justify-end gap-5">
            <span className="text-slate-500">
              Quotation Labor: <strong className="text-slate-800 dark:text-slate-200">{formatCurrency(initialLaborSubtotal)}</strong>
            </span>
            {extraLaborSubtotal > 0 && (
              <span className="text-amber-600 dark:text-amber-400">
                Extra Work Labor: <strong>{formatCurrency(extraLaborSubtotal)}</strong>
              </span>
            )}
            <span className="font-bold text-gray-900 dark:text-white">
              Total Labor: {formatCurrency(totalLabor)}
            </span>
          </div>
        )}
      </div>

      {/* SECTION 2: Spare Parts & Materials (Separating Initial Quotation vs Extra Work) */}
      <div className="card bg-white dark:bg-[#0c101c] border border-gray-200 dark:border-slate-800/90 rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary-100 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400">
              <Package className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-slate-100">
                Spare Parts & Materials
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {spareParts.length} {spareParts.length === 1 ? 'part item' : 'part items'} recorded
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
              Parts Total: <span className="text-primary-600 dark:text-primary-400">{formatCurrency(totalParts)}</span>
            </span>
            {!isLocked && (
              <button
                onClick={() => {
                  setExtraWorkTab('part');
                  setShowExtraWorkModal(true);
                }}
                className="btn btn-secondary text-xs py-1.5 px-2.5 flex items-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Part</span>
              </button>
            )}
          </div>
        </div>

        {spareParts.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No spare parts recorded in this Job Card.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold border-b border-gray-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Part Name / Number</th>
                  <th className="py-3 px-4">Origin / Type</th>
                  <th className="py-3 px-4 text-center">Quantity</th>
                  <th className="py-3 px-4 text-right">Unit Price</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  {!isLocked && <th className="py-3 px-4 text-center">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {spareParts.map((item: any) => (
                  <tr
                    key={item.id}
                    className={`hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors ${
                      item.is_extra_work ? 'bg-amber-500/[0.03]' : ''
                    }`}
                  >
                    <td className="py-3 px-4">
                      <p className="font-bold text-gray-900 dark:text-slate-100">
                        {item.part_name}
                      </p>
                      {item.part_number && (
                        <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                          PN: {item.part_number}
                        </p>
                      )}
                      {item.description && (
                        <p className="text-[11px] text-slate-400">{item.description}</p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {item.is_extra_work ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                          <Sparkles className="h-3 w-3 text-amber-500" />
                          Extra Material (Mid-Repair)
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          Initial Quotation
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center font-medium">
                      {formatQuantity(item.quantity)} {item.unit || 'pcs'}
                    </td>
                    <td className="py-3 px-4 text-right font-medium">
                      {formatCurrency(item.unit_price)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-gray-900 dark:text-slate-100">
                      {formatCurrency(item.total_price)}
                    </td>
                    {!isLocked && (
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => removePartMutation.mutate(item.id)}
                          className="p-1 rounded text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
                          title="Remove spare part"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Parts Subtotal Breakdown */}
        {spareParts.length > 0 && (
          <div className="p-3 bg-slate-50/70 dark:bg-slate-900/60 border-t border-gray-100 dark:border-slate-800 text-xs flex flex-wrap items-center justify-end gap-5">
            <span className="text-slate-500">
              Quotation Parts: <strong className="text-slate-800 dark:text-slate-200">{formatCurrency(initialPartsSubtotal)}</strong>
            </span>
            {extraPartsSubtotal > 0 && (
              <span className="text-amber-600 dark:text-amber-400">
                Extra Parts: <strong>{formatCurrency(extraPartsSubtotal)}</strong>
              </span>
            )}
            <span className="font-bold text-gray-900 dark:text-white">
              Total Parts: {formatCurrency(totalParts)}
            </span>
          </div>
        )}
      </div>

      {/* SECTION 3: Summary & Financial Totals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Cost Analysis Card */}
        <div className="card p-5 bg-white dark:bg-[#0c101c] border border-gray-200 dark:border-slate-800/90 rounded-xl shadow-xs">
          <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2 mb-3">
            <DollarSign className="h-4 w-4 text-primary-500" />
            <span>Cost Analysis & Scope Variance</span>
          </h3>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between items-center py-1 border-b border-gray-100 dark:border-slate-800">
              <span className="text-slate-500">Initial Estimated Labor:</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">{formatCurrency(initialLaborSubtotal)}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-gray-100 dark:border-slate-800">
              <span className="text-slate-500">Initial Estimated Parts:</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">{formatCurrency(initialPartsSubtotal)}</span>
            </div>
            <div className="flex justify-between items-center py-1 font-semibold text-primary-600 dark:text-primary-400 bg-primary-50/50 dark:bg-primary-950/20 px-2 rounded">
              <span>Original Estimate Quotation:</span>
              <span>{formatCurrency(totalEstimate)}</span>
            </div>

            {totalExtra > 0 && (
              <div className="flex justify-between items-center py-1.5 font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 rounded border border-amber-500/20">
                <span className="flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5" />
                  Extra Work Added Mid-Repair:
                </span>
                <span>+{formatCurrency(totalExtra)}</span>
              </div>
            )}

            <div className="flex justify-between items-center pt-2 text-sm font-bold text-gray-900 dark:text-white">
              <span>Grand Total Amount:</span>
              <span className="text-base text-primary-600 dark:text-primary-400">{formatCurrency(grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* Workflow & Next Actions Card */}
        <div className="card p-5 bg-white dark:bg-[#0c101c] border border-gray-200 dark:border-slate-800/90 rounded-xl shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2 mb-2">
              <ClipboardList className="h-4 w-4 text-primary-500" />
              <span>Workshop Workflow</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Current lifecycle status: <span className="font-bold text-primary-600 dark:text-primary-400 uppercase">{jobCard.status.replace('_', ' ')}</span>
            </p>

            <div className="space-y-2 text-xs">
              <div className={`p-2 rounded-lg flex items-center gap-2 ${jobCard.status === 'OPEN' ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400 font-bold' : 'text-slate-400'}`}>
                <CheckCircle2 className="h-4 w-4" /> 1. Vehicle Intake & Inspection
              </div>
              <div className={`p-2 rounded-lg flex items-center gap-2 ${jobCard.status === 'ESTIMATED' ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400 font-bold' : 'text-slate-400'}`}>
                <CheckCircle2 className="h-4 w-4" /> 2. Quotation / Estimate Prepared
              </div>
              <div className={`p-2 rounded-lg flex items-center gap-2 ${jobCard.status === 'IN_PROGRESS' ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400 font-bold' : 'text-slate-400'}`}>
                <CheckCircle2 className="h-4 w-4" /> 3. Vehicle Repairs in Progress (+ Extra Work if any)
              </div>
              <div className={`p-2 rounded-lg flex items-center gap-2 ${jobCard.status === 'COMPLETED' ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400 font-bold' : 'text-slate-400'}`}>
                <CheckCircle2 className="h-4 w-4" /> 4. Service Work Completed
              </div>
              <div className={`p-2 rounded-lg flex items-center gap-2 ${jobCard.status === 'INVOICED' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-400'}`}>
                <CheckCircle2 className="h-4 w-4" /> 5. Converted to Final Invoice #{jobCard.bill_number || ''}
              </div>
            </div>
          </div>

          {!isLocked && (
            <div className="pt-4 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-500">Ready to bill customer?</span>
              <button
                onClick={() => setShowInvoiceModal(true)}
                className="btn btn-primary text-xs py-2 px-3 flex items-center gap-1.5"
              >
                <span>Convert to Invoice</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: ADD EXTRA WORK (SERVICE OR SPARE PART)                           */}
      {/* ========================================================================= */}
      {showExtraWorkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#0e1424] border border-gray-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <Sparkles className="h-5 w-5" />
                <h3 className="font-bold text-base text-gray-900 dark:text-slate-100">
                  Add Extra Work / Supplementary
                </h3>
              </div>
              <button
                onClick={() => setShowExtraWorkModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Sub-tabs: Labor vs Part */}
            <div className="flex border-b border-gray-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
              <button
                type="button"
                onClick={() => setExtraWorkTab('service')}
                className={`flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-2 border-b-2 transition-all ${
                  extraWorkTab === 'service'
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400 bg-white dark:bg-[#0e1424]'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Wrench className="h-4 w-4" />
                <span>Extra Labor / Service</span>
              </button>
              <button
                type="button"
                onClick={() => setExtraWorkTab('part')}
                className={`flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-2 border-b-2 transition-all ${
                  extraWorkTab === 'part'
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400 bg-white dark:bg-[#0e1424]'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Package className="h-4 w-4" />
                <span>Extra Spare Part</span>
              </button>
            </div>

            <div className="p-5">
              {extraWorkTab === 'service' ? (
                <form onSubmit={handleAddExtraService} className="space-y-4">
                  {/* Catalog quick-picker */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      Quick Select from Services Catalog (Optional)
                    </label>
                    <select
                      value={extraServiceId}
                      onChange={handleSelectCatalogService}
                      className="input w-full text-xs"
                    >
                      <option value="">-- Choose existing service or enter manually --</option>
                      {(servicesCatalog?.services || servicesCatalog || []).map((s: any) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({formatCurrency(s.rate || s.price)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Service / Labor Name *
                    </label>
                    <input
                      type="text"
                      value={extraServiceName}
                      onChange={(e) => setExtraServiceName(e.target.value)}
                      placeholder="e.g. Brake Caliper Pin Greasing & Overhaul"
                      className="input w-full text-xs"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Work Description / Technician Notes
                    </label>
                    <textarea
                      value={extraServiceDesc}
                      onChange={(e) => setExtraServiceDesc(e.target.value)}
                      placeholder="Discovered rust buildup requiring disassembly and servicing..."
                      rows={2}
                      className="input w-full text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Labor Hours / Qty
                      </label>
                      <input
                        type="number"
                        step="0.25"
                        min="0.25"
                        value={extraServiceHours}
                        onChange={(e) => setExtraServiceHours(e.target.value)}
                        className="input w-full text-xs font-mono"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Hourly Rate / Price (₹)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={extraServicePrice}
                        onChange={(e) => setExtraServicePrice(e.target.value)}
                        className="input w-full text-xs font-mono"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Performing Technician (Optional)
                    </label>
                    <select
                      value={extraServiceTechId}
                      onChange={(e) => setExtraServiceTechId(e.target.value)}
                      className="input w-full text-xs"
                    >
                      <option value="">-- Assign a technician --</option>
                      {(technicians || []).map((t: any) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowExtraWorkModal(false)}
                      className="btn btn-secondary text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={addServiceMutation.isLoading}
                      className="btn btn-primary text-xs"
                    >
                      {addServiceMutation.isLoading ? 'Adding...' : 'Add Extra Service'}
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleAddExtraPart} className="space-y-4">
                  {/* Catalog quick-picker */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      Quick Select from Spare Parts Inventory (Optional)
                    </label>
                    <select
                      value={extraPartId}
                      onChange={handleSelectCatalogPart}
                      className="input w-full text-xs"
                    >
                      <option value="">-- Choose existing stock part or enter manually --</option>
                      {(sparePartsCatalog?.spareParts || sparePartsCatalog || []).map((p: any) => (
                        <option key={p.id} value={p.id}>
                          {p.name} {p.part_number ? `(${p.part_number})` : ''} - {formatCurrency(p.price)} [Stock: {p.stock_quantity}]
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Part Name *
                      </label>
                      <input
                        type="text"
                        value={extraPartName}
                        onChange={(e) => setExtraPartName(e.target.value)}
                        placeholder="e.g. Front Brake Pad Set"
                        className="input w-full text-xs"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Part Number (Optional)
                      </label>
                      <input
                        type="text"
                        value={extraPartNumber}
                        onChange={(e) => setExtraPartNumber(e.target.value)}
                        placeholder="e.g. BP-5541-M"
                        className="input w-full text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Quantity *
                      </label>
                      <input
                        type="number"
                        step="1"
                        min="1"
                        value={extraPartQty}
                        onChange={(e) => setExtraPartQty(e.target.value)}
                        className="input w-full text-xs font-mono"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Unit
                      </label>
                      <input
                        type="text"
                        value={extraPartUnit}
                        onChange={(e) => setExtraPartUnit(e.target.value)}
                        placeholder="pieces"
                        className="input w-full text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Unit Price (₹) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={extraPartPrice}
                        onChange={(e) => setExtraPartPrice(e.target.value)}
                        className="input w-full text-xs font-mono"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Description / Reason
                    </label>
                    <textarea
                      value={extraPartDesc}
                      onChange={(e) => setExtraPartDesc(e.target.value)}
                      placeholder="Replacement required due to severe uneven wear..."
                      rows={2}
                      className="input w-full text-xs"
                    />
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowExtraWorkModal(false)}
                      className="btn btn-secondary text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={addPartMutation.isLoading}
                      className="btn btn-primary text-xs"
                    >
                      {addPartMutation.isLoading ? 'Adding...' : 'Add Extra Spare Part'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CONVERT JOB CARD TO INVOICE                                      */}
      {/* ========================================================================= */}
      {showInvoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#0e1424] border border-gray-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400">
                <FileText className="h-5 w-5" />
                <h3 className="font-bold text-base text-gray-900 dark:text-slate-100">
                  Convert Job Card to Invoice
                </h3>
              </div>
              <button
                onClick={() => setShowInvoiceModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConvertToInvoiceSubmit} className="p-5 space-y-4">
              {/* Items Summary */}
              <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-gray-200 dark:border-slate-800 text-xs space-y-1.5">
                <div className="flex justify-between text-slate-500">
                  <span>Labor Subtotal ({services.length} items):</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(totalLabor)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Parts Subtotal ({spareParts.length} items):</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(totalParts)}</span>
                </div>
                <div className="flex justify-between font-bold text-gray-900 dark:text-white pt-1 border-t border-gray-200 dark:border-slate-800">
                  <span>Items Gross Subtotal:</span>
                  <span>{formatCurrency(grandTotal)}</span>
                </div>
              </div>

              {/* Discount & Tax */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Discount Amount (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={invoiceDiscount}
                    onChange={(e) => setInvoiceDiscount(e.target.value)}
                    className="input w-full text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    GST / Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    value={invoiceTaxRate}
                    onChange={(e) => setInvoiceTaxRate(e.target.value)}
                    className="input w-full text-xs font-mono"
                  />
                </div>
              </div>

              {/* Invoice Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Customer Invoice Remarks / Notes
                </label>
                <textarea
                  value={invoiceNotes}
                  onChange={(e) => setInvoiceNotes(e.target.value)}
                  placeholder={`Converted from Job Card #${jobCard.job_card_number}. Thank you for choosing Wings on Wheels!`}
                  rows={2}
                  className="input w-full text-xs"
                />
              </div>

              {/* Final Calculation Preview */}
              <div className="p-3 bg-primary-50/50 dark:bg-primary-950/20 border border-primary-200 dark:border-primary-900/50 rounded-xl text-xs space-y-1">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Taxable Amount:</span>
                  <span>{formatCurrency(previewTaxable)}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Tax ({previewTaxRate}%):</span>
                  <span>{formatCurrency(previewTaxAmount)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-primary-700 dark:text-primary-300 pt-1 border-t border-primary-200 dark:border-primary-900/50">
                  <span>Net Invoice Amount:</span>
                  <span>{formatCurrency(previewInvoiceTotal)}</span>
                </div>
              </div>

              {/* Reminder on Technician Isolation */}
              <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-900 text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Note:</strong> Multiple assigned workshop technicians remain archived strictly inside Job Card <strong>#{jobCard.job_card_number}</strong> and are excluded from the customer bill.
                </span>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowInvoiceModal(false)}
                  className="btn btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={convertToInvoiceMutation.isLoading}
                  className="btn btn-primary text-xs flex items-center gap-1.5"
                >
                  <FileText className="h-4 w-4" />
                  <span>{convertToInvoiceMutation.isLoading ? 'Generating Invoice...' : 'Generate Invoice Now'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: MODIFY ASSIGNED WORKSHOP TECHNICIANS                             */}
      {/* ========================================================================= */}
      {showTechModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#0e1424] border border-gray-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400 font-bold text-base">
                <Users className="h-5 w-5" />
                <span>Assign Workshop Technicians</span>
              </div>
              <button
                onClick={() => setShowTechModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Select one or more technicians handling this vehicle. (Saved to this Job Card only).
              </p>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {(technicians || []).map((t: any) => {
                  const isChecked = editTechIds.includes(t.id);
                  return (
                    <label
                      key={t.id}
                      className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-primary-50 dark:bg-primary-950/40 border-primary-300 dark:border-primary-800 text-primary-900 dark:text-primary-200'
                          : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleTechSelection(t.id)}
                          className="rounded text-primary-600 focus:ring-primary-500 h-4 w-4"
                        />
                        <span className="font-semibold">{t.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-400">{t.phone || t.email}</span>
                    </label>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-gray-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowTechModal(false)}
                  className="btn btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => updateTechsMutation.mutate(editTechIds)}
                  disabled={updateTechsMutation.isLoading}
                  className="btn btn-primary text-xs"
                >
                  {updateTechsMutation.isLoading ? 'Saving...' : 'Save Technicians'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PRINT-ONLY COMPONENT 1: WORKSHOP FLOOR JOB CARD                           */}
      {/* ========================================================================= */}
      <div ref={jobCardPrintRef} className="hidden print:block print:p-8 font-sans text-black bg-white">
        {/* Header */}
        <div className="border-b-2 border-black pb-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Wings on Wheels" className="h-16 w-auto object-contain" />
              <div>
                <h1 className="text-2xl font-bold tracking-tight">WINGS ON WHEELS</h1>
                <p className="text-xs uppercase font-semibold text-gray-700">Workshop Floor Job Card</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold font-mono">{jobCard.job_card_number}</p>
              <p className="text-xs">Date: {safeFormatDate(jobCard.created_at, 'dd/MM/yyyy')}</p>
              <p className="text-xs font-bold uppercase mt-1">Priority: {jobCard.priority}</p>
            </div>
          </div>
        </div>

        {/* Customer & Vehicle Grid */}
        <div className="grid grid-cols-2 gap-4 border border-black p-4 mb-6 text-xs">
          <div>
            <h4 className="font-bold border-b border-gray-400 pb-1 mb-2 uppercase">Customer Details</h4>
            <p><strong>Name:</strong> {jobCard.customer_name || 'N/A'}</p>
            <p><strong>Phone:</strong> {jobCard.customer_phone || 'N/A'}</p>
            <p><strong>Address:</strong> {jobCard.customer_address || 'N/A'}</p>
          </div>
          <div>
            <h4 className="font-bold border-b border-gray-400 pb-1 mb-2 uppercase">Vehicle Details</h4>
            <p><strong>Reg No:</strong> {jobCard.vehicle_number || 'N/A'}</p>
            <p><strong>Model:</strong> {jobCard.vehicle_model || 'N/A'} {jobCard.vehicle_year ? `(${jobCard.vehicle_year})` : ''}</p>
            <p><strong>Odometer:</strong> {jobCard.odometer_reading ? `${jobCard.odometer_reading} KM` : 'N/A'}</p>
            <p><strong>Fuel Level:</strong> {jobCard.fuel_level || 'N/A'}</p>
          </div>
        </div>

        {/* Assigned Workshop Team */}
        <div className="border border-black p-3 mb-6 text-xs">
          <h4 className="font-bold border-b border-gray-400 pb-1 mb-2 uppercase">Assigned Workshop Technicians</h4>
          <p>
            {jobCard.technicians && jobCard.technicians.length > 0
              ? jobCard.technicians.map((t: any) => t.technician_name).join(' · ')
              : 'General Workshop Crew'}
          </p>
        </div>

        {/* Inventory Checklist & Complaints */}
        <div className="border border-black p-4 mb-6 text-xs space-y-3">
          <h4 className="font-bold border-b border-gray-400 pb-1 uppercase">Intake Inspection Checklist</h4>
          {jobCard.inventory_checklist && (
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(jobCard.inventory_checklist).map(([key, val]) => (
                <div key={key}>
                  [{val ? '✓' : '✗'}] {key.replace('_', ' ').toUpperCase()}
                </div>
              ))}
            </div>
          )}
          <div className="pt-2">
            <p><strong>Customer Complaints:</strong></p>
            <p className="italic">{jobCard.customer_complaints || 'None specified'}</p>
          </div>
          <div>
            <p><strong>Pre-existing Scratches / Physical Inspection:</strong></p>
            <p className="italic">{jobCard.visual_inspection_notes || 'Clean condition'}</p>
          </div>
        </div>

        {/* Services & Spare Parts Checklist */}
        <div className="border border-black p-4 mb-8 text-xs">
          <h4 className="font-bold border-b border-gray-400 pb-1 mb-3 uppercase">Labor & Scope of Work Checklist</h4>
          <table className="w-full text-left mb-4">
            <thead>
              <tr className="border-b border-black">
                <th className="py-1">Type</th>
                <th className="py-1">Description</th>
                <th className="py-1 text-center">Done [✓]</th>
                <th className="py-1 text-right">Technician Sign</th>
              </tr>
            </thead>
            <tbody>
              {services.map((s: any) => (
                <tr key={s.id} className="border-b border-gray-200">
                  <td className="py-1.5">{s.is_extra_work ? 'EXTRA WORK' : 'PLANNED'}</td>
                  <td className="py-1.5 font-bold">{s.service_name}</td>
                  <td className="py-1.5 text-center">[  ]</td>
                  <td className="py-1.5 text-right">________________</td>
                </tr>
              ))}
              {spareParts.map((p: any) => (
                <tr key={p.id} className="border-b border-gray-200">
                  <td className="py-1.5">{p.is_extra_work ? 'EXTRA PART' : 'REQUIRED PART'}</td>
                  <td className="py-1.5">{p.part_name} (Qty: {formatQuantity(p.quantity)} {p.unit || 'pcs'})</td>
                  <td className="py-1.5 text-center">[  ]</td>
                  <td className="py-1.5 text-right">________________</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-3 gap-6 pt-12 text-center text-xs">
          <div>
            <div className="border-t border-black pt-1">Customer Signature</div>
          </div>
          <div>
            <div className="border-t border-black pt-1">Assigned Technicians</div>
          </div>
          <div>
            <div className="border-t border-black pt-1">Workshop Manager</div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PRINT-ONLY COMPONENT 2: CUSTOMER QUOTATION / ESTIMATE                     */}
      {/* ========================================================================= */}
      <div ref={quotationPrintRef} className="hidden print:block print:p-8 font-sans text-black bg-white">
        <div className="border-b-2 border-black pb-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Wings on Wheels" className="h-16 w-auto object-contain" />
              <div>
                <h1 className="text-2xl font-bold tracking-tight">WINGS ON WHEELS</h1>
                <p className="text-xs uppercase font-semibold text-gray-700">Official Cost Estimate & Quotation</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold font-mono">EST-{jobCard.job_card_number}</p>
              <p className="text-xs">Date: {safeFormatDate(jobCard.created_at, 'dd/MM/yyyy')}</p>
              <p className="text-xs">Ref Job Card: {jobCard.job_card_number}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 border border-black p-4 mb-6 text-xs">
          <div>
            <h4 className="font-bold border-b border-gray-400 pb-1 mb-2 uppercase">Customer Details</h4>
            <p><strong>Name:</strong> {jobCard.customer_name || 'N/A'}</p>
            <p><strong>Phone:</strong> {jobCard.customer_phone || 'N/A'}</p>
            <p><strong>Email:</strong> {jobCard.customer_email || 'N/A'}</p>
          </div>
          <div>
            <h4 className="font-bold border-b border-gray-400 pb-1 mb-2 uppercase">Vehicle Details</h4>
            <p><strong>Vehicle Reg:</strong> {jobCard.vehicle_number || 'N/A'}</p>
            <p><strong>Model:</strong> {jobCard.vehicle_model || 'N/A'}</p>
            <p><strong>Odometer:</strong> {jobCard.odometer_reading ? `${jobCard.odometer_reading} KM` : 'N/A'}</p>
          </div>
        </div>

        {/* Services / Labor Section */}
        <div className="mb-6">
          <h4 className="font-bold text-xs uppercase border-b border-black pb-1 mb-2">Scope of Labor / Services</h4>
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-gray-400">
                <th className="py-1">Service</th>
                <th className="py-1 text-center">Hours</th>
                <th className="py-1 text-right">Rate</th>
                <th className="py-1 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {services.map((s: any) => (
                <tr key={s.id} className="border-b border-gray-100">
                  <td className="py-1">
                    {s.service_name} {s.is_extra_work ? '(Supplementary)' : ''}
                  </td>
                  <td className="py-1 text-center">{formatQuantity(s.hours_qty)}</td>
                  <td className="py-1 text-right">{formatCurrency(s.unit_price)}</td>
                  <td className="py-1 text-right">{formatCurrency(s.total_price)}</td>
                </tr>
              ))}
              <tr className="font-bold">
                <td colSpan={3} className="text-right py-2">Labor Subtotal:</td>
                <td className="text-right py-2">{formatCurrency(totalLabor)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Spare Parts Section */}
        <div className="mb-6">
          <h4 className="font-bold text-xs uppercase border-b border-black pb-1 mb-2">Required Spare Parts & Materials</h4>
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-gray-400">
                <th className="py-1">Part Name</th>
                <th className="py-1 text-center">Qty</th>
                <th className="py-1 text-right">Unit Price</th>
                <th className="py-1 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {spareParts.map((p: any) => (
                <tr key={p.id} className="border-b border-gray-100">
                  <td className="py-1">
                    {p.part_name} {p.is_extra_work ? '(Supplementary)' : ''}
                  </td>
                  <td className="py-1 text-center">{formatQuantity(p.quantity)} {p.unit || 'pcs'}</td>
                  <td className="py-1 text-right">{formatCurrency(p.unit_price)}</td>
                  <td className="py-1 text-right">{formatCurrency(p.total_price)}</td>
                </tr>
              ))}
              <tr className="font-bold">
                <td colSpan={3} className="text-right py-2">Parts Subtotal:</td>
                <td className="text-right py-2">{formatCurrency(totalParts)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="border-t-2 border-black pt-4 mb-10 flex justify-end">
          <div className="w-64 text-xs space-y-1 text-right">
            <div className="flex justify-between">
              <span>Estimated Labor:</span>
              <span>{formatCurrency(totalLabor)}</span>
            </div>
            <div className="flex justify-between">
              <span>Estimated Parts:</span>
              <span>{formatCurrency(totalParts)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold border-t border-black pt-1">
              <span>Total Quotation Estimate:</span>
              <span>{formatCurrency(grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-12 pt-8 text-center text-xs">
          <div>
            <div className="border-t border-black pt-1">Customer Acceptance & Signature</div>
            <p className="text-[10px] text-gray-500 mt-1">I approve the scope of work and quotation stated above.</p>
          </div>
          <div>
            <div className="border-t border-black pt-1">Authorized Workshop Signatory</div>
            <p className="text-[10px] text-gray-500 mt-1">Wings on Wheels Garage Portal</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobCardDetails;
