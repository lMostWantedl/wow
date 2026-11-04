import React, { useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { jobCardsService } from '../services/jobCards';
import { usersService } from '../services/users';
import { servicesService } from '../services/services';
import { sparePartsService } from '../services/spareParts';
import { JobCardStatus, JobCardService, JobCardSparePart } from '../types';
import { DEFAULT_SPARE_PART_CATEGORIES } from '../constants/sparePartOptions';
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
  Pencil,
  Info,
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
  DollarSign,
  Search,
  Building2,
  X,
  RotateCcw,
  CreditCard,
  Undo2
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
  const [extraWorkTab, setExtraWorkTab] = useState<'labor' | 'external' | 'part'>('labor');
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showTechModal, setShowTechModal] = useState(false);
  const [showRevertModal, setShowRevertModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Procurement modal states
  const [procurementModal, setProcurementModal] = useState<{
    isOpen: boolean;
    type: 'PART' | 'SERVICE';
    item: any;
  }>({
    isOpen: false,
    type: 'PART',
    item: null
  });
  const [procureCost, setProcureCost] = useState('');
  const [procureVendor, setProcureVendor] = useState('');
  const [procurePaymentMethod, setProcurePaymentMethod] = useState<'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CARD'>('CASH');
  const [procureInvoiceRef, setProcureInvoiceRef] = useState('');
  const [procureNotes, setProcureNotes] = useState('');

  // Edit item tracking
  const [editingService, setEditingService] = useState<JobCardService | null>(null);
  const [editingPart, setEditingPart] = useState<JobCardSparePart | null>(null);

  // Extra work form states
  const [extraServiceType, setExtraServiceType] = useState<'LABOR' | 'EXTERNAL_SERVICE'>('LABOR');
  const [extraServiceId, setExtraServiceId] = useState('');
  const [extraServiceName, setExtraServiceName] = useState('');
  const [extraServiceDesc, setExtraServiceDesc] = useState('');
  const [extraServiceVendor, setExtraServiceVendor] = useState('');
  const [extraServiceCost, setExtraServiceCost] = useState('0');
  const [extraServiceHours, setExtraServiceHours] = useState('1');
  const [extraServicePrice, setExtraServicePrice] = useState('0');
  const [extraServiceIsExtra, setExtraServiceIsExtra] = useState(false);
  const [extraServiceTechIds, setExtraServiceTechIds] = useState<string[]>([]);
  const [serviceSearchQuery, setServiceSearchQuery] = useState('');
  const [isServiceDropdownOpen, setIsServiceDropdownOpen] = useState(false);

  const [extraPartId, setExtraPartId] = useState('');
  const [extraPartName, setExtraPartName] = useState('');
  const [extraPartNumber, setExtraPartNumber] = useState('');
  const [extraPartDesc, setExtraPartDesc] = useState('');
  const [extraPartQty, setExtraPartQty] = useState('1');
  const [extraPartUnit, setExtraPartUnit] = useState('pieces');
  const [extraPartPrice, setExtraPartPrice] = useState('0');
  const [extraPartIsExtra, setExtraPartIsExtra] = useState(false);
  const [partSearchQuery, setPartSearchQuery] = useState('');
  const [isPartDropdownOpen, setIsPartDropdownOpen] = useState(false);

  // Quick Create Part states (inside Job Card modal)
  const [showQuickCreatePart, setShowQuickCreatePart] = useState(false);
  const [quickPartName, setQuickPartName] = useState('');
  const [quickPartNumber, setQuickPartNumber] = useState('');
  const [quickOemPartNumber, setQuickOemPartNumber] = useState('');
  const [quickPartMake, setQuickPartMake] = useState('');
  const [quickPartModel, setQuickPartModel] = useState('');
  const [quickPartGen, setQuickPartGen] = useState('');
  const [quickPartType, setQuickPartType] = useState('OEM Genuine');
  const [quickPartBrand, setQuickPartBrand] = useState('');
  const [quickPartCategory, setQuickPartCategory] = useState('Filters (Oil, Air, Cabin, Fuel)');
  const [quickPartPrice, setQuickPartPrice] = useState('');
  const [quickPartCost, setQuickPartCost] = useState('');
  const [quickPartStock, setQuickPartStock] = useState('1');
  const [quickPartUnit, setQuickPartUnit] = useState('pieces');
  const [isCreatingPart, setIsCreatingPart] = useState(false);

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

  const jobCard = jobCardData?.jobCard;
  const vehicleMake = (jobCard?.vehicle_make || '').toLowerCase();
  const vehicleModel = (jobCard?.vehicle_model_name || jobCard?.vehicle_model || '').toLowerCase();

  // Catalogs for adding extra work
  const { data: technicians } = useQuery('technicians', () => usersService.getTechnicians()) as { data: any };
  const { data: servicesCatalog } = useQuery('services', () => servicesService.getServices()) as { data: any };
  const { data: sparePartsCatalog } = useQuery('spareParts', () => sparePartsService.getSpareParts({ limit: 500 })) as { data: any };

  const catalogServicesList = React.useMemo(() => {
    return servicesCatalog?.services || (Array.isArray(servicesCatalog) ? servicesCatalog : []);
  }, [servicesCatalog]);

  const filteredCatalogServices = React.useMemo(() => {
    let list = catalogServicesList;
    if (extraWorkTab === 'external') {
      if (!serviceSearchQuery.trim()) {
        const external = list.filter((s: any) =>
          s.service_type === 'EXTERNAL_SERVICE' ||
          s.serviceType === 'EXTERNAL_SERVICE' ||
          /injector|turbo|lathe|skimming|balancing|calibration|denting|painting|sublet|external/i.test(s.name || '') ||
          /injector|turbo|lathe|skimming|sublet|external/i.test(s.category || '')
        );
        return external.length > 0 ? external : list;
      }
    } else if (extraWorkTab === 'labor') {
      if (!serviceSearchQuery.trim()) {
        const labor = list.filter((s: any) =>
          s.service_type !== 'EXTERNAL_SERVICE' &&
          s.serviceType !== 'EXTERNAL_SERVICE' &&
          !/injector|turbo|lathe|skimming|sublet|external/i.test(s.category || '')
        );
        return labor.length > 0 ? labor : list;
      }
    }

    if (!serviceSearchQuery.trim()) return list;
    const q = serviceSearchQuery.toLowerCase();
    return list.filter((s: any) =>
      s.name?.toLowerCase().includes(q) ||
      s.category?.toLowerCase().includes(q) ||
      s.description?.toLowerCase().includes(q)
    );
  }, [catalogServicesList, serviceSearchQuery, extraWorkTab]);

  const catalogPartsList = React.useMemo(() => {
    return sparePartsCatalog?.spareParts || (Array.isArray(sparePartsCatalog) ? sparePartsCatalog : []);
  }, [sparePartsCatalog]);

  const filteredCatalogParts = React.useMemo(() => {
    let list = catalogPartsList;
    if (partSearchQuery.trim()) {
      const q = partSearchQuery.toLowerCase();
      list = list.filter((p: any) =>
        p.name?.toLowerCase().includes(q) ||
        p.part_number?.toLowerCase().includes(q) ||
        p.partNumber?.toLowerCase().includes(q) ||
        p.oem_part_number?.toLowerCase().includes(q) ||
        p.oemPartNumber?.toLowerCase().includes(q) ||
        p.make?.toLowerCase().includes(q) ||
        p.model?.toLowerCase().includes(q) ||
        p.generation?.toLowerCase().includes(q) ||
        p.brand?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q)
      );
    }

    // Sort: Vehicle match first -> Universal next -> Other parts
    return [...list].sort((a: any, b: any) => {
      const getPriority = (p: any) => {
        const pMake = (p.make || '').toLowerCase();
        const pModel = (p.model || '').toLowerCase();
        if (vehicleMake && pMake && (vehicleMake.includes(pMake) || pMake.includes(vehicleMake))) {
          if (vehicleModel && pModel && (vehicleModel.includes(pModel) || pModel.includes(vehicleModel))) {
            return 3;
          }
          return 2;
        }
        if (pMake === 'universal') return 1;
        return 0;
      };
      return getPriority(b) - getPriority(a);
    });
  }, [catalogPartsList, partSearchQuery, vehicleMake, vehicleModel]);

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

  // Update service mutation
  const updateServiceMutation = useMutation(
    ({ serviceId, data }: { serviceId: string; data: any }) =>
      jobCardsService.updateService(id!, serviceId, data),
    {
      onSuccess: () => {
        toast.success('Service updated successfully!');
        setShowExtraWorkModal(false);
        setEditingService(null);
        resetServiceForm();
        queryClient.invalidateQueries(['job-card', id]);
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.message || 'Failed to update service');
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

  // Update spare part mutation
  const updatePartMutation = useMutation(
    ({ partId, data }: { partId: string; data: any }) =>
      jobCardsService.updateSparePart(id!, partId, data),
    {
      onSuccess: () => {
        toast.success('Spare part updated successfully!');
        setShowExtraWorkModal(false);
        setEditingPart(null);
        resetPartForm();
        queryClient.invalidateQueries(['job-card', id]);
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.message || 'Failed to update spare part');
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

  // Revert to In-Progress mutation
  const revertInvoiceMutation = useMutation(
    () => jobCardsService.revertInvoice(id!),
    {
      onSuccess: () => {
        toast.success('Job Card reverted to Repairs in Progress! Invoice voided & inventory stock restored.');
        setShowRevertModal(false);
        queryClient.invalidateQueries(['job-card', id]);
        queryClient.invalidateQueries('job-cards');
        queryClient.invalidateQueries('bills');
        queryClient.invalidateQueries('financial-report');
      },
      onError: (err: any) => {
        toast.error(err?.response?.data?.message || 'Failed to revert invoice');
      }
    }
  );

  // Delete Job Card mutation
  const deleteJobCardMutation = useMutation(
    () => jobCardsService.deleteJobCard(id!),
    {
      onSuccess: () => {
        toast.success('Job Card deleted successfully');
        setShowDeleteModal(false);
        queryClient.invalidateQueries('job-cards');
        navigate('/job-cards');
      },
      onError: (err: any) => {
        toast.error(err?.response?.data?.message || 'Failed to delete Job Card');
      }
    }
  );

  // Procure spare part mutation
  const procureSparePartMutation = useMutation(
    (data: { partId: string; procuredCost: number; vendorName?: string; paymentMethod?: string; invoiceRef?: string; notes?: string }) =>
      jobCardsService.procureSparePart(id!, data.partId, data),
    {
      onSuccess: () => {
        toast.success('Spare part marked as procured & recorded in Financial Ledger');
        setProcurementModal({ isOpen: false, type: 'PART', item: null });
        queryClient.invalidateQueries(['job-card', id]);
        queryClient.invalidateQueries('financial-report');
        queryClient.invalidateQueries('garage-expenses');
      },
      onError: (err: any) => {
        toast.error(err?.response?.data?.message || 'Failed to mark spare part as procured');
      }
    }
  );

  // Unprocure spare part mutation
  const unprocureSparePartMutation = useMutation(
    (partId: string) => jobCardsService.unprocureSparePart(id!, partId),
    {
      onSuccess: () => {
        toast.success('Procurement unmarked & reversed from Financial Ledger');
        queryClient.invalidateQueries(['job-card', id]);
        queryClient.invalidateQueries('financial-report');
        queryClient.invalidateQueries('garage-expenses');
      },
      onError: (err: any) => {
        toast.error(err?.response?.data?.message || 'Failed to unmark procurement');
      }
    }
  );

  // Procure sublet service mutation
  const procureServiceMutation = useMutation(
    (data: { serviceId: string; procuredCost: number; vendorName?: string; paymentMethod?: string; invoiceRef?: string; notes?: string }) =>
      jobCardsService.procureService(id!, data.serviceId, data),
    {
      onSuccess: () => {
        toast.success('Sublet service marked as procured & recorded in Financial Ledger');
        setProcurementModal({ isOpen: false, type: 'SERVICE', item: null });
        queryClient.invalidateQueries(['job-card', id]);
        queryClient.invalidateQueries('financial-report');
        queryClient.invalidateQueries('garage-expenses');
      },
      onError: (err: any) => {
        toast.error(err?.response?.data?.message || 'Failed to mark sublet service as procured');
      }
    }
  );

  // Unprocure sublet service mutation
  const unprocureServiceMutation = useMutation(
    (serviceId: string) => jobCardsService.unprocureService(id!, serviceId),
    {
      onSuccess: () => {
        toast.success('Sublet procurement unmarked & reversed from Financial Ledger');
        queryClient.invalidateQueries(['job-card', id]);
        queryClient.invalidateQueries('financial-report');
        queryClient.invalidateQueries('garage-expenses');
      },
      onError: (err: any) => {
        toast.error(err?.response?.data?.message || 'Failed to unmark sublet procurement');
      }
    }
  );

  const openProcureModal = (type: 'PART' | 'SERVICE', item: any) => {
    let defaultCost = 0;
    if (type === 'PART') {
      const unitCost = Number(item.garage_cost) > 0
        ? Number(item.garage_cost)
        : (Number(item.cost) > 0 ? Number(item.cost) : Number(item.unit_price || 0));
      defaultCost = Number(item.quantity || 1) * unitCost;
    } else {
      defaultCost = Number(item.cost_price || 0) > 0
        ? Number(item.cost_price)
        : Number(item.total_price || item.unit_price || 0);
    }

    setProcurementModal({ isOpen: true, type, item });
    setProcureCost(String(defaultCost));
    setProcureVendor(type === 'PART' ? (item.default_supplier || '') : (item.vendor_name || ''));
    setProcurePaymentMethod('CASH');
    setProcureInvoiceRef('');
    setProcureNotes('');
  };

  const handleProcureSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cost = parseFloat(procureCost);
    if (isNaN(cost) || cost < 0) {
      toast.error('Please enter a valid procurement cost');
      return;
    }

    if (procurementModal.type === 'PART') {
      procureSparePartMutation.mutate({
        partId: procurementModal.item.id,
        procuredCost: cost,
        vendorName: procureVendor,
        paymentMethod: procurePaymentMethod,
        invoiceRef: procureInvoiceRef,
        notes: procureNotes
      });
    } else {
      procureServiceMutation.mutate({
        serviceId: procurementModal.item.id,
        procuredCost: cost,
        vendorName: procureVendor,
        paymentMethod: procurePaymentMethod,
        invoiceRef: procureInvoiceRef,
        notes: procureNotes
      });
    }
  };

  const resetServiceForm = () => {
    setEditingService(null);
    setExtraServiceId('');
    setExtraServiceName('');
    setExtraServiceDesc('');
    setExtraServiceVendor('');
    setExtraServiceCost('0');
    setExtraServiceHours('1');
    setExtraServicePrice('0');
    setExtraServiceIsExtra(false);
    setExtraServiceTechIds([]);
    setServiceSearchQuery('');
    setIsServiceDropdownOpen(false);
    setExtraServiceType('LABOR');
  };

  const resetPartForm = () => {
    setEditingPart(null);
    setExtraPartId('');
    setExtraPartName('');
    setExtraPartNumber('');
    setExtraPartDesc('');
    setExtraPartQty('1');
    setExtraPartUnit('pieces');
    setExtraPartPrice('0');
    setExtraPartIsExtra(false);
    setPartSearchQuery('');
    setIsPartDropdownOpen(false);
    setShowQuickCreatePart(false);
  };

  const handleQuickCreatePartSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!quickPartName.trim()) {
      toast.error('Part name is required');
      return;
    }
    const priceNum = parseFloat(quickPartPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      toast.error('Please enter a valid retail price');
      return;
    }

    try {
      setIsCreatingPart(true);
      const res = await sparePartsService.createSparePart({
        name: quickPartName.trim(),
        partNumber: quickPartNumber.trim() || undefined,
        oemPartNumber: quickOemPartNumber.trim() || undefined,
        category: quickPartCategory || 'Filters (Oil, Air, Cabin, Fuel)',
        make: quickPartMake.trim() || (jobCard?.vehicle_make || 'Universal'),
        model: quickPartModel.trim() || (jobCard?.vehicle_model_name || jobCard?.vehicle_model || 'All Models'),
        generation: quickPartGen.trim() || undefined,
        partType: quickPartType,
        brand: quickPartBrand.trim() || undefined,
        price: priceNum,
        cost: parseFloat(quickPartCost) || 0,
        stock: parseFloat(quickPartStock) || 1,
        minStock: 2,
        unit: quickPartUnit,
        unitType: 'discrete'
      });

      toast.success(`Part "${quickPartName}" created and added to inventory!`);
      queryClient.invalidateQueries('spareParts');

      // Auto-select this created part
      const newPart = res.sparePart;
      setExtraPartId(newPart.id);
      setExtraPartName(newPart.name);
      setExtraPartNumber(newPart.oemPartNumber || newPart.partNumber || '');
      setExtraPartPrice(String(newPart.price || priceNum));
      setExtraPartUnit(newPart.unit || quickPartUnit);
      setExtraPartDesc(newPart.description || '');
      setPartSearchQuery(newPart.name);
      setShowQuickCreatePart(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create spare part');
    } finally {
      setIsCreatingPart(false);
    }
  };

  const openAddLaborModal = (isExtra: boolean = false) => {
    resetServiceForm();
    resetPartForm();
    setExtraServiceType('LABOR');
    setExtraServiceIsExtra(isExtra);
    setExtraWorkTab('labor');
    setShowExtraWorkModal(true);
  };

  const openAddExternalServiceModal = (isExtra: boolean = false) => {
    resetServiceForm();
    resetPartForm();
    setExtraServiceType('EXTERNAL_SERVICE');
    setExtraServiceIsExtra(isExtra);
    setExtraWorkTab('external');
    setShowExtraWorkModal(true);
  };

  const openAddServiceModal = openAddLaborModal;

  const openAddPartModal = (isExtra: boolean = false) => {
    resetServiceForm();
    resetPartForm();
    setExtraPartIsExtra(isExtra);
    setExtraWorkTab('part');
    setQuickPartMake(jobCard?.vehicle_make || '');
    setQuickPartModel(jobCard?.vehicle_model_name || jobCard?.vehicle_model || '');
    setShowExtraWorkModal(true);
  };

  const openEditService = (service: JobCardService) => {
    setEditingService(service);
    setEditingPart(null);
    const isExt = service.service_type === 'EXTERNAL_SERVICE';
    setExtraServiceType(isExt ? 'EXTERNAL_SERVICE' : 'LABOR');
    setExtraWorkTab(isExt ? 'external' : 'labor');
    setExtraServiceId(service.service_id || '');
    setExtraServiceName(service.service_name);
    setExtraServiceDesc(service.description || '');
    setExtraServiceVendor(service.vendor_name || '');
    setExtraServiceCost(String(service.cost_price || 0));
    setExtraServiceHours(String(service.hours_qty || 1));
    setExtraServicePrice(String(service.unit_price || 0));
    setExtraServiceIsExtra(Boolean(service.is_extra_work));
    setServiceSearchQuery(service.service_name || '');
    setIsServiceDropdownOpen(false);

    let tIds: string[] = [];
    if (Array.isArray(service.technician_ids) && service.technician_ids.length > 0) {
      tIds = service.technician_ids;
    } else if (service.technician_id) {
      tIds = [service.technician_id];
    }
    setExtraServiceTechIds(tIds);
    setShowExtraWorkModal(true);
  };

  const openEditPart = (part: JobCardSparePart) => {
    setEditingPart(part);
    setEditingService(null);
    setExtraWorkTab('part');
    setExtraPartId(part.spare_part_id || '');
    setExtraPartName(part.part_name);
    setExtraPartNumber(part.part_number || '');
    setExtraPartDesc(part.description || '');
    setExtraPartQty(String(part.quantity || 1));
    setExtraPartUnit(part.unit || 'pieces');
    setExtraPartPrice(String(part.unit_price || 0));
    setExtraPartIsExtra(Boolean(part.is_extra_work));
    setPartSearchQuery(part.part_name || '');
    setIsPartDropdownOpen(false);
    setShowExtraWorkModal(true);
  };

  const toggleExtraServiceTech = (techId: string) => {
    setExtraServiceTechIds(prev =>
      prev.includes(techId) ? prev.filter(t => t !== techId) : [...prev, techId]
    );
  };

  const handleAddExtraService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!extraServiceName.trim()) {
      toast.error('Please enter or select a service name');
      return;
    }

    const payload = {
      serviceId: extraServiceId || undefined,
      serviceName: extraServiceName,
      serviceType: extraServiceType,
      vendorName: extraServiceType === 'EXTERNAL_SERVICE' ? (extraServiceVendor.trim() || undefined) : undefined,
      costPrice: extraServiceType === 'EXTERNAL_SERVICE' ? (parseFloat(extraServiceCost) || 0) : undefined,
      description: extraServiceDesc,
      hoursQty: parseFloat(extraServiceHours) || 1,
      unitPrice: parseFloat(extraServicePrice) || 0,
      isExtraWork: extraServiceIsExtra,
      technicianIds: extraServiceType === 'LABOR' ? extraServiceTechIds : []
    };

    if (editingService) {
      updateServiceMutation.mutate({
        serviceId: editingService.id,
        data: payload
      });
    } else {
      addServiceMutation.mutate(payload);
    }
  };

  const handleAddExtraPart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!extraPartName.trim()) {
      toast.error('Please enter or select a spare part');
      return;
    }

    if (editingPart) {
      updatePartMutation.mutate({
        partId: editingPart.id,
        data: {
          partName: extraPartName,
          partNumber: extraPartNumber,
          description: extraPartDesc,
          quantity: parseFloat(extraPartQty) || 1,
          unit: extraPartUnit,
          unitPrice: parseFloat(extraPartPrice) || 0,
          isExtraWork: extraPartIsExtra
        }
      });
    } else {
      addPartMutation.mutate({
        sparePartId: extraPartId || undefined,
        partName: extraPartName,
        partNumber: extraPartNumber,
        description: extraPartDesc,
        quantity: parseFloat(extraPartQty) || 1,
        unit: extraPartUnit,
        unitPrice: parseFloat(extraPartPrice) || 0,
        isExtraWork: extraPartIsExtra
      });
    }
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

  // Separate services into:
  // 1. In-House Workshop Labor
  // 2. Specialized & External Sublet Services
  const laborServices = services.filter((s: any) => (s.service_type || 'LABOR') !== 'EXTERNAL_SERVICE');
  const externalServices = services.filter((s: any) => s.service_type === 'EXTERNAL_SERVICE');

  // Categorize initial quotation vs extra work for labor
  const initialLabor = laborServices.filter((s: any) => !s.is_extra_work);
  const extraLabor = laborServices.filter((s: any) => s.is_extra_work);
  const initialLaborSubtotal = initialLabor.reduce((sum: number, s: any) => sum + Number(s.total_price || 0), 0);
  const extraLaborSubtotal = extraLabor.reduce((sum: number, s: any) => sum + Number(s.total_price || 0), 0);
  const totalLabor = initialLaborSubtotal + extraLaborSubtotal;

  // Categorize initial quotation vs extra work for external sublet services
  const initialExternal = externalServices.filter((s: any) => !s.is_extra_work);
  const extraExternal = externalServices.filter((s: any) => s.is_extra_work);
  const initialExternalSubtotal = initialExternal.reduce((sum: number, s: any) => sum + Number(s.total_price || 0), 0);
  const extraExternalSubtotal = extraExternal.reduce((sum: number, s: any) => sum + Number(s.total_price || 0), 0);
  const totalExternal = initialExternalSubtotal + extraExternalSubtotal;

  // Categorize initial quotation vs extra work for spare parts
  const initialParts = spareParts.filter((p: any) => !p.is_extra_work);
  const extraParts = spareParts.filter((p: any) => p.is_extra_work);
  const initialPartsSubtotal = initialParts.reduce((sum: number, p: any) => sum + Number(p.total_price || 0), 0);
  const extraPartsSubtotal = extraParts.reduce((sum: number, p: any) => sum + Number(p.total_price || 0), 0);
  const totalParts = initialPartsSubtotal + extraPartsSubtotal;

  // Combined totals
  const totalEstimate = initialLaborSubtotal + initialExternalSubtotal + initialPartsSubtotal;
  const totalExtra = extraLaborSubtotal + extraExternalSubtotal + extraPartsSubtotal;
  const grandTotal = totalLabor + totalExternal + totalParts;

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
              onClick={() => openAddServiceModal(true)}
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

          {/* Convert to Invoice or Revert Button */}
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
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowRevertModal(true)}
                className="btn bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1.5 text-xs py-2 px-3 shadow-sm font-semibold"
                title="Revert back to Vehicle Repairs in Progress, void invoice, and restore stock"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>↺ Revert to In-Progress</span>
              </button>
              <Link
                to={`/bills/${jobCard.bill_id}`}
                className="btn bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 text-xs py-2 px-3.5 shadow-sm"
              >
                <FileText className="h-4 w-4" />
                <span>View Bill #{jobCard.bill_number}</span>
                <ExternalLink className="h-3.5 w-3.5 ml-1" />
              </Link>
            </div>
          )}

          {/* Delete Job Card Button */}
          <button
            onClick={() => setShowDeleteModal(true)}
            className="btn bg-rose-600/10 hover:bg-rose-600/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 flex items-center gap-1.5 text-xs py-2 px-2.5 shadow-sm transition-colors"
            title="Permanently delete this Job Card"
          >
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">Delete</span>
          </button>
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowRevertModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-amber-600 text-white hover:bg-amber-700 shadow-sm transition-colors whitespace-nowrap"
              title="Void invoice, restore parts stock, and continue editing job card"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>↺ Revert to Repairs in Progress</span>
            </button>
            <Link
              to={`/bills/${jobCard.bill_id}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition-colors whitespace-nowrap"
            >
              <span>Open Invoice</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
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

      {/* SECTION 1: In-House Workshop Labor & Operations */}
      <div className="card bg-white dark:bg-[#0c101c] border border-gray-200 dark:border-slate-800/90 rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Wrench className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-gray-900 dark:text-slate-100">
                  In-House Workshop Labor
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  Technicians
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {laborServices.length} {laborServices.length === 1 ? 'labor operation' : 'labor operations'} recorded
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
              Labor Total: <span className="text-primary-600 dark:text-primary-400">{formatCurrency(totalLabor)}</span>
            </span>
            {!isLocked && (
              <button
                onClick={() => openAddLaborModal(false)}
                className="btn btn-secondary text-xs py-1.5 px-2.5 flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Labor</span>
              </button>
            )}
          </div>
        </div>

        {laborServices.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No in-house workshop labor operations recorded in this Job Card.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold border-b border-gray-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Labor Operation / Task</th>
                  <th className="py-3 px-4">Origin / Type</th>
                  <th className="py-3 px-4">Assigned Technicians</th>
                  <th className="py-3 px-4 text-center">Hours</th>
                  <th className="py-3 px-4 text-right">Hourly Rate</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  {!isLocked && <th className="py-3 px-4 text-center">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {laborServices.map((item: any) => (
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
                    </td>
                    <td className="py-3 px-4">
                      {item.is_extra_work ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                          <Sparkles className="h-3 w-3 text-amber-500" />
                          Extra Work
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          Initial Quotation
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {item.assigned_technicians && item.assigned_technicians.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {item.assigned_technicians.map((t: any) => (
                            <span
                              key={t.id}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-primary-500"></span>
                              {t.name}
                              {t.role === 'MANAGER' && (
                                <span className="text-[8px] px-1 py-0 rounded font-bold uppercase bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                                  Mgr
                                </span>
                              )}
                            </span>
                          ))}
                        </div>
                      ) : item.technician_name ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary-500"></span>
                          {item.technician_name}
                        </span>
                      ) : (
                        <span className="text-[10px] italic text-slate-400">
                          Unassigned / General Team
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
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEditService(item)}
                            className="p-1.5 rounded text-primary-600 dark:text-primary-400 hover:text-primary-800 hover:bg-primary-50 dark:hover:bg-primary-950/50 transition-colors"
                            title="Edit labor operation"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => removeServiceMutation.mutate(item.id)}
                            className="p-1.5 rounded text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
                            title="Remove labor operation"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Labor Subtotal Breakdown */}
        {laborServices.length > 0 && (
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

      {/* SECTION 2: Specialized & External Sublet Services */}
      <div className="card bg-white dark:bg-[#0c101c] border border-gray-200 dark:border-slate-800/90 rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <ExternalLink className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-gray-900 dark:text-slate-100">
                  Specialized & External Sublet Services
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  Outsourced / Lab
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Injector testing, turbo overhaul, lathe disk skimming, and sublet specialized jobs ({externalServices.length} {externalServices.length === 1 ? 'service' : 'services'} recorded)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
              External Total: <span className="text-indigo-600 dark:text-indigo-400">{formatCurrency(totalExternal)}</span>
            </span>
            {!isLocked && (
              <button
                onClick={() => openAddExternalServiceModal(false)}
                className="btn btn-secondary text-xs py-1.5 px-2.5 flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add External Service</span>
              </button>
            )}
          </div>
        </div>

        {externalServices.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No specialized or outsourced external services recorded in this Job Card.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold border-b border-gray-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">External Service / Scope</th>
                  <th className="py-3 px-4">Origin / Type</th>
                  <th className="py-3 px-4">Specialized Vendor / Lab</th>
                  <th className="py-3 px-4 text-center">Qty / Jobs</th>
                  <th className="py-3 px-4 text-right">Billed Rate</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  <th className="py-3 px-4 text-left">Lab Procurement / Cash Outflow</th>
                  {!isLocked && <th className="py-3 px-4 text-center">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {externalServices.map((item: any) => (
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
                    </td>
                    <td className="py-3 px-4">
                      {item.is_extra_work ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                          <Sparkles className="h-3 w-3 text-amber-500" />
                          Extra Work
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          Initial Quotation
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 w-fit">
                          <Building2 className="h-3 w-3 text-indigo-500" />
                          {item.vendor_name || 'Specialist Lab / Sublet Vendor'}
                        </span>
                        {Number(item.cost_price) > 0 && (
                          <span className="text-[10px] text-slate-400">
                            Sublet Cost: {formatCurrency(item.cost_price)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center font-medium">
                      {formatQuantity(item.hours_qty)}
                    </td>
                    <td className="py-3 px-4 text-right font-medium">
                      {formatCurrency(item.unit_price)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-gray-900 dark:text-slate-100">
                      {formatCurrency(item.total_price)}
                    </td>
                    <td className="py-3 px-4">
                      {item.is_procured ? (
                        <div className="flex flex-col items-start gap-1">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>Paid: {formatCurrency(item.procured_cost)}</span>
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">
                            {item.procured_payment_method} · {item.procured_vendor || 'Lab'}
                          </span>
                          <button
                            type="button"
                            onClick={() => unprocureServiceMutation.mutate(item.id)}
                            disabled={unprocureServiceMutation.isLoading}
                            className="text-[10px] text-slate-400 hover:text-red-500 dark:hover:text-red-400 flex items-center gap-1 transition-colors underline"
                            title="Reverse expense from Financial Ledger"
                          >
                            <Undo2 className="h-3 w-3" />
                            <span>Cancel / Refund</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openProcureModal('SERVICE', item)}
                          className="btn btn-secondary text-[11px] py-1 px-2.5 flex items-center gap-1 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/60"
                          title="Mark this sublet job as paid to external lab and reflect in Financial Ledger"
                        >
                          <CreditCard className="h-3.5 w-3.5 text-indigo-500" />
                          <span>Mark Procured</span>
                        </button>
                      )}
                    </td>
                    {!isLocked && (
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEditService(item)}
                            className="p-1.5 rounded text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors"
                            title="Edit external service"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => removeServiceMutation.mutate(item.id)}
                            className="p-1.5 rounded text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
                            title="Remove external service"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* External Subtotal Breakdown */}
        {externalServices.length > 0 && (
          <div className="p-3 bg-slate-50/70 dark:bg-slate-900/60 border-t border-gray-100 dark:border-slate-800 text-xs flex flex-wrap items-center justify-end gap-5">
            <span className="text-slate-500">
              Quotation External: <strong className="text-slate-800 dark:text-slate-200">{formatCurrency(initialExternalSubtotal)}</strong>
            </span>
            {extraExternalSubtotal > 0 && (
              <span className="text-amber-600 dark:text-amber-400">
                Extra External: <strong>{formatCurrency(extraExternalSubtotal)}</strong>
              </span>
            )}
            <span className="font-bold text-indigo-600 dark:text-indigo-400">
              Total External: {formatCurrency(totalExternal)}
            </span>
          </div>
        )}
      </div>

      {/* SECTION 3: Spare Parts & Materials (Separating Initial Quotation vs Extra Work) */}
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
                onClick={() => openAddPartModal(false)}
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
                  <th className="py-3 px-4 text-left">Parts Procurement / Cash Outflow</th>
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
                    <td className="py-3 px-4">
                      {item.is_procured ? (
                        <div className="flex flex-col items-start gap-1">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>Procured: {formatCurrency(item.procured_cost)}</span>
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">
                            {item.procured_payment_method} · {item.procured_vendor || 'Distributor'}
                          </span>
                          <button
                            type="button"
                            onClick={() => unprocureSparePartMutation.mutate(item.id)}
                            disabled={unprocureSparePartMutation.isLoading}
                            className="text-[10px] text-slate-400 hover:text-red-500 dark:hover:text-red-400 flex items-center gap-1 transition-colors underline"
                            title="Reverse expense from Financial Ledger"
                          >
                            <Undo2 className="h-3 w-3" />
                            <span>Cancel / Refund</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openProcureModal('PART', item)}
                          className="btn btn-secondary text-[11px] py-1 px-2.5 flex items-center gap-1 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/60"
                          title="Record actual procurement cost in Financial Management cash flow"
                        >
                          <CreditCard className="h-3.5 w-3.5 text-emerald-500" />
                          <span>Mark Procured</span>
                        </button>
                      )}
                    </td>
                    {!isLocked && (
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEditPart(item)}
                            className="p-1.5 rounded text-primary-600 dark:text-primary-400 hover:text-primary-800 hover:bg-primary-50 dark:hover:bg-primary-950/50 transition-colors"
                            title="Edit spare part"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => removePartMutation.mutate(item.id)}
                            className="p-1.5 rounded text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
                            title="Remove spare part"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
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

      {/* SECTION 4: Summary & Financial Totals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Cost Analysis Card */}
        <div className="card p-5 bg-white dark:bg-[#0c101c] border border-gray-200 dark:border-slate-800/90 rounded-xl shadow-xs">
          <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2 mb-3">
            <DollarSign className="h-4 w-4 text-primary-500" />
            <span>Cost Analysis & Scope Variance</span>
          </h3>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center py-1 border-b border-gray-100 dark:border-slate-800">
              <span className="text-slate-500">Initial Estimated Labor:</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">{formatCurrency(initialLaborSubtotal)}</span>
            </div>
            {initialExternalSubtotal > 0 && (
              <div className="flex justify-between items-center py-1 border-b border-gray-100 dark:border-slate-800">
                <span className="text-slate-500">Initial External Sublet Services:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{formatCurrency(initialExternalSubtotal)}</span>
              </div>
            )}
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

            <div className="pt-2 border-t border-gray-100 dark:border-slate-800 space-y-1">
              <div className="flex justify-between items-center text-[11px] text-slate-500">
                <span>Workshop Labor Total:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{formatCurrency(totalLabor)}</span>
              </div>
              <div className="flex justify-between items-center text-[11px] text-slate-500">
                <span>External Sublet Services Total:</span>
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">{formatCurrency(totalExternal)}</span>
              </div>
              <div className="flex justify-between items-center text-[11px] text-slate-500">
                <span>Spare Parts & Materials Total:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{formatCurrency(totalParts)}</span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 text-sm font-bold text-gray-900 dark:text-white border-t border-gray-200 dark:border-slate-800">
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

          {jobCard.status === 'INVOICED' && (
            <div className="pt-4 border-t border-gray-100 dark:border-slate-800 space-y-2">
              <span className="text-[11px] text-slate-500 block">Need to edit items, add more work, or correct the invoice?</span>
              <button
                onClick={() => setShowRevertModal(true)}
                className="btn w-full bg-amber-600 hover:bg-amber-700 text-white text-xs py-2 px-3 flex items-center justify-center gap-1.5 shadow-sm font-semibold"
                title="Void invoice, restore parts stock, and return to Repairs in Progress"
              >
                <RotateCcw className="h-4 w-4" />
                <span>↺ Revert to Repairs in Progress</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: ADD / EDIT WORK (LABOR, EXTERNAL SUBLET, OR SPARE PART)          */}
      {/* ========================================================================= */}
      {showExtraWorkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#0e1424] border border-gray-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400">
                {editingService || editingPart ? (
                  <Pencil className="h-5 w-5" />
                ) : extraWorkTab === 'external' ? (
                  <ExternalLink className="h-5 w-5 text-indigo-500" />
                ) : (
                  <Wrench className="h-5 w-5 text-primary-500" />
                )}
                <h3 className="font-bold text-base text-gray-900 dark:text-slate-100">
                  {editingService
                    ? (extraServiceType === 'EXTERNAL_SERVICE' ? 'Edit External Sublet Service' : 'Edit Workshop Labor')
                    : editingPart
                    ? 'Edit Spare Part / Material'
                    : extraWorkTab === 'labor'
                    ? (extraServiceIsExtra ? 'Add Extra Workshop Labor' : 'Add Planned Workshop Labor')
                    : extraWorkTab === 'external'
                    ? (extraServiceIsExtra ? 'Add Extra External Sublet Service' : 'Add Planned External Sublet Service')
                    : (extraPartIsExtra ? 'Add Extra Spare Part' : 'Add Spare Part')}
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowExtraWorkModal(false);
                  resetServiceForm();
                  resetPartForm();
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Sub-tabs: Labor vs External vs Part (Only toggleable when adding new items) */}
            {!editingService && !editingPart ? (
              <div className="flex border-b border-gray-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setExtraWorkTab('labor');
                    setExtraServiceType('LABOR');
                  }}
                  className={`flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 border-b-2 transition-all ${
                    extraWorkTab === 'labor'
                      ? 'border-primary-500 text-primary-600 dark:text-primary-400 bg-white dark:bg-[#0e1424]'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Wrench className="h-3.5 w-3.5" />
                  <span>Workshop Labor</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setExtraWorkTab('external');
                    setExtraServiceType('EXTERNAL_SERVICE');
                  }}
                  className={`flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 border-b-2 transition-all ${
                    extraWorkTab === 'external'
                      ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-[#0e1424]'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>External Sublet</span>
                </button>
                <button
                  type="button"
                  onClick={() => setExtraWorkTab('part')}
                  className={`flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 border-b-2 transition-all ${
                    extraWorkTab === 'part'
                      ? 'border-primary-500 text-primary-600 dark:text-primary-400 bg-white dark:bg-[#0e1424]'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Package className="h-3.5 w-3.5" />
                  <span>Spare Part</span>
                </button>
              </div>
            ) : (
              <div className="px-5 py-2.5 bg-slate-50 dark:bg-slate-900/40 border-b border-gray-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 shrink-0">
                {editingService ? (
                  <>
                    {extraServiceType === 'EXTERNAL_SERVICE' ? (
                      <ExternalLink className="h-4 w-4 text-indigo-500" />
                    ) : (
                      <Wrench className="h-4 w-4 text-primary-500" />
                    )}
                    <span>Modifying details for <strong>{editingService.service_name}</strong></span>
                  </>
                ) : (
                  <>
                    <Package className="h-4 w-4 text-primary-500" />
                    <span>Modifying details for <strong>{editingPart?.part_name}</strong></span>
                  </>
                )}
              </div>
            )}

            <div className="p-5 overflow-y-auto flex-1">
              {extraWorkTab === 'labor' ? (
                <form onSubmit={handleAddExtraService} className="space-y-4">
                  {/* Origin / Classification Selector */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Labor Scope / Classification *
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setExtraServiceIsExtra(false)}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          !extraServiceIsExtra
                            ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 dark:border-blue-700 ring-1 ring-blue-500'
                            : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                            !extraServiceIsExtra ? 'border-blue-600 bg-blue-600' : 'border-slate-400'
                          }`}>
                            {!extraServiceIsExtra && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
                          </span>
                          <span className="text-xs font-bold text-gray-900 dark:text-slate-100">
                            Initial Quotation
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 pl-5 leading-tight">
                          Planned labor in initial customer estimate
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setExtraServiceIsExtra(true)}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          extraServiceIsExtra
                            ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-500 dark:border-amber-700 ring-1 ring-amber-500'
                            : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                            extraServiceIsExtra ? 'border-amber-600 bg-amber-600' : 'border-slate-400'
                          }`}>
                            {extraServiceIsExtra && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
                          </span>
                          <span className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                            <Sparkles className="h-3 w-3" />
                            Extra Work
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 pl-5 leading-tight">
                          Discovered mid-repair, billed additionally
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Catalog quick-picker */}
                  {!editingService && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          Quick Select from Services Catalog (Optional)
                        </label>
                        {extraServiceId && (
                          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Catalog Item Linked
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                          <input
                            type="text"
                            value={serviceSearchQuery}
                            onChange={(e) => {
                              setServiceSearchQuery(e.target.value);
                              setIsServiceDropdownOpen(true);
                            }}
                            onFocus={() => setIsServiceDropdownOpen(true)}
                            placeholder="Search in-house labor catalog..."
                            className="input pl-9 pr-8 w-full text-xs"
                          />
                          {(serviceSearchQuery || extraServiceId) && (
                            <button
                              type="button"
                              onClick={() => {
                                setServiceSearchQuery('');
                                setExtraServiceId('');
                                setIsServiceDropdownOpen(false);
                              }}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                              title="Clear selection"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Dropdown Popover */}
                        {isServiceDropdownOpen && (
                          <>
                            <div
                              className="fixed inset-0 z-40"
                              onClick={() => setIsServiceDropdownOpen(false)}
                            />
                            <div className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white dark:bg-[#0c101c] border border-gray-200 dark:border-slate-700 rounded-xl shadow-2xl divide-y divide-gray-100 dark:divide-slate-800">
                              {filteredCatalogServices.length > 0 ? (
                                filteredCatalogServices.map((s: any) => (
                                  <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => {
                                      setExtraServiceId(s.id);
                                      setExtraServiceName(s.name);
                                      setExtraServiceDesc(s.description || '');
                                      setExtraServicePrice(String(s.rate || s.price || '0'));
                                      setServiceSearchQuery(s.name);
                                      setIsServiceDropdownOpen(false);
                                    }}
                                    className="w-full text-left p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors flex items-center justify-between gap-3"
                                  >
                                    <div className="space-y-0.5 min-w-0">
                                      <p className="text-xs font-bold text-gray-900 dark:text-slate-100 truncate">
                                        {s.name}
                                      </p>
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium border border-slate-200 dark:border-slate-700">
                                          {s.category || 'General'}
                                        </span>
                                        {s.duration && (
                                          <span className="text-[10px] text-slate-400">{s.duration} min</span>
                                        )}
                                      </div>
                                    </div>
                                    <span className="text-xs font-extrabold text-primary-600 dark:text-primary-400 shrink-0">
                                      {formatCurrency(s.rate || s.price)}
                                    </span>
                                  </button>
                                ))
                              ) : (
                                <div className="p-4 text-center text-xs text-slate-400">
                                  No catalog services matched "{serviceSearchQuery}". You can enter custom details below.
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Labor Operation Name *
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

                  {/* Multi-Technician Assignment Section */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Assign Technicians ({extraServiceTechIds.length} Selected)
                      </label>
                      <span className="text-[11px] text-slate-400">
                        Optional / Multi-select
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 text-[11px] text-blue-800 dark:text-blue-300 mb-2 flex items-start gap-1.5">
                      <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-blue-500" />
                      <span>
                        Can be assigned to technicians or left unassigned for general workshop team.
                      </span>
                    </div>

                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 border border-gray-200 dark:border-slate-800 rounded-lg p-2 bg-slate-50/50 dark:bg-slate-900/40">
                      {((technicians?.technicians || (Array.isArray(technicians) ? technicians : []))).length === 0 ? (
                        <p className="text-xs text-slate-400 italic text-center py-2">
                          No technicians or staff available
                        </p>
                      ) : (
                        ((technicians?.technicians || (Array.isArray(technicians) ? technicians : []))).map((t: any) => {
                          const isChecked = extraServiceTechIds.includes(t.id);
                          return (
                            <label
                              key={t.id}
                              className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                                isChecked
                                  ? 'bg-primary-50 dark:bg-primary-950/50 border-primary-300 dark:border-primary-800 text-primary-900 dark:text-primary-200'
                                  : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleExtraServiceTech(t.id)}
                                  className="rounded text-primary-600 focus:ring-primary-500 h-4 w-4"
                                />
                                <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold">
                                  {t.name.charAt(0)}
                                </div>
                                <span className="font-semibold">{t.name}</span>
                                {t.role === 'MANAGER' && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                    Manager
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400">{t.phone || ''}</span>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowExtraWorkModal(false);
                        resetServiceForm();
                      }}
                      className="btn btn-secondary text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={addServiceMutation.isLoading || updateServiceMutation.isLoading}
                      className="btn btn-primary text-xs"
                    >
                      {editingService
                        ? (updateServiceMutation.isLoading ? 'Saving...' : 'Save Labor Changes')
                        : (addServiceMutation.isLoading
                            ? 'Adding...'
                            : (extraServiceIsExtra ? 'Add Extra Labor' : 'Add Planned Labor'))}
                    </button>
                  </div>
                </form>
              ) : extraWorkTab === 'external' ? (
                <form onSubmit={handleAddExtraService} className="space-y-4">
                  {/* Origin / Classification Selector */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Sublet Service Scope / Classification *
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setExtraServiceIsExtra(false)}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          !extraServiceIsExtra
                            ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 dark:border-blue-700 ring-1 ring-blue-500'
                            : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                            !extraServiceIsExtra ? 'border-blue-600 bg-blue-600' : 'border-slate-400'
                          }`}>
                            {!extraServiceIsExtra && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
                          </span>
                          <span className="text-xs font-bold text-gray-900 dark:text-slate-100">
                            Initial Quotation
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 pl-5 leading-tight">
                          Planned sublet work in initial customer estimate
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setExtraServiceIsExtra(true)}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          extraServiceIsExtra
                            ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-500 dark:border-amber-700 ring-1 ring-amber-500'
                            : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                            extraServiceIsExtra ? 'border-amber-600 bg-amber-600' : 'border-slate-400'
                          }`}>
                            {extraServiceIsExtra && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
                          </span>
                          <span className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                            <Sparkles className="h-3 w-3" />
                            Extra Work
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 pl-5 leading-tight">
                          Discovered mid-repair, billed additionally
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Catalog quick-picker for external services */}
                  {!editingService && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          Quick Select from External / Sublet Catalog (Optional)
                        </label>
                        {extraServiceId && (
                          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Catalog Item Linked
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                          <input
                            type="text"
                            value={serviceSearchQuery}
                            onChange={(e) => {
                              setServiceSearchQuery(e.target.value);
                              setIsServiceDropdownOpen(true);
                            }}
                            onFocus={() => setIsServiceDropdownOpen(true)}
                            placeholder="Search injector, turbo, lathe, AC gas, skimming..."
                            className="input pl-9 pr-8 w-full text-xs"
                          />
                          {(serviceSearchQuery || extraServiceId) && (
                            <button
                              type="button"
                              onClick={() => {
                                setServiceSearchQuery('');
                                setExtraServiceId('');
                                setIsServiceDropdownOpen(false);
                              }}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                              title="Clear selection"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Dropdown Popover */}
                        {isServiceDropdownOpen && (
                          <>
                            <div
                              className="fixed inset-0 z-40"
                              onClick={() => setIsServiceDropdownOpen(false)}
                            />
                            <div className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white dark:bg-[#0c101c] border border-gray-200 dark:border-slate-700 rounded-xl shadow-2xl divide-y divide-gray-100 dark:divide-slate-800">
                              {filteredCatalogServices.length > 0 ? (
                                filteredCatalogServices.map((s: any) => (
                                  <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => {
                                      setExtraServiceId(s.id);
                                      setExtraServiceName(s.name);
                                      setExtraServiceDesc(s.description || '');
                                      setExtraServicePrice(String(s.rate || s.price || '0'));
                                      if (s.default_vendor || s.defaultVendor) {
                                        setExtraServiceVendor(s.default_vendor || s.defaultVendor);
                                      }
                                      if (s.default_cost || s.defaultCost) {
                                        setExtraServiceCost(String(s.default_cost || s.defaultCost));
                                      }
                                      setServiceSearchQuery(s.name);
                                      setIsServiceDropdownOpen(false);
                                    }}
                                    className="w-full text-left p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors flex items-center justify-between gap-3"
                                  >
                                    <div className="space-y-0.5 min-w-0">
                                      <p className="text-xs font-bold text-gray-900 dark:text-slate-100 truncate">
                                        {s.name}
                                      </p>
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-medium border border-indigo-200 dark:border-indigo-800">
                                          {s.category || 'Specialized / Sublet'}
                                        </span>
                                        {(s.default_vendor || s.defaultVendor) && (
                                          <span className="text-[10px] text-slate-400">
                                            Vendor: {s.default_vendor || s.defaultVendor}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 shrink-0">
                                      {formatCurrency(s.rate || s.price)}
                                    </span>
                                  </button>
                                ))
                              ) : (
                                <div className="p-4 text-center text-xs text-slate-400">
                                  No external services matched "{serviceSearchQuery}". You can enter custom details below.
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      External Sublet Service Name *
                    </label>
                    <input
                      type="text"
                      value={extraServiceName}
                      onChange={(e) => setExtraServiceName(e.target.value)}
                      placeholder="e.g. Diesel Fuel Injector Testing & Calibration"
                      className="input w-full text-xs"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Service Provider / Vendor Lab Name
                      </label>
                      <input
                        type="text"
                        value={extraServiceVendor}
                        onChange={(e) => setExtraServiceVendor(e.target.value)}
                        placeholder="e.g. Bosch Diesel Center, Precision Machine Shop"
                        className="input w-full text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Sublet Procurement Cost (₹) <span className="text-[10px] text-slate-400 font-normal">(Internal cost)</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={extraServiceCost}
                        onChange={(e) => setExtraServiceCost(e.target.value)}
                        placeholder="0.00"
                        className="input w-full text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Lab Test Scope / Findings Notes
                    </label>
                    <textarea
                      value={extraServiceDesc}
                      onChange={(e) => setExtraServiceDesc(e.target.value)}
                      placeholder="e.g. 4 injectors sent for ultrasonic cleaning and spray pattern test..."
                      rows={2}
                      className="input w-full text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Quantity / Jobs
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0.5"
                        value={extraServiceHours}
                        onChange={(e) => setExtraServiceHours(e.target.value)}
                        className="input w-full text-xs font-mono"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Customer Billed Price (₹)
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

                  {/* Outsourced Info Box */}
                  <div className="p-3 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-900/40 text-[11px] text-indigo-800 dark:text-indigo-300 flex items-start gap-2">
                    <Info className="h-4 w-4 shrink-0 mt-0.5 text-indigo-500" />
                    <div>
                      <p className="font-semibold">Specialized Sublet Operation</p>
                      <p className="text-[10px] text-indigo-700/80 dark:text-indigo-300/80 mt-0.5">
                        This work is performed by an outside specialized facility (diesel pump room, lathe shop, turbo rebuilder). Workshop technicians do not need to be assigned.
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowExtraWorkModal(false);
                        resetServiceForm();
                      }}
                      className="btn btn-secondary text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={addServiceMutation.isLoading || updateServiceMutation.isLoading}
                      className="btn bg-indigo-600 hover:bg-indigo-700 text-white text-xs py-2 px-4 rounded-lg font-semibold"
                    >
                      {editingService
                        ? (updateServiceMutation.isLoading ? 'Saving...' : 'Save External Service')
                        : (addServiceMutation.isLoading
                            ? 'Adding...'
                            : (extraServiceIsExtra ? 'Add Extra External Service' : 'Add Planned External Service'))}
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleAddExtraPart} className="space-y-4">
                  {/* Origin / Classification Selector */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Part Scope / Classification *
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setExtraPartIsExtra(false)}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          !extraPartIsExtra
                            ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 dark:border-blue-700 ring-1 ring-blue-500'
                            : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                            !extraPartIsExtra ? 'border-blue-600 bg-blue-600' : 'border-slate-400'
                          }`}>
                            {!extraPartIsExtra && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
                          </span>
                          <span className="text-xs font-bold text-gray-900 dark:text-slate-100">
                            Initial Quotation
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 pl-5 leading-tight">
                          Planned part included in initial customer estimate
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setExtraPartIsExtra(true)}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          extraPartIsExtra
                            ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-500 dark:border-amber-700 ring-1 ring-amber-500'
                            : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                            extraPartIsExtra ? 'border-amber-600 bg-amber-600' : 'border-slate-400'
                          }`}>
                            {extraPartIsExtra && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
                          </span>
                          <span className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                            <Sparkles className="h-3 w-3" />
                            Extra Material
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 pl-5 leading-tight">
                          Discovered mid-repair, billed as additional material
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Quick Register New Part or Inventory Select */}
                  {!editingPart && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {showQuickCreatePart ? 'Register New Part to Inventory' : 'Quick Select from Inventory (Optional)'}
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setShowQuickCreatePart(!showQuickCreatePart);
                            if (!showQuickCreatePart) {
                              setQuickPartMake(jobCard?.vehicle_make || '');
                              setQuickPartModel(jobCard?.vehicle_model_name || jobCard?.vehicle_model || '');
                              setQuickPartName('');
                              setQuickPartNumber('');
                              setQuickOemPartNumber('');
                              setQuickPartPrice('');
                              setQuickPartCost('');
                            }
                          }}
                          className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-semibold flex items-center gap-1 hover:underline"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>{showQuickCreatePart ? 'Select Existing Part' : '+ Add New Part to Inventory'}</span>
                        </button>
                      </div>

                      {/* Quick Add New Part Sub-form */}
                      {showQuickCreatePart ? (
                        <div className="p-4 rounded-xl border border-primary-200 dark:border-primary-800/80 bg-primary-50/20 dark:bg-primary-950/20 space-y-3">
                          <div className="flex items-center justify-between border-b border-primary-100 dark:border-primary-900/40 pb-2">
                            <div className="flex items-center gap-1.5">
                              <Package className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                              <span className="text-xs font-bold text-gray-900 dark:text-slate-100">
                                New Car-Specific Part Registration
                              </span>
                            </div>
                            <span className="text-[10px] text-primary-600 dark:text-primary-400 font-medium">
                              Saves to inventory & auto-selects for this job
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="sm:col-span-2">
                              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                                Part Name *
                              </label>
                              <input
                                type="text"
                                value={quickPartName}
                                onChange={(e) => setQuickPartName(e.target.value)}
                                placeholder="e.g. Front Disc Brake Pads Set"
                                className="input w-full text-xs font-medium"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                                Car Make / Brand
                              </label>
                              <input
                                type="text"
                                value={quickPartMake}
                                onChange={(e) => setQuickPartMake(e.target.value)}
                                placeholder="e.g. Maruti Suzuki / Universal"
                                className="input w-full text-xs"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                                Car Model
                              </label>
                              <input
                                type="text"
                                value={quickPartModel}
                                onChange={(e) => setQuickPartModel(e.target.value)}
                                placeholder="e.g. Swift"
                                className="input w-full text-xs"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                                Generation / Era
                              </label>
                              <input
                                type="text"
                                value={quickPartGen}
                                onChange={(e) => setQuickPartGen(e.target.value)}
                                placeholder="e.g. 3rd Gen (2018-2024)"
                                className="input w-full text-xs"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                                OEM Part Number
                              </label>
                              <input
                                type="text"
                                value={quickOemPartNumber}
                                onChange={(e) => setQuickOemPartNumber(e.target.value)}
                                placeholder="e.g. 55810M68P00"
                                className="input w-full text-xs font-mono"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                                Part Type
                              </label>
                              <select
                                value={quickPartType}
                                onChange={(e) => setQuickPartType(e.target.value)}
                                className="input w-full text-xs"
                              >
                                <option value="OEM Genuine">OEM Genuine</option>
                                <option value="OES (Original Equipment Supplier)">OES</option>
                                <option value="Aftermarket Premium">Aftermarket Premium</option>
                                <option value="Aftermarket Standard">Aftermarket Standard</option>
                                <option value="Universal / Consumable">Universal / Consumable</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                                Part Brand / Mfr
                              </label>
                              <input
                                type="text"
                                value={quickPartBrand}
                                onChange={(e) => setQuickPartBrand(e.target.value)}
                                placeholder="e.g. Maruti MGP, Bosch, Mobis"
                                className="input w-full text-xs"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                                Category
                              </label>
                              <select
                                value={quickPartCategory}
                                onChange={(e) => setQuickPartCategory(e.target.value)}
                                className="input w-full text-xs"
                              >
                                {DEFAULT_SPARE_PART_CATEGORIES.map(cat => (
                                  <option key={cat} value={cat}>{cat}</option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                                Initial Stock & Unit
                              </label>
                              <div className="flex gap-2">
                                <input
                                  type="number"
                                  value={quickPartStock}
                                  onChange={(e) => setQuickPartStock(e.target.value)}
                                  min="1"
                                  className="input w-16 text-xs font-mono"
                                />
                                <select
                                  value={quickPartUnit}
                                  onChange={(e) => setQuickPartUnit(e.target.value)}
                                  className="input flex-1 text-xs"
                                >
                                  <option value="pieces">Pieces</option>
                                  <option value="sets">Sets</option>
                                  <option value="pairs">Pairs</option>
                                  <option value="liters">Liters</option>
                                </select>
                              </div>
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                                Customer Retail Price (₹) *
                              </label>
                              <input
                                type="number"
                                value={quickPartPrice}
                                onChange={(e) => setQuickPartPrice(e.target.value)}
                                placeholder="0.00"
                                className="input w-full text-xs font-mono font-bold"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                                Garage Cost (₹)
                              </label>
                              <input
                                type="number"
                                value={quickPartCost}
                                onChange={(e) => setQuickPartCost(e.target.value)}
                                placeholder="0.00"
                                className="input w-full text-xs font-mono"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end gap-2 pt-2 border-t border-primary-100 dark:border-primary-900/40">
                            <button
                              type="button"
                              onClick={() => setShowQuickCreatePart(false)}
                              className="btn btn-secondary text-xs py-1.5 px-3"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              disabled={isCreatingPart}
                              onClick={handleQuickCreatePartSubmit}
                              className="btn btn-primary text-xs py-1.5 px-3.5 flex items-center gap-1.5 font-semibold"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>{isCreatingPart ? 'Saving...' : 'Save & Select for Job Card'}</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Standard Searchable Combobox */
                        <div className="relative">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                            <input
                              type="text"
                              value={partSearchQuery}
                              onChange={(e) => {
                                setPartSearchQuery(e.target.value);
                                setIsPartDropdownOpen(true);
                              }}
                              onFocus={() => setIsPartDropdownOpen(true)}
                              placeholder={`Search by part name, OEM #, car model (${jobCard?.vehicle_model || 'All'})...`}
                              className="input pl-9 pr-8 w-full text-xs"
                            />
                            {(partSearchQuery || extraPartId) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setPartSearchQuery('');
                                  setExtraPartId('');
                                  setIsPartDropdownOpen(false);
                                }}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                                title="Clear selection"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>

                          {/* Dropdown Popover */}
                          {isPartDropdownOpen && (
                            <>
                              <div
                                className="fixed inset-0 z-40"
                                onClick={() => setIsPartDropdownOpen(false)}
                              />
                              <div className="absolute z-50 left-0 right-0 mt-1 max-h-64 overflow-y-auto bg-white dark:bg-[#0c101c] border border-gray-200 dark:border-slate-700 rounded-xl shadow-2xl divide-y divide-gray-100 dark:divide-slate-800">
                                {filteredCatalogParts.length > 0 ? (
                                  filteredCatalogParts.map((p: any) => {
                                    const stockQty = Number(p.stock_quantity ?? p.stock ?? 0);
                                    const isLow = stockQty <= Number(p.min_stock_level ?? p.minStock ?? 5);
                                    const pMake = (p.make || '').toLowerCase();
                                    const pModel = (p.model || '').toLowerCase();
                                    const isCarMatch = vehicleMake && pMake && (vehicleMake.includes(pMake) || pMake.includes(vehicleMake)) &&
                                      (!pModel || !vehicleModel || vehicleModel.includes(pModel) || pModel.includes(vehicleModel));
                                    const isUniv = pMake === 'universal';

                                    return (
                                      <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => {
                                          setExtraPartId(p.id);
                                          setExtraPartName(p.name);
                                          setExtraPartNumber(p.oem_part_number || p.oemPartNumber || p.part_number || p.partNumber || '');
                                          setExtraPartDesc(p.compatibility_notes || p.compatibilityNotes || p.description || '');
                                          setExtraPartPrice(String(p.price || '0'));
                                          setExtraPartUnit(p.unit || 'pieces');
                                          setPartSearchQuery(p.name);
                                          setIsPartDropdownOpen(false);
                                        }}
                                        className={`w-full text-left p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors flex items-center justify-between gap-3 ${
                                          isCarMatch ? 'bg-emerald-500/[0.04]' : ''
                                        }`}
                                      >
                                        <div className="space-y-1 min-w-0">
                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            <p className="text-xs font-bold text-gray-900 dark:text-slate-100 truncate">
                                              {p.name}
                                            </p>
                                            {p.brand && (
                                              <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                                {p.brand}
                                              </span>
                                            )}
                                          </div>

                                          <div className="flex flex-wrap items-center gap-1.5">
                                            {isCarMatch ? (
                                              <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                                                🎯 Fits {p.make} {p.model} {p.generation ? `(${p.generation})` : ''}
                                              </span>
                                            ) : isUniv ? (
                                              <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                                🌐 Universal
                                              </span>
                                            ) : p.make ? (
                                              <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60">
                                                {p.make} {p.model}
                                              </span>
                                            ) : null}

                                            {(p.oem_part_number || p.oemPartNumber) && (
                                              <span className="text-[10px] font-mono text-primary-600 dark:text-primary-400">
                                                OEM: {p.oem_part_number || p.oemPartNumber}
                                              </span>
                                            )}

                                            <span className={`text-[10px] font-semibold ${isLow ? 'text-red-400' : 'text-slate-400'}`}>
                                              Stock: {stockQty} {p.unit || 'pcs'}
                                            </span>
                                          </div>
                                        </div>

                                        <span className="text-xs font-extrabold text-primary-600 dark:text-primary-400 shrink-0">
                                          {formatCurrency(p.price)}
                                        </span>
                                      </button>
                                    );
                                  })
                                ) : (
                                  <div className="p-4 text-center text-xs text-slate-400">
                                    No inventory parts matched "{partSearchQuery}". You can enter custom details below or click "+ Add New Part to Inventory" above.
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}

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
                      onClick={() => {
                        setShowExtraWorkModal(false);
                        resetPartForm();
                      }}
                      className="btn btn-secondary text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={addPartMutation.isLoading || updatePartMutation.isLoading}
                      className="btn btn-primary text-xs"
                    >
                      {editingPart
                        ? (updatePartMutation.isLoading ? 'Saving...' : 'Save Part Changes')
                        : (addPartMutation.isLoading
                            ? 'Adding...'
                            : (extraPartIsExtra ? 'Add Extra Spare Part' : 'Add Planned Spare Part'))}
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
                {((technicians?.technicians || (Array.isArray(technicians) ? technicians : []))).length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-4 text-center">
                    No assignable technicians or staff found. Ensure users have the "Assignable as Technician" scope in User Management.
                  </p>
                ) : (
                  ((technicians?.technicians || (Array.isArray(technicians) ? technicians : []))).map((t: any) => {
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
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold">{t.name}</span>
                            {t.role === 'MANAGER' && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                Manager
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-400">{t.phone || t.email}</span>
                      </label>
                    );
                  })
                )}
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
      {/* MODAL 4: MARK ITEM AS PROCURED / RECORD OPEX CASH OUTFLOW                */}
      {/* ========================================================================= */}
      {procurementModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#0e1424] border border-gray-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-base">
                <CreditCard className="h-5 w-5" />
                <span>
                  {procurementModal.type === 'PART'
                    ? 'Mark Spare Part as Procured'
                    : 'Mark Sublet Service as Paid to Lab'}
                </span>
              </div>
              <button
                onClick={() => setProcurementModal({ isOpen: false, type: 'PART', item: null })}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleProcureSubmit} className="p-5 space-y-4">
              {/* Item Summary Card */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-gray-200 dark:border-slate-800 text-xs space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-900 dark:text-slate-100 text-sm">
                    {procurementModal.item?.part_name || procurementModal.item?.service_name}
                  </span>
                  {procurementModal.item?.part_number && (
                    <span className="text-[10px] font-mono text-slate-400">
                      PN: {procurementModal.item?.part_number}
                    </span>
                  )}
                </div>

                {/* Price Breakdown Comparison: Retail (Customer) vs Garage Cost */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-200 dark:border-slate-800">
                  <div className="p-2 rounded-lg bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40">
                    <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 block">
                      Customer Retail Price (Billed)
                    </span>
                    <span className="font-bold text-blue-900 dark:text-blue-200 text-xs font-mono">
                      {formatCurrency(procurementModal.item?.total_price)}
                    </span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">
                      {procurementModal.type === 'PART'
                        ? `${formatQuantity(procurementModal.item?.quantity)} ${procurementModal.item?.unit || 'pcs'} @ ${formatCurrency(procurementModal.item?.unit_price)}`
                        : `${formatQuantity(procurementModal.item?.hours_qty)} jobs`}
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40">
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 block">
                      Garage Cost (Catalog / Baseline)
                    </span>
                    <span className="font-bold text-emerald-900 dark:text-emerald-200 text-xs font-mono">
                      {procurementModal.type === 'PART'
                        ? (Number(procurementModal.item?.garage_cost) > 0
                            ? formatCurrency(Number(procurementModal.item?.garage_cost) * Number(procurementModal.item?.quantity || 1))
                            : formatCurrency(procurementModal.item?.total_price))
                        : (Number(procurementModal.item?.cost_price) > 0
                            ? formatCurrency(procurementModal.item?.cost_price)
                            : formatCurrency(procurementModal.item?.total_price))}
                    </span>
                    <span className="text-[9px] text-emerald-600/70 dark:text-emerald-400/70 block mt-0.5">
                      Wholesale / Lab purchase cost
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl p-3 text-xs text-emerald-800 dark:text-emerald-300">
                💡 Only the <strong>Garage Procurement Cost</strong> entered below will be recorded as an OpEx expense in your <strong>Financial Management Ledger</strong> and deducted from your <strong>Total Remaining Cash In-Hand / Bank Balance</strong>. (Customer Retail Price will be collected separately when the bill is paid).
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                    <span>Garage Procurement Cost (₹) *</span>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Cash Outflow</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={procureCost}
                    onChange={(e) => setProcureCost(e.target.value)}
                    placeholder="0.00"
                    className="input w-full text-xs font-mono font-bold"
                  />
                  <span className="text-[10px] text-slate-400">Actual amount paid by garage to supplier / lab</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Method *
                  </label>
                  <select
                    value={procurePaymentMethod}
                    onChange={(e) => setProcurePaymentMethod(e.target.value as any)}
                    className="input w-full text-xs"
                  >
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                    <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                    <option value="CARD">Debit / Credit Card</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {procurementModal.type === 'PART' ? 'Distributor / Parts Supplier' : 'Specialist Lab / Workshop'}
                  </label>
                  <input
                    type="text"
                    value={procureVendor}
                    onChange={(e) => setProcureVendor(e.target.value)}
                    placeholder={procurementModal.type === 'PART' ? 'e.g. Bosch Authorized Distributor' : 'e.g. Precision Lathe & Injector Lab'}
                    className="input w-full text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Supplier Invoice / Receipt #
                  </label>
                  <input
                    type="text"
                    value={procureInvoiceRef}
                    onChange={(e) => setProcureInvoiceRef(e.target.value)}
                    placeholder="e.g. INV-2026-9921"
                    className="input w-full text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Procurement Notes (Optional)
                </label>
                <textarea
                  value={procureNotes}
                  onChange={(e) => setProcureNotes(e.target.value)}
                  rows={2}
                  placeholder="Add any receipt details or warranty notes..."
                  className="input w-full text-xs"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setProcurementModal({ isOpen: false, type: 'PART', item: null })}
                  className="btn btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={procureSparePartMutation.isLoading || procureServiceMutation.isLoading}
                  className="btn bg-emerald-600 hover:bg-emerald-700 text-white text-xs flex items-center gap-1.5 font-bold"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>
                    {procureSparePartMutation.isLoading || procureServiceMutation.isLoading
                      ? 'Recording Expense...'
                      : 'Confirm & Record in Finance'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: REVERT INVOICED JOB CARD BACK TO REPAIRS IN PROGRESS              */}
      {/* ========================================================================= */}
      {showRevertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#0e1424] border border-gray-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-base">
                <RotateCcw className="h-5 w-5" />
                <span>Revert to Repairs in Progress</span>
              </div>
              <button
                onClick={() => setShowRevertModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                  <span>Are you sure you want to revert this Job Card?</span>
                </div>
                <p>
                  This action will move this Job Card back into active workshop status so you can continue editing:
                </p>
                <ul className="list-disc list-inside space-y-1 pl-1 text-[11px]">
                  <li>Linked Invoice <strong>#{jobCard.bill_number}</strong> will be voided and deleted.</li>
                  <li>All spare parts deducted from stock will be <strong>restored back to inventory</strong>.</li>
                  <li>Job Card status will become <strong>IN_PROGRESS</strong>, unlocking all editing.</li>
                </ul>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRevertModal(false)}
                  className="btn btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => revertInvoiceMutation.mutate()}
                  disabled={revertInvoiceMutation.isLoading}
                  className="btn bg-amber-600 hover:bg-amber-700 text-white text-xs flex items-center gap-1.5 font-bold"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>{revertInvoiceMutation.isLoading ? 'Reverting...' : 'Confirm & Revert to In-Progress'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: PERMANENTLY DELETE JOB CARD                                      */}
      {/* ========================================================================= */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#0e1424] border border-gray-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-base">
                <Trash2 className="h-5 w-5" />
                <span>Delete Job Card</span>
              </div>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-900 dark:text-rose-200 space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <AlertTriangle className="h-4 w-4 text-rose-600 flex-shrink-0" />
                  <span>Permanently delete Job Card #{jobCard.job_card_number}?</span>
                </div>
                <p>This action is irreversible:</p>
                <ul className="list-disc list-inside space-y-1 pl-1 text-[11px]">
                  {jobCard.bill_id && (
                    <>
                      <li>Linked invoice #{jobCard.bill_number} will be deleted.</li>
                      <li>Deducted spare parts will be restored to inventory stock.</li>
                    </>
                  )}
                  <li>Any linked procurement expense records in Financial Management will be cleaned up.</li>
                  <li>All associated labor records, sublet services, and checklists will be permanently removed.</li>
                </ul>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="btn btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => deleteJobCardMutation.mutate()}
                  disabled={deleteJobCardMutation.isLoading}
                  className="btn bg-rose-600 hover:bg-rose-700 text-white text-xs flex items-center gap-1.5 font-bold"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>{deleteJobCardMutation.isLoading ? 'Deleting...' : 'Delete Job Card Permanently'}</span>
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
        <div className="border border-black p-4 mb-8 text-xs space-y-4">
          <div>
            <h4 className="font-bold border-b border-gray-400 pb-1 mb-2 uppercase">1. In-House Workshop Labor Checklist</h4>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-black">
                  <th className="py-1">Type</th>
                  <th className="py-1">Labor Operation</th>
                  <th className="py-1 text-center">Done [✓]</th>
                  <th className="py-1 text-right">Technician Sign</th>
                </tr>
              </thead>
              <tbody>
                {laborServices.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-2 italic text-gray-500">No in-house workshop labor operations.</td>
                  </tr>
                ) : (
                  laborServices.map((s: any) => (
                    <tr key={s.id} className="border-b border-gray-200">
                      <td className="py-1.5">{s.is_extra_work ? 'EXTRA WORK' : 'PLANNED'}</td>
                      <td className="py-1.5 font-bold">
                        {s.service_name}
                        {s.assigned_technicians && s.assigned_technicians.length > 0 ? (
                          <span className="block text-[10px] font-normal text-gray-700">
                            Technicians: {s.assigned_technicians.map((t: any) => t.name).join(', ')}
                          </span>
                        ) : s.technician_name ? (
                          <span className="block text-[10px] font-normal text-gray-700">
                            Technician: {s.technician_name}
                          </span>
                        ) : (
                          <span className="block text-[10px] font-normal text-gray-500 italic">
                            General Workshop Crew
                          </span>
                        )}
                      </td>
                      <td className="py-1.5 text-center">[  ]</td>
                      <td className="py-1.5 text-right">________________</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div>
            <h4 className="font-bold border-b border-gray-400 pb-1 mb-2 uppercase">2. Specialized & External Sublet Checklist</h4>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-black">
                  <th className="py-1">Type</th>
                  <th className="py-1">Sublet Service</th>
                  <th className="py-1">Specialized Vendor / Lab</th>
                  <th className="py-1 text-center">Received [✓]</th>
                </tr>
              </thead>
              <tbody>
                {externalServices.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-2 italic text-gray-500">No outsourced or specialized sublet services.</td>
                  </tr>
                ) : (
                  externalServices.map((s: any) => (
                    <tr key={s.id} className="border-b border-gray-200">
                      <td className="py-1.5">{s.is_extra_work ? 'EXTRA WORK' : 'PLANNED'}</td>
                      <td className="py-1.5 font-bold">{s.service_name}</td>
                      <td className="py-1.5">{s.vendor_name || 'Specialist Lab / Workshop'}</td>
                      <td className="py-1.5 text-center">[  ]</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div>
            <h4 className="font-bold border-b border-gray-400 pb-1 mb-2 uppercase">3. Required Spare Parts & Materials</h4>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-black">
                  <th className="py-1">Type</th>
                  <th className="py-1">Part Name & Number</th>
                  <th className="py-1 text-center">Qty</th>
                  <th className="py-1 text-center">Fitted [✓]</th>
                </tr>
              </thead>
              <tbody>
                {spareParts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-2 italic text-gray-500">No spare parts recorded.</td>
                  </tr>
                ) : (
                  spareParts.map((p: any) => (
                    <tr key={p.id} className="border-b border-gray-200">
                      <td className="py-1.5">{p.is_extra_work ? 'EXTRA PART' : 'REQUIRED'}</td>
                      <td className="py-1.5 font-medium">
                        {p.part_name} {p.part_number ? `(${p.part_number})` : ''}
                      </td>
                      <td className="py-1.5 text-center">{formatQuantity(p.quantity)} {p.unit || 'pcs'}</td>
                      <td className="py-1.5 text-center">[  ]</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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

        {/* Section 1: Workshop Labor */}
        <div className="mb-6">
          <h4 className="font-bold text-xs uppercase border-b border-black pb-1 mb-2">1. Scope of In-House Workshop Labor</h4>
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-gray-400">
                <th className="py-1">Labor Operation</th>
                <th className="py-1 text-center">Hours</th>
                <th className="py-1 text-right">Rate</th>
                <th className="py-1 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {laborServices.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-1 italic text-gray-500">No in-house labor operations.</td>
                </tr>
              ) : (
                laborServices.map((s: any) => (
                  <tr key={s.id} className="border-b border-gray-100">
                    <td className="py-1">
                      {s.service_name} {s.is_extra_work ? '(Supplementary Work)' : ''}
                    </td>
                    <td className="py-1 text-center">{formatQuantity(s.hours_qty)}</td>
                    <td className="py-1 text-right">{formatCurrency(s.unit_price)}</td>
                    <td className="py-1 text-right">{formatCurrency(s.total_price)}</td>
                  </tr>
                ))
              )}
              <tr className="font-bold">
                <td colSpan={3} className="text-right py-2">Workshop Labor Subtotal:</td>
                <td className="text-right py-2">{formatCurrency(totalLabor)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Section 2: Specialized & External Sublet Services */}
        <div className="mb-6">
          <h4 className="font-bold text-xs uppercase border-b border-black pb-1 mb-2">2. Specialized & External Sublet Services</h4>
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-gray-400">
                <th className="py-1">Specialized Service / Vendor</th>
                <th className="py-1 text-center">Jobs / Qty</th>
                <th className="py-1 text-right">Rate</th>
                <th className="py-1 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {externalServices.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-1 italic text-gray-500">No specialized external sublet services.</td>
                </tr>
              ) : (
                externalServices.map((s: any) => (
                  <tr key={s.id} className="border-b border-gray-100">
                    <td className="py-1">
                      {s.service_name} {s.vendor_name ? `(${s.vendor_name})` : ''} {s.is_extra_work ? '(Supplementary Work)' : ''}
                    </td>
                    <td className="py-1 text-center">{formatQuantity(s.hours_qty)}</td>
                    <td className="py-1 text-right">{formatCurrency(s.unit_price)}</td>
                    <td className="py-1 text-right">{formatCurrency(s.total_price)}</td>
                  </tr>
                ))
              )}
              <tr className="font-bold">
                <td colSpan={3} className="text-right py-2">External Sublet Subtotal:</td>
                <td className="text-right py-2">{formatCurrency(totalExternal)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Section 3: Spare Parts */}
        <div className="mb-6">
          <h4 className="font-bold text-xs uppercase border-b border-black pb-1 mb-2">3. Required Spare Parts & Materials</h4>
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
              {spareParts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-1 italic text-gray-500">No spare parts recorded.</td>
                </tr>
              ) : (
                spareParts.map((p: any) => (
                  <tr key={p.id} className="border-b border-gray-100">
                    <td className="py-1">
                      {p.part_name} {p.is_extra_work ? '(Supplementary Material)' : ''}
                    </td>
                    <td className="py-1 text-center">{formatQuantity(p.quantity)} {p.unit || 'pcs'}</td>
                    <td className="py-1 text-right">{formatCurrency(p.unit_price)}</td>
                    <td className="py-1 text-right">{formatCurrency(p.total_price)}</td>
                  </tr>
                ))
              )}
              <tr className="font-bold">
                <td colSpan={3} className="text-right py-2">Parts Subtotal:</td>
                <td className="text-right py-2">{formatCurrency(totalParts)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="border-t-2 border-black pt-4 mb-10 flex justify-end">
          <div className="w-72 text-xs space-y-1 text-right">
            <div className="flex justify-between">
              <span>Workshop Labor:</span>
              <span>{formatCurrency(totalLabor)}</span>
            </div>
            <div className="flex justify-between">
              <span>External Sublet Services:</span>
              <span>{formatCurrency(totalExternal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Spare Parts & Materials:</span>
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
