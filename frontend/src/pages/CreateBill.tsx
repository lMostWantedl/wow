import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { billsService } from '../services/bills';
import { customersService } from '../services/customers';
import { sparePartsService } from '../services/spareParts';
import { servicesService } from '../services/services';
import { usersService } from '../services/users';
import { vehiclesService } from '../services/vehicles';
import { CreateBillData } from '../types';
import { Plus, Trash2, Save, X, UserPlus, Package, Wrench } from 'lucide-react';
import toast from 'react-hot-toast';
import { getEngineTypesByCategory, FUEL_TYPES, TRANSMISSION_TYPES } from '../constants/vehicleOptions';
import { DEFAULT_SPARE_PART_CATEGORIES } from '../constants/sparePartOptions';

interface CreateBillFormData {
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

const CreateBill: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [isCreatingNewCustomer, setIsCreatingNewCustomer] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [originalVehicleInfo, setOriginalVehicleInfo] = useState({
    makeId: '',
    modelId: '',
    variantId: '',
    colorId: '',
    licensePlate: ''
  });
  const [showSparePartDialog, setShowSparePartDialog] = useState(false);
  const [selectedSparePartRowIndex, setSelectedSparePartRowIndex] = useState<number | null>(null);
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [newSparePartData, setNewSparePartData] = useState({
    name: '',
    partNumber: '',
    description: '',
    category: '',
    price: '',
    cost: '',
    stock: '',
    minStock: '',
    supplier: ''
  });
  const [showServiceDialog, setShowServiceDialog] = useState(false);
  const [selectedServiceRowIndex, setSelectedServiceRowIndex] = useState<number | null>(null);
  const [newServiceData, setNewServiceData] = useState({
    name: '',
    description: '',
    price: '',
    duration: '60'
  });
  const [vehicleInfo, setVehicleInfo] = useState({
    makeId: '',
    modelId: '',
    variantId: '',
    colorId: '',
    licensePlate: ''
  });
  const [vehicleManualInputs, setVehicleManualInputs] = useState({
    make: false,
    model: false,
    variant: false,
    color: false
  });
  const [vehicleManualData, setVehicleManualData] = useState({
    makeName: '',
    makeCountry: '',
    modelName: '',
    modelYearStart: '',
    modelYearEnd: '',
    modelBodyType: '',
    variantName: '',
    variantCode: '',
    variantEngineType: '',
    variantEngineCapacity: '',
    variantTransmission: '',
    variantFuelType: '',
    colorName: '',
    colorCode: '',
    colorType: ''
  });
  const [originalVehicleManualData, setOriginalVehicleManualData] = useState({
    makeName: '',
    makeCountry: '',
    modelName: '',
    modelYearStart: '',
    modelYearEnd: '',
    modelBodyType: '',
    variantName: '',
    variantCode: '',
    variantEngineType: '',
    variantEngineCapacity: '',
    variantTransmission: '',
    variantFuelType: '',
    colorName: '',
    colorCode: '',
    colorType: ''
  });
  const [newCustomerData, setNewCustomerData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    vehicleMakeId: '',
    vehicleModelId: '',
    vehicleVariantId: '',
    vehicleColorId: '',
    licensePlate: ''
  });
  const [manualInputs, setManualInputs] = useState({
    make: false,
    model: false,
    variant: false,
    color: false
  });
  const [manualData, setManualData] = useState({
    makeName: '',
    makeCountry: '',
    modelName: '',
    modelYearStart: '',
    modelYearEnd: '',
    modelBodyType: '',
    variantName: '',
    variantCode: '',
    variantEngineType: '',
    variantEngineCapacity: '',
    variantTransmission: '',
    variantFuelType: '',
    colorName: '',
    colorCode: '',
    colorType: ''
  });

  const { register, control, handleSubmit, watch, setValue } = useForm<CreateBillFormData>({
    defaultValues: {
      spareParts: [],
      services: [],
      discountAmount: 0,
      taxRate: 18,
    }
  });

  const { fields: sparePartFields, append: appendSparePart, remove: removeSparePartField } = useFieldArray({
    control,
    name: 'spareParts'
  });

  const { fields: serviceFields, append: appendService, remove: removeServiceField } = useFieldArray({
    control,
    name: 'services'
  });

  const watchedSpareParts = watch('spareParts') || [];
  const watchedServices = watch('services') || [];
  const watchedDiscount = watch('discountAmount') || 0;
  const watchedTaxRate = watch('taxRate') || 0;

  // Calculate totals
  const sparePartsSubtotal = watchedSpareParts.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const servicesSubtotal = watchedServices.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const subtotal = sparePartsSubtotal + servicesSubtotal;
  const taxAmount = (subtotal - watchedDiscount) * (watchedTaxRate / 100);
  const totalAmount = subtotal - watchedDiscount + taxAmount;

  // Fetch data
  const { data: customers } = useQuery('customers', () => customersService.getCustomers({ limit: 100 }));
  const { data: spareParts } = useQuery('spare-parts', () => sparePartsService.getSpareParts({ limit: 100 }));
  const { data: services } = useQuery('services', () => servicesService.getServices({ limit: 100 }));
  const { data: technicians } = useQuery('technicians', () => usersService.getTechnicians());
  const { data: categories } = useQuery(
    'spare-part-categories', 
    () => sparePartsService.getCategories(),
    {
      enabled: showSparePartDialog // Only fetch when dialog is open
    }
  );

  const mergedCategories = Array.from(new Set([
    ...DEFAULT_SPARE_PART_CATEGORIES,
    ...(categories?.categories || [])
  ])).sort((a, b) => a.localeCompare(b));

  const addCategoryMutation = useMutation(
    (categoryName: string) => sparePartsService.createCategory(categoryName),
    {
      onSuccess: (_, categoryName) => {
        queryClient.invalidateQueries('spare-part-categories');
        setNewSparePartData(prev => ({ ...prev, category: categoryName }));
        setIsAddingNewCategory(false);
        setNewCategoryInput('');
        toast.success(`Category "${categoryName}" added!`);
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.message || 'Failed to add category');
      }
    }
  );
  const { data: vehicleMakes } = useQuery('vehicle-makes', () => vehiclesService.getMakes());
  const { data: vehicleModels } = useQuery(
    ['vehicle-models', newCustomerData.vehicleMakeId],
    () => vehiclesService.getModels(newCustomerData.vehicleMakeId),
    { enabled: !!newCustomerData.vehicleMakeId }
  );
  const { data: vehicleVariants } = useQuery(
    ['vehicle-variants', newCustomerData.vehicleModelId],
    () => vehiclesService.getVariants(newCustomerData.vehicleModelId),
    { enabled: !!newCustomerData.vehicleModelId }
  );
  const { data: vehicleColors } = useQuery(
    ['vehicle-colors', newCustomerData.vehicleVariantId],
    () => vehiclesService.getColors(newCustomerData.vehicleVariantId),
    { enabled: !!newCustomerData.vehicleVariantId }
  );

  // Vehicle queries for main form
  const { data: mainVehicleModels } = useQuery(
    ['vehicle-models', vehicleInfo.makeId],
    () => vehiclesService.getModels(vehicleInfo.makeId),
    { enabled: !!vehicleInfo.makeId }
  );
  const { data: mainVehicleVariants } = useQuery(
    ['vehicle-variants', vehicleInfo.modelId],
    () => vehiclesService.getVariants(vehicleInfo.modelId),
    { enabled: !!vehicleInfo.modelId }
  );
  const { data: mainVehicleColors } = useQuery(
    ['vehicle-colors', vehicleInfo.variantId],
    () => vehiclesService.getColors(vehicleInfo.variantId),
    { enabled: !!vehicleInfo.variantId }
  );

  const createBillMutation = useMutation(billsService.createBill, {
    onSuccess: (data) => {
      toast.success('Bill created successfully!');
      queryClient.invalidateQueries('bills');
      navigate(`/bills/${data.bill.id}`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create bill');
    }
  });

  const createCustomerMutation = useMutation(customersService.createCustomer, {
    onSuccess: (data) => {
      toast.success('Customer created successfully!');
      setSelectedCustomer(data.customer);
      setIsCreatingNewCustomer(false);
      // Reset new customer form
      setNewCustomerData({
        name: '',
        phone: '',
        email: '',
        address: '',
        vehicleMakeId: '',
        vehicleModelId: '',
        vehicleVariantId: '',
        vehicleColorId: '',
        licensePlate: ''
      });
      // Reset manual inputs
      setManualInputs({
        make: false,
        model: false,
        variant: false,
        color: false
      });
      setManualData({
        makeName: '',
        makeCountry: '',
        modelName: '',
        modelYearStart: '',
        modelYearEnd: '',
        modelBodyType: '',
        variantName: '',
        variantCode: '',
        variantEngineType: '',
        variantEngineCapacity: '',
        variantTransmission: '',
        variantFuelType: '',
        colorName: '',
        colorCode: '',
        colorType: ''
      });
      // Refresh customers list
      queryClient.invalidateQueries('customers');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create customer');
    }
  });

  const createMakeMutation = useMutation(vehiclesService.createMake, {
    onSuccess: (data) => {
      queryClient.invalidateQueries('vehicle-makes');
    }
  });

  const createModelMutation = useMutation(vehiclesService.createModel, {
    onSuccess: (data) => {
      queryClient.invalidateQueries(['vehicle-models', newCustomerData.vehicleMakeId]);
    }
  });

  const createVariantMutation = useMutation(vehiclesService.createVariant, {
    onSuccess: (data) => {
      queryClient.invalidateQueries(['vehicle-variants', newCustomerData.vehicleModelId]);
    }
  });

  const createColorMutation = useMutation(vehiclesService.createColor, {
    onSuccess: (data) => {
      queryClient.invalidateQueries(['vehicle-colors', newCustomerData.vehicleVariantId]);
    }
  });

  const createSparePartMutation = useMutation(
    (data: any) => sparePartsService.createSparePart(data),
    {
      onSuccess: (data: any) => {
        toast.success('Spare part created successfully!');
        queryClient.invalidateQueries('spare-parts');
        setShowSparePartDialog(false);
        const created = data?.sparePart || data;
        if (created?.id && selectedSparePartRowIndex !== null) {
          setValue(`spareParts.${selectedSparePartRowIndex}.sparePartId`, created.id);
          setValue(`spareParts.${selectedSparePartRowIndex}.description`, created.description || '');
          setValue(`spareParts.${selectedSparePartRowIndex}.unitPrice`, created.price || 0);
          setSelectedSparePartRowIndex(null);
        }
        // Reset form
        setIsAddingNewCategory(false);
        setNewCategoryInput('');
        setNewSparePartData({
          name: '',
          partNumber: '',
          description: '',
          category: '',
          price: '',
          cost: '',
          stock: '',
          minStock: '',
          supplier: ''
        });
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to create spare part');
      }
    }
  );

  const handleCloseSparePartDialog = () => {
    if (selectedSparePartRowIndex !== null) {
      setValue(`spareParts.${selectedSparePartRowIndex}.sparePartId`, '');
      setSelectedSparePartRowIndex(null);
    }
    setIsAddingNewCategory(false);
    setNewCategoryInput('');
    setShowSparePartDialog(false);
  };

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
          setValue(`services.${selectedServiceRowIndex}.unitPrice`, created.price || 0);
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


  /* const handleCustomerCreated = (customer: any) => {
    setSelectedCustomer(customer);
    queryClient.invalidateQueries('customers');
  }; */

  // Populate vehicle info when customer is selected
  useEffect(() => {
    if (selectedCustomer && selectedCustomer.vehicles && selectedCustomer.vehicles.length > 0) {
      // Set the primary vehicle as default, or first vehicle if no primary
      const primaryVehicle = selectedCustomer.vehicles.find((v: any) => v.isPrimary) || selectedCustomer.vehicles[0];
      const vehicleData = {
        makeId: primaryVehicle.makeId || '',
        modelId: primaryVehicle.modelId || '',
        variantId: primaryVehicle.variantId || '',
        colorId: primaryVehicle.colorId || '',
        licensePlate: primaryVehicle.licensePlate || ''
      };
      setSelectedVehicleId(primaryVehicle.id);
      setVehicleInfo(vehicleData);
      setOriginalVehicleInfo(vehicleData);
      // Reset manual data when selecting existing vehicle
      const emptyManualData = {
        makeName: '',
        makeCountry: '',
        modelName: '',
        modelYearStart: '',
        modelYearEnd: '',
        modelBodyType: '',
        variantName: '',
        variantCode: '',
        variantEngineType: '',
        variantEngineCapacity: '',
        variantTransmission: '',
        variantFuelType: '',
        colorName: '',
        colorCode: '',
        colorType: ''
      };
      setVehicleManualData(emptyManualData);
      setOriginalVehicleManualData(emptyManualData);
    } else {
      setSelectedVehicleId('');
      const emptyData = {
        makeId: '',
        modelId: '',
        variantId: '',
        colorId: '',
        licensePlate: ''
      };
      setVehicleInfo(emptyData);
      setOriginalVehicleInfo(emptyData);
      // Reset manual data
      const emptyManualData = {
        makeName: '',
        makeCountry: '',
        modelName: '',
        modelYearStart: '',
        modelYearEnd: '',
        modelBodyType: '',
        variantName: '',
        variantCode: '',
        variantEngineType: '',
        variantEngineCapacity: '',
        variantTransmission: '',
        variantFuelType: '',
        colorName: '',
        colorCode: '',
        colorType: ''
      };
      setVehicleManualData(emptyManualData);
      setOriginalVehicleManualData(emptyManualData);
    }
  }, [selectedCustomer]);

  const handleNewCustomerInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewCustomerData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleManualInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setManualData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const toggleManualInput = (field: 'make' | 'model' | 'variant' | 'color') => {
    setManualInputs(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleVehicleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setVehicleInfo(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleVehicleManualInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setVehicleManualData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const toggleVehicleManualInput = (field: 'make' | 'model' | 'variant' | 'color') => {
    setVehicleManualInputs(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  // Check if vehicle information has changed
  const hasVehicleChanged = () => {
    if (selectedVehicleId === 'new' || selectedVehicleId === '') return false;
    
    // Check if any manual inputs are enabled and have values
    const hasManualChanges = (
      (vehicleManualInputs.make && vehicleManualData.makeName) ||
      (vehicleManualInputs.model && vehicleManualData.modelName) ||
      (vehicleManualInputs.variant && vehicleManualData.variantName) ||
      (vehicleManualInputs.color && vehicleManualData.colorName)
    );
    
    // Check if manual data has changed from original
    const hasManualDataChanged = (
      vehicleManualData.makeName !== originalVehicleManualData.makeName ||
      vehicleManualData.makeCountry !== originalVehicleManualData.makeCountry ||
      vehicleManualData.modelName !== originalVehicleManualData.modelName ||
      vehicleManualData.modelYearStart !== originalVehicleManualData.modelYearStart ||
      vehicleManualData.modelYearEnd !== originalVehicleManualData.modelYearEnd ||
      vehicleManualData.modelBodyType !== originalVehicleManualData.modelBodyType ||
      vehicleManualData.variantName !== originalVehicleManualData.variantName ||
      vehicleManualData.variantCode !== originalVehicleManualData.variantCode ||
      vehicleManualData.variantEngineType !== originalVehicleManualData.variantEngineType ||
      vehicleManualData.variantEngineCapacity !== originalVehicleManualData.variantEngineCapacity ||
      vehicleManualData.variantTransmission !== originalVehicleManualData.variantTransmission ||
      vehicleManualData.variantFuelType !== originalVehicleManualData.variantFuelType ||
      vehicleManualData.colorName !== originalVehicleManualData.colorName ||
      vehicleManualData.colorCode !== originalVehicleManualData.colorCode ||
      vehicleManualData.colorType !== originalVehicleManualData.colorType
    );
    
    // Check if regular vehicle info has changed
    const hasRegularChanges = (
      vehicleInfo.makeId !== originalVehicleInfo.makeId ||
      vehicleInfo.modelId !== originalVehicleInfo.modelId ||
      vehicleInfo.variantId !== originalVehicleInfo.variantId ||
      vehicleInfo.colorId !== originalVehicleInfo.colorId ||
      vehicleInfo.licensePlate !== originalVehicleInfo.licensePlate
    );
    
    return hasManualChanges || hasManualDataChanged || hasRegularChanges;
  };

  const handleCreateNewCustomer = async () => {
    if (!newCustomerData.name || !newCustomerData.phone) {
      toast.error('Please fill in required fields (Name and Phone)');
      return;
    }

    try {
      let makeId = newCustomerData.vehicleMakeId;
      let modelId = newCustomerData.vehicleModelId;
      let variantId = newCustomerData.vehicleVariantId;
      let colorId = newCustomerData.vehicleColorId;

      // Handle manual make creation
      if (manualInputs.make && manualData.makeName) {
        const makeResult = await createMakeMutation.mutateAsync({
          name: manualData.makeName,
          country: manualData.makeCountry || undefined
        });
        makeId = makeResult.make.id;
      }

      // Handle manual model creation
      if (manualInputs.model && manualData.modelName && makeId) {
        const modelResult = await createModelMutation.mutateAsync({
          make_id: makeId,
          name: manualData.modelName,
          year_start: manualData.modelYearStart ? parseInt(manualData.modelYearStart) : undefined,
          year_end: manualData.modelYearEnd ? parseInt(manualData.modelYearEnd) : undefined,
          body_type: manualData.modelBodyType || undefined
        });
        modelId = modelResult.model.id;
      }

      // Handle manual variant creation
      if (manualInputs.variant && manualData.variantName && modelId) {
        const variantResult = await createVariantMutation.mutateAsync({
          model_id: modelId,
          name: manualData.variantName,
          variant_code: manualData.variantCode || undefined,
          engine_type: manualData.variantEngineType || undefined,
          engine_capacity: manualData.variantEngineCapacity || undefined,
          transmission: manualData.variantTransmission || undefined,
          fuel_type: manualData.variantFuelType || undefined
        });
        variantId = variantResult.variant.id;
      }

      // Handle manual color creation
      if (manualInputs.color && manualData.colorName && variantId) {
        const colorResult = await createColorMutation.mutateAsync({
          variant_id: variantId,
          name: manualData.colorName,
          color_code: manualData.colorCode || undefined,
          color_type: manualData.colorType || undefined
        });
        colorId = colorResult.color.id;
      }

      const customerData = {
        name: newCustomerData.name,
        phone: newCustomerData.phone,
        email: newCustomerData.email || undefined,
        address: newCustomerData.address || undefined,
        vehicles: [{
          makeId: makeId || undefined,
          modelId: modelId || undefined,
          variantId: variantId || undefined,
          colorId: colorId || undefined,
          licensePlate: newCustomerData.licensePlate || undefined,
          isPrimary: true
        }]
      };

      await createCustomerMutation.mutateAsync(customerData);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create vehicle entries');
    }
  };

  const onSubmit = async (data: CreateBillFormData) => {
    if (!selectedCustomer) {
      toast.error('Please select a customer');
      return;
    }

    try {
      // If we're adding a new vehicle, save it first
      if (selectedVehicleId === 'new' && (vehicleManualInputs.make || vehicleManualInputs.model || vehicleManualInputs.variant || vehicleManualInputs.color)) {
        let makeId = vehicleInfo.makeId;
        let modelId = vehicleInfo.modelId;
        let variantId = vehicleInfo.variantId;
        let colorId = vehicleInfo.colorId;

        // Handle manual make creation
        if (vehicleManualInputs.make && vehicleManualData.makeName) {
          const makeResult = await createMakeMutation.mutateAsync({
            name: vehicleManualData.makeName,
            country: vehicleManualData.makeCountry || undefined
          });
          makeId = makeResult.make.id;
        }

        // Handle manual model creation
        if (vehicleManualInputs.model && vehicleManualData.modelName && makeId) {
          const modelResult = await createModelMutation.mutateAsync({
            make_id: makeId,
            name: vehicleManualData.modelName,
            year_start: vehicleManualData.modelYearStart ? parseInt(vehicleManualData.modelYearStart) : undefined,
            year_end: vehicleManualData.modelYearEnd ? parseInt(vehicleManualData.modelYearEnd) : undefined,
            body_type: vehicleManualData.modelBodyType || undefined
          });
          modelId = modelResult.model.id;
        }

        // Handle manual variant creation
        if (vehicleManualInputs.variant && vehicleManualData.variantName && modelId) {
          const variantResult = await createVariantMutation.mutateAsync({
            model_id: modelId,
            name: vehicleManualData.variantName,
            variant_code: vehicleManualData.variantCode || undefined,
            engine_type: vehicleManualData.variantEngineType || undefined,
            engine_capacity: vehicleManualData.variantEngineCapacity || undefined,
            transmission: vehicleManualData.variantTransmission || undefined,
            fuel_type: vehicleManualData.variantFuelType || undefined
          });
          variantId = variantResult.variant.id;
        }

        // Handle manual color creation
        if (vehicleManualInputs.color && vehicleManualData.colorName && variantId) {
          const colorResult = await createColorMutation.mutateAsync({
            variant_id: variantId,
            name: vehicleManualData.colorName,
            color_code: vehicleManualData.colorCode || undefined,
            color_type: vehicleManualData.colorType || undefined
          });
          colorId = colorResult.color.id;
        }

        // Add the new vehicle to the customer
        await customersService.addCustomerVehicle(selectedCustomer.id, {
          makeId: makeId || undefined,
          modelId: modelId || undefined,
          variantId: variantId || undefined,
          colorId: colorId || undefined,
          licensePlate: vehicleInfo.licensePlate || undefined,
          isPrimary: false // New vehicles are not primary by default
        });

        // Refresh customer data to include the new vehicle
        queryClient.invalidateQueries('customers');
      }

      let effectiveVehicleId = selectedVehicleId && selectedVehicleId !== 'new' ? selectedVehicleId : undefined;
      const billData: CreateBillData = {
        customerId: selectedCustomer.id,
        technicianId: data.technicianId,
        vehicleId: effectiveVehicleId,
        serviceDate: new Date().toISOString(),
        spareParts: data.spareParts || [],
        services: data.services || [],
        discountAmount: data.discountAmount,
        taxRate: data.taxRate
      };

      createBillMutation.mutate(billData);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create vehicle entries');
    }
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
    if (sparePartId === 'add-new') {
      setSelectedSparePartRowIndex(index);
      setShowSparePartDialog(true);
      return;
    }
    
    const sparePart = spareParts?.spareParts.find(sp => sp.id === sparePartId);
    if (sparePart) {
      setValue(`spareParts.${index}.sparePartId`, sparePartId);
      setValue(`spareParts.${index}.description`, sparePart.description || '');
      setValue(`spareParts.${index}.unitPrice`, sparePart.price);
    }
  };

  const handleServiceChange = (index: number, serviceId: string) => {
    if (serviceId === 'add-new') {
      setSelectedServiceRowIndex(index);
      setShowServiceDialog(true);
      return;
    }
    const service = services?.services.find(s => s.id === serviceId);
    if (service) {
      setValue(`services.${index}.serviceId`, serviceId);
      setValue(`services.${index}.description`, service.description || '');
      setValue(`services.${index}.unitPrice`, service.price);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Create New Bill</h1>
            <p className="text-gray-600">Create a new bill for your customer</p>
          </div>
          <button
            onClick={() => navigate('/bills')}
            className="btn btn-secondary flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            Cancel
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Bill Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Selection */}
            <div className="card p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Customer Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer *
                  </label>
                  <select
                    className="input"
                    value={isCreatingNewCustomer ? 'new' : (selectedCustomer?.id || '')}
                    onChange={(e) => {
                      if (e.target.value === 'new') {
                        setIsCreatingNewCustomer(true);
                        setSelectedCustomer(null);
                      } else {
                        setIsCreatingNewCustomer(false);
                        const customer = customers?.customers.find(c => c.id === e.target.value);
                        setSelectedCustomer(customer);
                      }
                    }}
                    required
                  >
                    <option value="">Select Customer</option>
                    <option value="new">+ Create New Customer</option>
                    {customers?.customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name} - {customer.phone}
                      </option>
                    ))}
                  </select>
                  {selectedCustomer && !isCreatingNewCustomer && (
                    <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
                      <p className="text-sm text-green-800">
                        <strong>Selected:</strong> {selectedCustomer.name} - {selectedCustomer.phone}
                      </p>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Technician
                  </label>
                  <select
                    className="input"
                    {...register('technicianId')}
                  >
                    <option value="">Select Technician</option>
                    {technicians?.technicians.map((tech) => (
                      <option key={tech.id} value={tech.id}>
                        {tech.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* New Customer Form */}
            {isCreatingNewCustomer && (
              <div className="card p-6 border-2 border-primary-200 bg-primary-50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-primary-900">Create New Customer</h3>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingNewCustomer(false);
                      setNewCustomerData({
                        name: '',
                        phone: '',
                        email: '',
                        address: '',
                        vehicleMakeId: '',
                        vehicleModelId: '',
                        vehicleVariantId: '',
                        vehicleColorId: '',
                        licensePlate: ''
                      });
                    }}
                    className="text-primary-600 hover:text-primary-800"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Basic Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        name="name"
                        required
                        className="input"
                        placeholder="Enter customer's full name"
                        value={newCustomerData.name}
                        onChange={handleNewCustomerInputChange}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        required
                        className="input"
                        placeholder="Enter phone number"
                        value={newCustomerData.phone}
                        onChange={handleNewCustomerInputChange}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        name="email"
                        className="input"
                        placeholder="Enter email address (optional)"
                        value={newCustomerData.email}
                        onChange={handleNewCustomerInputChange}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Address
                      </label>
                      <input
                        type="text"
                        name="address"
                        className="input"
                        placeholder="Enter address (optional)"
                        value={newCustomerData.address}
                        onChange={handleNewCustomerInputChange}
                      />
                    </div>
                  </div>

                  {/* Vehicle Information */}
                  <div className="border-t pt-4">
                    <h4 className="text-md font-medium text-gray-900 mb-3">Vehicle Information (Optional)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Make Field */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-sm font-medium text-gray-700">
                            Make
                          </label>
                          <label className="flex items-center gap-2 text-sm text-gray-600">
                            <input
                              type="checkbox"
                              checked={manualInputs.make}
                              onChange={() => toggleManualInput('make')}
                              className="rounded border-gray-300"
                            />
                            Manual Entry
                          </label>
                        </div>
                        {manualInputs.make ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              name="makeName"
                              className="input"
                              placeholder="Enter make name"
                              value={manualData.makeName}
                              onChange={handleManualInputChange}
                            />
                            <input
                              type="text"
                              name="makeCountry"
                              className="input"
                              placeholder="Country (optional)"
                              value={manualData.makeCountry}
                              onChange={handleManualInputChange}
                            />
                          </div>
                        ) : (
                          <select
                            name="vehicleMakeId"
                            className="input"
                            value={newCustomerData.vehicleMakeId}
                            onChange={(e) => {
                              setNewCustomerData(prev => ({
                                ...prev,
                                vehicleMakeId: e.target.value,
                                vehicleModelId: '',
                                vehicleVariantId: '',
                                vehicleColorId: ''
                              }));
                            }}
                          >
                            <option value="">Select Make</option>
                            {vehicleMakes?.makes.map((make) => (
                              <option key={make.id} value={make.id}>
                                {make.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      {/* Model Field */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-sm font-medium text-gray-700">
                            Model
                          </label>
                          <label className="flex items-center gap-2 text-sm text-gray-600">
                            <input
                              type="checkbox"
                              checked={manualInputs.model}
                              onChange={() => toggleManualInput('model')}
                              className="rounded border-gray-300"
                            />
                            Manual Entry
                          </label>
                        </div>
                        {manualInputs.model ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              name="modelName"
                              className="input"
                              placeholder="Enter model name"
                              value={manualData.modelName}
                              onChange={handleManualInputChange}
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="number"
                                name="modelYearStart"
                                className="input"
                                placeholder="Start Year"
                                value={manualData.modelYearStart}
                                onChange={handleManualInputChange}
                              />
                              <input
                                type="number"
                                name="modelYearEnd"
                                className="input"
                                placeholder="End Year"
                                value={manualData.modelYearEnd}
                                onChange={handleManualInputChange}
                              />
                            </div>
                            <select
                              name="modelBodyType"
                              className="input"
                              value={manualData.modelBodyType}
                              onChange={handleManualInputChange}
                            >
                              <option value="">Body Type (optional)</option>
                              <option value="sedan">Sedan</option>
                              <option value="hatchback">Hatchback</option>
                              <option value="suv">SUV</option>
                              <option value="coupe">Coupe</option>
                              <option value="convertible">Convertible</option>
                              <option value="wagon">Wagon</option>
                              <option value="pickup">Pickup</option>
                            </select>
                          </div>
                        ) : (
                          <select
                            name="vehicleModelId"
                            className="input"
                            value={newCustomerData.vehicleModelId}
                            onChange={(e) => {
                              setNewCustomerData(prev => ({
                                ...prev,
                                vehicleModelId: e.target.value,
                                vehicleVariantId: '',
                                vehicleColorId: ''
                              }));
                            }}
                            disabled={!newCustomerData.vehicleMakeId}
                          >
                            <option value="">Select Model</option>
                            {vehicleModels?.models.map((model) => (
                              <option key={model.id} value={model.id}>
                                {model.name} {model.year_start && model.year_end ? `(${model.year_start}-${model.year_end})` : ''}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      {/* Variant Field */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-sm font-medium text-gray-700">
                            Variant
                          </label>
                          <label className="flex items-center gap-2 text-sm text-gray-600">
                            <input
                              type="checkbox"
                              checked={manualInputs.variant}
                              onChange={() => toggleManualInput('variant')}
                              className="rounded border-gray-300"
                            />
                            Manual Entry
                          </label>
                        </div>
                        {manualInputs.variant ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              name="variantName"
                              className="input"
                              placeholder="Enter variant name"
                              value={manualData.variantName}
                              onChange={handleManualInputChange}
                            />
                            <input
                              type="text"
                              name="variantCode"
                              className="input"
                              placeholder="Variant Code (optional)"
                              value={manualData.variantCode}
                              onChange={handleManualInputChange}
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <select
                                name="variantEngineType"
                                className="input"
                                value={manualData.variantEngineType}
                                onChange={handleManualInputChange}
                              >
                                <option value="">Select Engine Type</option>
                                {Object.entries(getEngineTypesByCategory()).map(([category, options]) => (
                                  <optgroup key={category} label={category}>
                                    {options.map((opt) => (
                                      <option key={opt.value} value={opt.label}>
                                        {opt.label}
                                      </option>
                                    ))}
                                  </optgroup>
                                ))}
                              </select>
                              <input
                                type="text"
                                name="variantEngineCapacity"
                                className="input"
                                placeholder="Engine Capacity"
                                value={manualData.variantEngineCapacity}
                                onChange={handleManualInputChange}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <select
                                name="variantTransmission"
                                className="input"
                                value={manualData.variantTransmission}
                                onChange={handleManualInputChange}
                              >
                                <option value="">Select Transmission</option>
                                {TRANSMISSION_TYPES.map((trans) => (
                                  <option key={trans.value} value={trans.label}>
                                    {trans.label}
                                  </option>
                                ))}
                              </select>
                              <select
                                name="variantFuelType"
                                className="input"
                                value={manualData.variantFuelType}
                                onChange={handleManualInputChange}
                              >
                                <option value="">Select Fuel Type</option>
                                {FUEL_TYPES.map((fuel) => (
                                  <option key={fuel.value} value={fuel.label}>
                                    {fuel.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        ) : (
                          <select
                            name="vehicleVariantId"
                            className="input"
                            value={newCustomerData.vehicleVariantId}
                            onChange={(e) => {
                              setNewCustomerData(prev => ({
                                ...prev,
                                vehicleVariantId: e.target.value,
                                vehicleColorId: ''
                              }));
                            }}
                            disabled={!newCustomerData.vehicleModelId}
                          >
                            <option value="">Select Variant</option>
                            {vehicleVariants?.variants.map((variant) => (
                              <option key={variant.id} value={variant.id}>
                                {variant.name} {variant.engine_capacity && `(${variant.engine_capacity} ${variant.transmission})`} {variant.ecm && `- ECM: ${variant.ecm}`}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      {/* Color Field */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-sm font-medium text-gray-700">
                            Color
                          </label>
                          <label className="flex items-center gap-2 text-sm text-gray-600">
                            <input
                              type="checkbox"
                              checked={manualInputs.color}
                              onChange={() => toggleManualInput('color')}
                              className="rounded border-gray-300"
                            />
                            Manual Entry
                          </label>
                        </div>
                        {manualInputs.color ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              name="colorName"
                              className="input"
                              placeholder="Enter color name"
                              value={manualData.colorName}
                              onChange={handleManualInputChange}
                            />
                            <input
                              type="text"
                              name="colorCode"
                              className="input"
                              placeholder="Color Code (e.g., #FF0000)"
                              value={manualData.colorCode}
                              onChange={handleManualInputChange}
                            />
                            <select
                              name="colorType"
                              className="input"
                              value={manualData.colorType}
                              onChange={handleManualInputChange}
                            >
                              <option value="">Color Type (optional)</option>
                              <option value="solid">Solid</option>
                              <option value="metallic">Metallic</option>
                              <option value="pearl">Pearl</option>
                            </select>
                          </div>
                        ) : (
                          <select
                            name="vehicleColorId"
                            className="input"
                            value={newCustomerData.vehicleColorId}
                            onChange={(e) => {
                              setNewCustomerData(prev => ({
                                ...prev,
                                vehicleColorId: e.target.value
                              }));
                            }}
                            disabled={!newCustomerData.vehicleVariantId}
                          >
                            <option value="">Select Color</option>
                            {vehicleColors?.colors.map((color) => (
                              <option key={color.id} value={color.id}>
                                {color.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          License Plate
                        </label>
                        <input
                          type="text"
                          name="licensePlate"
                          className="input"
                          placeholder="e.g., KA01AB1234"
                          value={newCustomerData.licensePlate}
                          onChange={handleNewCustomerInputChange}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Create Customer Button */}
                  <div className="flex justify-end pt-4">
                    <button
                      type="button"
                      onClick={handleCreateNewCustomer}
                      disabled={createCustomerMutation.isLoading}
                      className="btn btn-primary flex items-center gap-2"
                    >
                      {createCustomerMutation.isLoading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4" />
                          Create Customer
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Vehicle Information */}
            {selectedCustomer && <div className="card p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Vehicle Information</h3>

              {/* Vehicle Selection */}
              {selectedCustomer && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Vehicle
                  </label>
                  <select
                    className="input"
                    value={selectedVehicleId}
                    onChange={(e) => {
                      const vehicleId = e.target.value;
                      if (vehicleId === 'new') {
                        // Set to new vehicle mode
                        setSelectedVehicleId('new');
                        setVehicleInfo({
                          makeId: '',
                          modelId: '',
                          variantId: '',
                          colorId: '',
                          licensePlate: ''
                        });
                        // Don't enable manual inputs by default - let user choose
                        setVehicleManualInputs({
                          make: false,
                          model: false,
                          variant: false,
                          color: false
                        });
                      } else {
                        setSelectedVehicleId(vehicleId);
                        const selectedVehicle = selectedCustomer.vehicles?.find((v: any) => v.id === vehicleId);
                        if (selectedVehicle) {
                          const vehicleData = {
                            makeId: selectedVehicle.makeId || '',
                            modelId: selectedVehicle.modelId || '',
                            variantId: selectedVehicle.variantId || '',
                            colorId: selectedVehicle.colorId || '',
                            licensePlate: selectedVehicle.licensePlate || ''
                          };
                          setVehicleInfo(vehicleData);
                          setOriginalVehicleInfo(vehicleData);
                          // Reset manual inputs when selecting existing vehicle
                          setVehicleManualInputs({
                            make: false,
                            model: false,
                            variant: false,
                            color: false
                          });
                          // Reset manual data
                          const emptyManualData = {
                            makeName: '',
                            makeCountry: '',
                            modelName: '',
                            modelYearStart: '',
                            modelYearEnd: '',
                            modelBodyType: '',
                            variantName: '',
                            variantCode: '',
                            variantEngineType: '',
                            variantEngineCapacity: '',
                            variantTransmission: '',
                            variantFuelType: '',
                            colorName: '',
                            colorCode: '',
                            colorType: ''
                          };
                          setVehicleManualData(emptyManualData);
                          setOriginalVehicleManualData(emptyManualData);
                        }
                      }
                    }}
                  >
                    <option value="">Select Vehicle</option>
                    <option value="new">+ Add New Vehicle</option>
                    {selectedCustomer.vehicles && selectedCustomer.vehicles.map((vehicle: any) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.makeName} {vehicle.modelName} {vehicle.variantName} - {vehicle.licensePlate || 'No License Plate'}
                        {vehicle.isPrimary ? ' (Primary)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

               {/* New Vehicle Mode Indicator */}
               {selectedVehicleId === 'new' && (
                 <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                   <div className="flex items-center justify-between">
                     <p className="text-sm text-blue-800">
                       <strong>Adding New Vehicle:</strong> Select from existing options or toggle "Manual Entry" to add new vehicle details. This vehicle will be added to the customer's profile.
                     </p>
                     <button
                       type="button"
                       onClick={async () => {
                         try {
                           // Check if we have any vehicle data to save
                           if (vehicleInfo.licensePlate || vehicleInfo.makeId || vehicleInfo.modelId || vehicleInfo.variantId || vehicleInfo.colorId) {
                             let makeId = vehicleInfo.makeId;
                             let modelId = vehicleInfo.modelId;
                             let variantId = vehicleInfo.variantId;
                             let colorId = vehicleInfo.colorId;

                             // Handle manual make creation
                             if (vehicleManualInputs.make && vehicleManualData.makeName) {
                               const makeResult = await createMakeMutation.mutateAsync({
                                 name: vehicleManualData.makeName,
                                 country: vehicleManualData.makeCountry || undefined
                               });
                               makeId = makeResult.make.id;
                             }

                             // Handle manual model creation
                             if (vehicleManualInputs.model && vehicleManualData.modelName && makeId) {
                               const modelResult = await createModelMutation.mutateAsync({
                                 make_id: makeId,
                                 name: vehicleManualData.modelName,
                                 year_start: vehicleManualData.modelYearStart ? parseInt(vehicleManualData.modelYearStart) : undefined,
                                 year_end: vehicleManualData.modelYearEnd ? parseInt(vehicleManualData.modelYearEnd) : undefined,
                                 body_type: vehicleManualData.modelBodyType || undefined
                               });
                               modelId = modelResult.model.id;
                             }

                             // Handle manual variant creation
                             if (vehicleManualInputs.variant && vehicleManualData.variantName && modelId) {
                               const variantResult = await createVariantMutation.mutateAsync({
                                 model_id: modelId,
                                 name: vehicleManualData.variantName,
                                 variant_code: vehicleManualData.variantCode || undefined,
                                 engine_type: vehicleManualData.variantEngineType || undefined,
                                 engine_capacity: vehicleManualData.variantEngineCapacity || undefined,
                                 transmission: vehicleManualData.variantTransmission || undefined,
                                 fuel_type: vehicleManualData.variantFuelType || undefined
                               });
                               variantId = variantResult.variant.id;
                             }

                             // Handle manual color creation
                             if (vehicleManualInputs.color && vehicleManualData.colorName && variantId) {
                               const colorResult = await createColorMutation.mutateAsync({
                                 variant_id: variantId,
                                 name: vehicleManualData.colorName,
                                 color_code: vehicleManualData.colorCode || undefined,
                                 color_type: vehicleManualData.colorType || undefined
                               });
                               colorId = colorResult.color.id;
                             }

                             // Add the new vehicle to the customer
                             await customersService.addCustomerVehicle(selectedCustomer.id, {
                               makeId: makeId || undefined,
                               modelId: modelId || undefined,
                               variantId: variantId || undefined,
                               colorId: colorId || undefined,
                               licensePlate: vehicleInfo.licensePlate || undefined,
                               isPrimary: false
                             });

                             // Refresh customer data to include the new vehicle
                             queryClient.invalidateQueries('customers');
                             
                             // Reset form
                             setVehicleInfo({
                               makeId: '',
                               modelId: '',
                               variantId: '',
                               colorId: '',
                               licensePlate: ''
                             });
                             setVehicleManualData({
                               makeName: '',
                               makeCountry: '',
                               modelName: '',
                               modelYearStart: '',
                               modelYearEnd: '',
                               modelBodyType: '',
                               variantName: '',
                               variantCode: '',
                               variantEngineType: '',
                               variantEngineCapacity: '',
                               variantTransmission: '',
                               variantFuelType: '',
                               colorName: '',
                               colorCode: '',
                               colorType: ''
                             });
                             setVehicleManualInputs({
                               make: false,
                               model: false,
                               variant: false,
                               color: false
                             });
                             setSelectedVehicleId('');

                             toast.success('Vehicle added successfully!');
                           } else {
                             toast.error('Please enter at least a license plate or vehicle details');
                           }
                         } catch (error: any) {
                           toast.error(error.response?.data?.message || 'Failed to add vehicle');
                         }
                       }}
                       className="btn btn-primary text-sm px-3 py-1"
                     >
                       Save Vehicle
                     </button>
                   </div>
                 </div>
               )}

               {/* Update Vehicle Mode Indicator */}
               {selectedVehicleId && selectedVehicleId !== 'new' && hasVehicleChanged() && (
                 <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                   <div className="flex items-center justify-between">
                     <p className="text-sm text-yellow-800">
                       <strong>Vehicle Modified:</strong> Changes detected in vehicle information. Click "Update Vehicle" to save changes.
                     </p>
                     <button
                       type="button"
                       onClick={async () => {
                         try {
                           let makeId = vehicleInfo.makeId;
                           let modelId = vehicleInfo.modelId;
                           let variantId = vehicleInfo.variantId;
                           let colorId = vehicleInfo.colorId;

                           // Handle manual make creation
                           if (vehicleManualInputs.make && vehicleManualData.makeName) {
                             const makeResult = await createMakeMutation.mutateAsync({
                               name: vehicleManualData.makeName,
                               country: vehicleManualData.makeCountry || undefined
                             });
                             makeId = makeResult.make.id;
                           }

                           // Handle manual model creation
                           if (vehicleManualInputs.model && vehicleManualData.modelName && makeId) {
                             const modelResult = await createModelMutation.mutateAsync({
                               make_id: makeId,
                               name: vehicleManualData.modelName,
                               year_start: vehicleManualData.modelYearStart ? parseInt(vehicleManualData.modelYearStart) : undefined,
                               year_end: vehicleManualData.modelYearEnd ? parseInt(vehicleManualData.modelYearEnd) : undefined,
                               body_type: vehicleManualData.modelBodyType || undefined
                             });
                             modelId = modelResult.model.id;
                           }

                           // Handle manual variant creation
                           if (vehicleManualInputs.variant && vehicleManualData.variantName && modelId) {
                             const variantResult = await createVariantMutation.mutateAsync({
                               model_id: modelId,
                               name: vehicleManualData.variantName,
                               variant_code: vehicleManualData.variantCode || undefined,
                               engine_type: vehicleManualData.variantEngineType || undefined,
                               engine_capacity: vehicleManualData.variantEngineCapacity || undefined,
                               transmission: vehicleManualData.variantTransmission || undefined,
                               fuel_type: vehicleManualData.variantFuelType || undefined
                             });
                             variantId = variantResult.variant.id;
                           }

                           // Handle manual color creation
                           if (vehicleManualInputs.color && vehicleManualData.colorName && variantId) {
                             const colorResult = await createColorMutation.mutateAsync({
                               variant_id: variantId,
                               name: vehicleManualData.colorName,
                               color_code: vehicleManualData.colorCode || undefined,
                               color_type: vehicleManualData.colorType || undefined
                             });
                             colorId = colorResult.color.id;
                           }

                           // Update the existing vehicle
                           await customersService.updateCustomerVehicle(selectedCustomer.id, selectedVehicleId, {
                             makeId: makeId || undefined,
                             modelId: modelId || undefined,
                             variantId: variantId || undefined,
                             colorId: colorId || undefined,
                             licensePlate: vehicleInfo.licensePlate || undefined
                           });

                           // Refresh customer data
                           queryClient.invalidateQueries('customers');
                           
                           // Update original values to reflect the changes
                           setOriginalVehicleInfo({
                             makeId: makeId || '',
                             modelId: modelId || '',
                             variantId: variantId || '',
                             colorId: colorId || '',
                             licensePlate: vehicleInfo.licensePlate || ''
                           });

                           // Reset manual inputs and data
                           const emptyManualData = {
                             makeName: '',
                             makeCountry: '',
                             modelName: '',
                             modelYearStart: '',
                             modelYearEnd: '',
                             modelBodyType: '',
                             variantName: '',
                             variantCode: '',
                             variantEngineType: '',
                             variantEngineCapacity: '',
                             variantTransmission: '',
                             variantFuelType: '',
                             colorName: '',
                             colorCode: '',
                             colorType: ''
                           };
                           setVehicleManualData(emptyManualData);
                           setOriginalVehicleManualData(emptyManualData);
                           setVehicleManualInputs({
                             make: false,
                             model: false,
                             variant: false,
                             color: false
                           });

                           toast.success('Vehicle updated successfully!');
                         } catch (error: any) {
                           toast.error(error.response?.data?.message || 'Failed to update vehicle');
                         }
                       }}
                       className="btn btn-warning text-sm px-3 py-1"
                     >
                       Update Vehicle
                     </button>
                   </div>
                 </div>
               )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Make Field */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Make
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-600">
                      <input
                        type="checkbox"
                        checked={vehicleManualInputs.make}
                        onChange={() => toggleVehicleManualInput('make')}
                        className="rounded border-gray-300"
                      />
                      Manual Entry
                    </label>
                  </div>
                  {vehicleManualInputs.make ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        name="makeName"
                        className="input"
                        placeholder="Enter make name"
                        value={vehicleManualData.makeName}
                        onChange={handleVehicleManualInputChange}
                      />
                      <input
                        type="text"
                        name="makeCountry"
                        className="input"
                        placeholder="Country (optional)"
                        value={vehicleManualData.makeCountry}
                        onChange={handleVehicleManualInputChange}
                      />
                    </div>
                  ) : (
                    <select
                      name="makeId"
                      className="input"
                      value={vehicleInfo.makeId}
                      onChange={(e) => {
                        setVehicleInfo(prev => ({
                          ...prev,
                          makeId: e.target.value,
                          modelId: '',
                          variantId: '',
                          colorId: ''
                        }));
                      }}
                    >
                      <option value="">Select Make</option>
                      {vehicleMakes?.makes.map((make) => (
                        <option key={make.id} value={make.id}>
                          {make.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Model Field */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Model
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-600">
                      <input
                        type="checkbox"
                        checked={vehicleManualInputs.model}
                        onChange={() => toggleVehicleManualInput('model')}
                        className="rounded border-gray-300"
                      />
                      Manual Entry
                    </label>
                  </div>
                  {vehicleManualInputs.model ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        name="modelName"
                        className="input"
                        placeholder="Enter model name"
                        value={vehicleManualData.modelName}
                        onChange={handleVehicleManualInputChange}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          name="modelYearStart"
                          className="input"
                          placeholder="Start Year"
                          value={vehicleManualData.modelYearStart}
                          onChange={handleVehicleManualInputChange}
                        />
                        <input
                          type="number"
                          name="modelYearEnd"
                          className="input"
                          placeholder="End Year"
                          value={vehicleManualData.modelYearEnd}
                          onChange={handleVehicleManualInputChange}
                        />
                      </div>
                      <select
                        name="modelBodyType"
                        className="input"
                        value={vehicleManualData.modelBodyType}
                        onChange={handleVehicleManualInputChange}
                      >
                        <option value="">Body Type (optional)</option>
                        <option value="sedan">Sedan</option>
                        <option value="hatchback">Hatchback</option>
                        <option value="suv">SUV</option>
                        <option value="coupe">Coupe</option>
                        <option value="convertible">Convertible</option>
                        <option value="wagon">Wagon</option>
                        <option value="pickup">Pickup</option>
                      </select>
                    </div>
                  ) : (
                    <select
                      name="modelId"
                      className="input"
                      value={vehicleInfo.modelId}
                      onChange={(e) => {
                        setVehicleInfo(prev => ({
                          ...prev,
                          modelId: e.target.value,
                          variantId: '',
                          colorId: ''
                        }));
                      }}
                      disabled={!vehicleInfo.makeId}
                    >
                      <option value="">Select Model</option>
                      {mainVehicleModels?.models.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.name} {model.year_start && model.year_end ? `(${model.year_start}-${model.year_end})` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Variant Field */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Variant
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-600">
                      <input
                        type="checkbox"
                        checked={vehicleManualInputs.variant}
                        onChange={() => toggleVehicleManualInput('variant')}
                        className="rounded border-gray-300"
                      />
                      Manual Entry
                    </label>
                  </div>
                  {vehicleManualInputs.variant ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        name="variantName"
                        className="input"
                        placeholder="Enter variant name"
                        value={vehicleManualData.variantName}
                        onChange={handleVehicleManualInputChange}
                      />
                      <input
                        type="text"
                        name="variantCode"
                        className="input"
                        placeholder="Variant Code (optional)"
                        value={vehicleManualData.variantCode}
                        onChange={handleVehicleManualInputChange}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          name="variantEngineType"
                          className="input"
                          value={vehicleManualData.variantEngineType}
                          onChange={handleVehicleManualInputChange}
                        >
                          <option value="">Select Engine Type</option>
                          {Object.entries(getEngineTypesByCategory()).map(([category, options]) => (
                            <optgroup key={category} label={category}>
                              {options.map((opt) => (
                                <option key={opt.value} value={opt.label}>
                                  {opt.label}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                        <input
                          type="text"
                          name="variantEngineCapacity"
                          className="input"
                          placeholder="Engine Capacity"
                          value={vehicleManualData.variantEngineCapacity}
                          onChange={handleVehicleManualInputChange}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          name="variantTransmission"
                          className="input"
                          value={vehicleManualData.variantTransmission}
                          onChange={handleVehicleManualInputChange}
                        >
                          <option value="">Select Transmission</option>
                          {TRANSMISSION_TYPES.map((trans) => (
                            <option key={trans.value} value={trans.label}>
                              {trans.label}
                            </option>
                          ))}
                        </select>
                        <select
                          name="variantFuelType"
                          className="input"
                          value={vehicleManualData.variantFuelType}
                          onChange={handleVehicleManualInputChange}
                        >
                          <option value="">Select Fuel Type</option>
                          {FUEL_TYPES.map((fuel) => (
                            <option key={fuel.value} value={fuel.label}>
                              {fuel.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ) : (
                    <select
                      name="variantId"
                      className="input"
                      value={vehicleInfo.variantId}
                      onChange={(e) => {
                        setVehicleInfo(prev => ({
                          ...prev,
                          variantId: e.target.value,
                          colorId: ''
                        }));
                      }}
                      disabled={!vehicleInfo.modelId}
                    >
                      <option value="">Select Variant</option>
                      {mainVehicleVariants?.variants.map((variant) => (
                        <option key={variant.id} value={variant.id}>
                          {variant.name} {variant.engine_capacity && `(${variant.engine_capacity} ${variant.transmission})`} {variant.ecm && `- ECM: ${variant.ecm}`}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Color Field */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Color
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-600">
                      <input
                        type="checkbox"
                        checked={vehicleManualInputs.color}
                        onChange={() => toggleVehicleManualInput('color')}
                        className="rounded border-gray-300"
                      />
                      Manual Entry
                    </label>
                  </div>
                  {vehicleManualInputs.color ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        name="colorName"
                        className="input"
                        placeholder="Enter color name"
                        value={vehicleManualData.colorName}
                        onChange={handleVehicleManualInputChange}
                      />
                      <input
                        type="text"
                        name="colorCode"
                        className="input"
                        placeholder="Color Code (e.g., #FF0000)"
                        value={vehicleManualData.colorCode}
                        onChange={handleVehicleManualInputChange}
                      />
                      <select
                        name="colorType"
                        className="input"
                        value={vehicleManualData.colorType}
                        onChange={handleVehicleManualInputChange}
                      >
                        <option value="">Color Type (optional)</option>
                        <option value="solid">Solid</option>
                        <option value="metallic">Metallic</option>
                        <option value="pearl">Pearl</option>
                      </select>
                    </div>
                  ) : (
                    <select
                      name="colorId"
                      className="input"
                      value={vehicleInfo.colorId}
                      onChange={(e) => {
                        setVehicleInfo(prev => ({
                          ...prev,
                          colorId: e.target.value
                        }));
                      }}
                      disabled={!vehicleInfo.variantId}
                    >
                      <option value="">Select Color</option>
                      {mainVehicleColors?.colors.map((color) => (
                        <option key={color.id} value={color.id}>
                          {color.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    License Plate
                  </label>
                  <input
                    type="text"
                    name="licensePlate"
                    className="input"
                    placeholder="e.g., KA01AB1234"
                    value={vehicleInfo.licensePlate}
                    onChange={handleVehicleInputChange}
                  />
                </div>
              </div>
            </div>}

            {/* Spare Parts Section */}
            {selectedCustomer && <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Spare Parts</h3>
                <button
                  type="button"
                  onClick={addSparePart}
                  className="btn btn-primary flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Spare Part
                </button>
              </div>

              <div className="space-y-4">
                {sparePartFields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 border border-gray-200 rounded-lg">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Spare Part
                      </label>
                      <select
                        className="input"
                        onChange={(e) => handleSparePartChange(index, e.target.value)}
                      >
                        <option value="">Select Spare Part</option>
                        <option value="add-new">+ Add Spare Part</option>
                        {spareParts?.spareParts.map((part) => (
                          <option key={part.id} value={part.id}>
                            {part.name} - ₹{part.price} ({part.unit || 'pieces'})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quantity {spareParts?.spareParts.find((part: any) => part.id === watch(`spareParts.${index}.sparePartId`))?.unit ? `(${spareParts?.spareParts.find((part: any) => part.id === watch(`spareParts.${index}.sparePartId`))?.unit})` : ''}
                      </label>
                      <input
                        type="number"
                        className="input"
                        {...register(`spareParts.${index}.quantity`, { valueAsNumber: true, min: 0.001 })}
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
                        className="input"
                        {...register(`spareParts.${index}.unitPrice`, { valueAsNumber: true, min: 0 })}
                        step="0.01"
                        min="0"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => removeSparePart(index)}
                        className="btn btn-danger"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="md:col-span-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                        Part Description / Notes
                      </label>
                      <input
                        type="text"
                        className="input"
                        {...register(`spareParts.${index}.description`)}
                        placeholder="Spare part description or specs"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>}

            {/* Services Section */}
            {selectedCustomer && <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100">Services</h3>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedServiceRowIndex(null);
                      setShowServiceDialog(true);
                    }}
                    className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium flex items-center gap-1 hover:underline"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    New Service
                  </button>
                </div>
                <button
                  type="button"
                  onClick={addService}
                  className="btn btn-primary flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Service
                </button>
              </div>

              <div className="space-y-4">
                {serviceFields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 border border-gray-200 dark:border-slate-800 rounded-lg">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                        Labor / Service Name
                      </label>
                      <select
                        className="input"
                        value={watchedServices[index]?.serviceId || ''}
                        onChange={(e) => handleServiceChange(index, e.target.value)}
                      >
                        <option value="">Select Service</option>
                        <option value="add-new" className="font-semibold text-primary-600 dark:text-primary-400">
                          + Add New Service...
                        </option>
                        {services?.services.map((service) => (
                          <option key={service.id} value={service.id}>
                            {service.name} - ₹{service.price} ({service.duration || 60}m)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                        Labor Hours / Qty
                      </label>
                      <input
                        type="number"
                        className="input"
                        {...register(`services.${index}.quantity`, { valueAsNumber: true, min: 0.1 })}
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
                        className="input"
                        {...register(`services.${index}.unitPrice`, { valueAsNumber: true, min: 0 })}
                        step="0.01"
                        min="0"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => removeService(index)}
                        className="btn btn-danger"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="md:col-span-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                        Labor Scope / Notes
                      </label>
                      <input
                        type="text"
                        className="input"
                        {...register(`services.${index}.description`)}
                        placeholder="Scope of work / technician notes"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>}
          </div>

          {/* Bill Summary */}
          <div className="space-y-6">
            <div className="card p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Bill Summary</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Discount Amount
                  </label>
                  <input
                    type="number"
                    className="input"
                    {...register('discountAmount', { valueAsNumber: true, min: 0 })}
                    step="0.01"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    className="input"
                    {...register('taxRate', { valueAsNumber: true, min: 0, max: 100 })}
                    min="0"
                    max="100"
                  />
                </div>
              </div>
            </div>

            <div className="card p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Total</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Spare Parts Subtotal:</span>
                  <span>₹{sparePartsSubtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Services Subtotal:</span>
                  <span>₹{servicesSubtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-gray-600 font-medium">Subtotal:</span>
                  <span className="font-medium">₹{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Discount:</span>
                  <span>-₹{watchedDiscount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax ({watchedTaxRate}%):</span>
                  <span>₹{taxAmount.toLocaleString()}</span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total:</span>
                    <span>₹{totalAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={createBillMutation.isLoading}
              className="btn btn-primary w-full flex items-center justify-center gap-2"
            >
              {createBillMutation.isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Create Bill
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Add Spare Part Dialog */}
      {showSparePartDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="card max-w-2xl w-full p-6 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-2xl rounded-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-gray-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-50 dark:bg-primary-950/40 rounded-lg text-primary-600 dark:text-primary-400">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">Add New Spare Part</h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400">Create an inventory item and insert into this bill</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseSparePartDialog}
                className="text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              const selectedCategory = isAddingNewCategory ? newCategoryInput.trim() : newSparePartData.category;
              if (!selectedCategory) {
                toast.error('Please select or enter a category');
                return;
              }
              createSparePartMutation.mutate({
                ...newSparePartData,
                category: selectedCategory,
                price: parseFloat(newSparePartData.price),
                cost: parseFloat(newSparePartData.cost),
                stock: parseInt(newSparePartData.stock),
                minStock: parseInt(newSparePartData.minStock)
              });
            }} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={newSparePartData.name}
                    onChange={(e) => setNewSparePartData(prev => ({ ...prev, name: e.target.value }))}
                    className="input"
                    placeholder="e.g. Engine Oil 5W-30"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Part Number
                  </label>
                  <input
                    type="text"
                    value={newSparePartData.partNumber}
                    onChange={(e) => setNewSparePartData(prev => ({ ...prev, partNumber: e.target.value }))}
                    className="input"
                    placeholder="e.g. SP-EO-001"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newSparePartData.description}
                    onChange={(e) => setNewSparePartData(prev => ({ ...prev, description: e.target.value }))}
                    className="input"
                    rows={3}
                    placeholder="Spare part specifications or details..."
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                      Category *
                    </label>
                    {!isAddingNewCategory ? (
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingNewCategory(true);
                          setNewCategoryInput('');
                        }}
                        className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium flex items-center gap-1 hover:underline"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add New
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingNewCategory(false);
                          setNewCategoryInput('');
                        }}
                        className="text-xs text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
                      >
                        Select Existing
                      </button>
                    )}
                  </div>

                  {!isAddingNewCategory ? (
                    <select
                      value={newSparePartData.category}
                      onChange={(e) => {
                        if (e.target.value === '__ADD_NEW__') {
                          setIsAddingNewCategory(true);
                          setNewCategoryInput('');
                        } else {
                          setNewSparePartData(prev => ({ ...prev, category: e.target.value }));
                        }
                      }}
                      className="input"
                      required
                    >
                      <option value="">Select Category</option>
                      <option value="__ADD_NEW__" className="font-semibold text-primary-600 dark:text-primary-400">
                        + Add Custom Category...
                      </option>
                      <optgroup label="Available Categories">
                        {mergedCategories.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </optgroup>
                    </select>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newCategoryInput}
                        onChange={(e) => setNewCategoryInput(e.target.value)}
                        placeholder="e.g. Turbo & Superchargers"
                        className="input flex-1"
                        autoFocus
                        required
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (newCategoryInput.trim()) {
                              addCategoryMutation.mutate(newCategoryInput.trim());
                            }
                          }
                        }}
                      />
                      <button
                        type="button"
                        disabled={!newCategoryInput.trim() || addCategoryMutation.isLoading}
                        onClick={() => {
                          if (newCategoryInput.trim()) {
                            addCategoryMutation.mutate(newCategoryInput.trim());
                          }
                        }}
                        className="btn btn-primary text-xs px-3 whitespace-nowrap"
                        title="Save Category to system"
                      >
                        {addCategoryMutation.isLoading ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Supplier
                  </label>
                  <input
                    type="text"
                    value={newSparePartData.supplier}
                    onChange={(e) => setNewSparePartData(prev => ({ ...prev, supplier: e.target.value }))}
                    className="input"
                    placeholder="e.g. Bosch, Shell, Mobil"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Price (₹) *
                  </label>
                  <input
                    type="number"
                    value={newSparePartData.price}
                    onChange={(e) => setNewSparePartData(prev => ({ ...prev, price: e.target.value }))}
                    className="input"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Cost (₹) *
                  </label>
                  <input
                    type="number"
                    value={newSparePartData.cost}
                    onChange={(e) => setNewSparePartData(prev => ({ ...prev, cost: e.target.value }))}
                    className="input"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Stock *
                  </label>
                  <input
                    type="number"
                    value={newSparePartData.stock}
                    onChange={(e) => setNewSparePartData(prev => ({ ...prev, stock: e.target.value }))}
                    className="input"
                    min="0"
                    placeholder="0"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Min Stock *
                  </label>
                  <input
                    type="number"
                    value={newSparePartData.minStock}
                    onChange={(e) => setNewSparePartData(prev => ({ ...prev, minStock: e.target.value }))}
                    className="input"
                    min="0"
                    placeholder="0"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={handleCloseSparePartDialog}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSparePartMutation.isLoading}
                  className="btn btn-primary flex items-center gap-2"
                >
                  {createSparePartMutation.isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>Create Spare Part</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Service Dialog */}
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

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-slate-700">
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
                  {createServiceMutation.isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>Create Service</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateBill;
