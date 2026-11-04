import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { sparePartsService } from '../services/spareParts';
import { ArrowLeft, Save, Plus, Car, Wrench, ShieldCheck, Info } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { DEFAULT_SPARE_PART_CATEGORIES } from '../constants/sparePartOptions';
import {
  POPULAR_VEHICLE_MAKES,
  FUEL_TYPES,
  PART_TYPES,
  POPULAR_PART_BRANDS
} from '../constants/vehicleCompatibility';

const CreateSparePart: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');

  // Custom Make / Model text toggle
  const [isCustomMake, setIsCustomMake] = useState(false);
  const [isCustomModel, setIsCustomModel] = useState(false);
  const [isCustomGeneration, setIsCustomGeneration] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    partNumber: '',
    oemPartNumber: '',
    description: '',
    category: '',
    make: 'Maruti Suzuki',
    model: 'Swift',
    generation: '3rd Gen (2018-2024)',
    yearStart: '2018',
    yearEnd: '2024',
    variant: 'All Variants',
    fuelType: 'Petrol',
    partType: 'OEM Genuine',
    brand: 'Maruti MGP',
    compatibilityNotes: '',
    price: '',
    cost: '',
    stock: '1',
    minStock: '3',
    unit: 'pieces',
    unitType: 'discrete',
    supplier: '',
    isUniversal: false
  });

  const { data: categories } = useQuery('spare-part-categories', () => sparePartsService.getCategories());

  const mergedCategories = Array.from(new Set([
    ...DEFAULT_SPARE_PART_CATEGORIES,
    ...(categories?.categories || [])
  ])).sort((a, b) => a.localeCompare(b));

  // Available models for current make
  const availableModels = useMemo(() => {
    const makeObj = POPULAR_VEHICLE_MAKES.find(
      m => m.make.toLowerCase() === (formData.make || '').toLowerCase()
    );
    return makeObj ? makeObj.models : [];
  }, [formData.make]);

  // Available generations for current model
  const availableGenerations = useMemo(() => {
    const modelObj = availableModels.find(
      m => m.name.toLowerCase() === (formData.model || '').toLowerCase()
    );
    return modelObj?.generations || ['All Generations', '1st Gen', '2nd Gen', '3rd Gen', '4th Gen', 'Facelift'];
  }, [availableModels, formData.model]);

  const addCategoryMutation = useMutation(
    (categoryName: string) => sparePartsService.createCategory(categoryName),
    {
      onSuccess: (_, categoryName) => {
        queryClient.invalidateQueries('spare-part-categories');
        setFormData(prev => ({ ...prev, category: categoryName }));
        setIsAddingNewCategory(false);
        setNewCategoryInput('');
        toast.success(`Category "${categoryName}" added!`);
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.message || 'Failed to add category');
      }
    }
  );

  const createSparePartMutation = useMutation(
    (data: any) => sparePartsService.createSparePart(data),
    {
      onSuccess: () => {
        toast.success('Car-specific spare part registered successfully!');
        queryClient.invalidateQueries('spare-parts');
        navigate('/spare-parts');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to create spare part');
      }
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalCategory = isAddingNewCategory ? newCategoryInput.trim() : formData.category;
    if (!finalCategory) {
      toast.error('Please select or enter a category');
      return;
    }

    if (!formData.name.trim()) {
      toast.error('Part name is required');
      return;
    }

    const payload = {
      ...formData,
      category: finalCategory,
      make: formData.isUniversal ? 'Universal' : formData.make,
      model: formData.isUniversal ? 'All Models' : formData.model,
      generation: formData.isUniversal ? 'All Generations' : formData.generation,
      yearStart: formData.yearStart ? parseInt(formData.yearStart, 10) : undefined,
      yearEnd: formData.yearEnd ? parseInt(formData.yearEnd, 10) : undefined,
      price: parseFloat(formData.price) || 0,
      cost: parseFloat(formData.cost) || 0,
      stock: parseFloat(formData.stock) || 0,
      minStock: parseFloat(formData.minStock) || 0
    };

    createSparePartMutation.mutate(payload);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: value
      };
      
      // Auto-update models and brand when make changes
      if (name === 'make') {
        const makeObj = POPULAR_VEHICLE_MAKES.find(m => m.make === value);
        if (makeObj && makeObj.models.length > 0) {
          newData.model = makeObj.models[0].name;
          newData.generation = makeObj.models[0].generations?.[0] || 'All Generations';
        }
        if (value === 'Maruti Suzuki') newData.brand = 'Maruti MGP';
        else if (value === 'Hyundai') newData.brand = 'Hyundai Mobis';
        else if (value === 'Toyota') newData.brand = 'Toyota OEM';
        else if (value === 'Honda') newData.brand = 'Honda OEM';
        else if (value === 'Tata') newData.brand = 'Tata Motors Genuine';
        else if (value === 'Mahindra') newData.brand = 'Mahindra Genuine';
      }

      // Auto-update generations when model changes
      if (name === 'model') {
        const makeObj = POPULAR_VEHICLE_MAKES.find(m => m.make === prev.make);
        const modelObj = makeObj?.models.find(m => m.name === value);
        if (modelObj?.generations && modelObj.generations.length > 0) {
          newData.generation = modelObj.generations[0];
        }
      }

      // Reset unit when unitType changes
      if (name === 'unitType') {
        if (value === 'discrete') {
          newData.unit = 'pieces';
        } else if (value === 'liquid') {
          newData.unit = 'liters';
        } else if (value === 'weight') {
          newData.unit = 'kg';
        }
      }
      
      return newData;
    });
  };

  return (
    <div className="space-y-6 max-w-5xl pb-12">
      <div className="mb-4">
        <div className="flex items-center gap-4 mb-2">
          <button
            onClick={() => navigate('/spare-parts')}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Create Spare Part</h1>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Add a car-specific or universal spare part with generation and rate specifications
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* CARD 1: CAR & VEHICLE COMPATIBILITY */}
        <div className="card p-6 bg-white dark:bg-[#0c101c] border border-gray-200 dark:border-slate-800 rounded-xl shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b border-gray-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 rounded-lg">
                <Car className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-slate-100">Vehicle Compatibility & Brand Fitment</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Specify which car make, model, and generation this part belongs to</p>
              </div>
            </div>

            {/* Toggle Universal vs Car-Specific */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, isUniversal: false }))}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  !formData.isUniversal
                    ? 'bg-primary-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                Car-Specific
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, isUniversal: true, make: 'Universal', model: 'All Models', generation: 'All Generations' }))}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  formData.isUniversal
                    ? 'bg-primary-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                Universal / Consumable
              </button>
            </div>
          </div>

          {!formData.isUniversal ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Make / Brand */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Vehicle Make / Brand *
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCustomMake(!isCustomMake)}
                      className="text-[11px] text-primary-600 dark:text-primary-400 hover:underline font-medium"
                    >
                      {isCustomMake ? 'Pick from List' : '+ Other Brand'}
                    </button>
                  </div>
                  {!isCustomMake ? (
                    <select
                      name="make"
                      value={formData.make}
                      onChange={handleInputChange}
                      className="input w-full text-xs font-medium"
                      required
                    >
                      {POPULAR_VEHICLE_MAKES.filter(m => m.make !== 'Universal').map(m => (
                        <option key={m.make} value={m.make}>{m.make}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      name="make"
                      value={formData.make}
                      onChange={handleInputChange}
                      placeholder="e.g. BMW, Mercedes, Renault, MG"
                      className="input w-full text-xs"
                      required
                    />
                  )}
                </div>

                {/* Model */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Car Model *
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCustomModel(!isCustomModel)}
                      className="text-[11px] text-primary-600 dark:text-primary-400 hover:underline font-medium"
                    >
                      {isCustomModel ? 'Pick Preset' : '+ Other Model'}
                    </button>
                  </div>
                  {!isCustomModel && availableModels.length > 0 ? (
                    <select
                      name="model"
                      value={formData.model}
                      onChange={handleInputChange}
                      className="input w-full text-xs font-medium"
                      required
                    >
                      {availableModels.map(m => (
                        <option key={m.name} value={m.name}>{m.name}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      name="model"
                      value={formData.model}
                      onChange={handleInputChange}
                      placeholder="e.g. Swift, City, Creta, Duster"
                      className="input w-full text-xs"
                      required
                    />
                  )}
                </div>

                {/* Generation */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Generation / Era *
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCustomGeneration(!isCustomGeneration)}
                      className="text-[11px] text-primary-600 dark:text-primary-400 hover:underline font-medium"
                    >
                      {isCustomGeneration ? 'Pick Preset' : '+ Custom Gen'}
                    </button>
                  </div>
                  {!isCustomGeneration && availableGenerations.length > 0 ? (
                    <select
                      name="generation"
                      value={formData.generation}
                      onChange={handleInputChange}
                      className="input w-full text-xs font-medium"
                      required
                    >
                      {availableGenerations.map(gen => (
                        <option key={gen} value={gen}>{gen}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      name="generation"
                      value={formData.generation}
                      onChange={handleInputChange}
                      placeholder="e.g. 3rd Gen (2018-2024), Type 2"
                      className="input w-full text-xs"
                      required
                    />
                  )}
                </div>
              </div>

              {/* Years & Engine Variant */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Year From
                  </label>
                  <input
                    type="number"
                    name="yearStart"
                    value={formData.yearStart}
                    onChange={handleInputChange}
                    placeholder="2018"
                    className="input w-full text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Year To
                  </label>
                  <input
                    type="number"
                    name="yearEnd"
                    value={formData.yearEnd}
                    onChange={handleInputChange}
                    placeholder="2024"
                    className="input w-full text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Fuel Type
                  </label>
                  <select
                    name="fuelType"
                    value={formData.fuelType}
                    onChange={handleInputChange}
                    className="input w-full text-xs"
                  >
                    {FUEL_TYPES.map(ft => (
                      <option key={ft} value={ft}>{ft}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Engine / Variant
                  </label>
                  <input
                    type="text"
                    name="variant"
                    value={formData.variant}
                    onChange={handleInputChange}
                    placeholder="e.g. 1.2L K12M Petrol / All Variants"
                    className="input w-full text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Fitment & Mechanic Compatibility Notes
                </label>
                <input
                  type="text"
                  name="compatibilityNotes"
                  value={formData.compatibilityNotes}
                  onChange={handleInputChange}
                  placeholder="e.g. Fits Swift Gen 3 and Dzire Gen 3 Petrol only. Does not fit Swift Gen 2 or Diesel."
                  className="input w-full text-xs"
                />
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 flex items-center gap-3">
              <Info className="h-5 w-5 text-primary-500 shrink-0" />
              <p>
                This part is set as <strong>Universal / Consumable</strong> (e.g. engine oils, brake fluids, coolants, fuses, general fasteners). It will be available for all vehicles and models across the garage.
              </p>
            </div>
          )}
        </div>

        {/* CARD 2: BASIC INFORMATION */}
        <div className="card p-6 bg-white dark:bg-[#0c101c] border border-gray-200 dark:border-slate-800 rounded-xl shadow-xs">
          <div className="flex items-center gap-2.5 mb-4 border-b border-gray-100 dark:border-slate-800 pb-3">
            <div className="p-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-lg">
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-slate-100">Part Details & Brand Specifications</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">OEM part numbering, manufacturer brand, and component category</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Part Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g. Front Disc Brake Pads Set"
                className="input w-full text-xs font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                OEM Manufacturer Part Number
              </label>
              <input
                type="text"
                name="oemPartNumber"
                value={formData.oemPartNumber}
                onChange={handleInputChange}
                placeholder="e.g. 55810M68P00 / 04465-0K360"
                className="input w-full text-xs font-mono font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Internal Inventory / SKU Number
              </label>
              <input
                type="text"
                name="partNumber"
                value={formData.partNumber}
                onChange={handleInputChange}
                placeholder="e.g. SWIFT-BRK-003"
                className="input w-full text-xs font-mono"
              />
            </div>

            {/* Part Type & Brand */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Part Type *
                </label>
                <select
                  name="partType"
                  value={formData.partType}
                  onChange={handleInputChange}
                  className="input w-full text-xs"
                >
                  {PART_TYPES.map(pt => (
                    <option key={pt} value={pt}>{pt}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Manufacturer Brand *
                </label>
                <input
                  type="text"
                  name="brand"
                  list="brand-suggestions"
                  value={formData.brand}
                  onChange={handleInputChange}
                  placeholder="e.g. Maruti MGP, Bosch, Mobis"
                  className="input w-full text-xs"
                  required
                />
                <datalist id="brand-suggestions">
                  {POPULAR_PART_BRANDS.map(b => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* Category */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Category *
                </label>
                {!isAddingNewCategory ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingNewCategory(true);
                      setNewCategoryInput('');
                    }}
                    className="text-[11px] text-primary-600 dark:text-primary-400 hover:underline font-medium flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    New Category
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingNewCategory(false);
                      setNewCategoryInput('');
                    }}
                    className="text-[11px] text-gray-500 hover:text-gray-700 dark:text-slate-400"
                  >
                    Select Existing
                  </button>
                )}
              </div>

              {!isAddingNewCategory ? (
                <select
                  name="category"
                  value={formData.category}
                  onChange={(e) => {
                    if (e.target.value === '__ADD_NEW__') {
                      setIsAddingNewCategory(true);
                      setNewCategoryInput('');
                    } else {
                      handleInputChange(e);
                    }
                  }}
                  className="input w-full text-xs"
                  required
                >
                  <option value="">Select Category</option>
                  <option value="__ADD_NEW__" className="font-semibold text-primary-600">
                    + Add Custom Category...
                  </option>
                  <optgroup label="Standard Component Categories">
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
                    placeholder="e.g. Ceramic Brakes"
                    className="input flex-1 text-xs"
                    autoFocus
                    required
                  />
                  <button
                    type="button"
                    disabled={!newCategoryInput.trim() || addCategoryMutation.isLoading}
                    onClick={() => {
                      if (newCategoryInput.trim()) {
                        addCategoryMutation.mutate(newCategoryInput.trim());
                      }
                    }}
                    className="btn btn-primary text-xs px-3"
                  >
                    Save
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Vendor / Supplier
              </label>
              <input
                type="text"
                name="supplier"
                value={formData.supplier}
                onChange={handleInputChange}
                placeholder="e.g. Authorized MGP Distributor, Bosch India"
                className="input w-full text-xs"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Description / Technical Specifications
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="input w-full text-xs"
                rows={2}
                placeholder="Details, dimensions, technical material specs..."
              />
            </div>
          </div>
        </div>

        {/* CARD 3: PRICING & INVENTORY */}
        <div className="card p-6 bg-white dark:bg-[#0c101c] border border-gray-200 dark:border-slate-800 rounded-xl shadow-xs">
          <div className="flex items-center gap-2.5 mb-4 border-b border-gray-100 dark:border-slate-800 pb-3">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-slate-100">Pricing, Valuation & Stock Levels</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Customer billing rate, acquisition cost, and minimum alert thresholds</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Selling Price (₹) *
              </label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                className="input w-full text-xs font-bold text-primary-600"
                min="0"
                step="0.01"
                placeholder="1450.00"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Cost Price (₹) *
              </label>
              <input
                type="number"
                name="cost"
                value={formData.cost}
                onChange={handleInputChange}
                className="input w-full text-xs"
                min="0"
                step="0.01"
                placeholder="950.00"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Current Stock *
              </label>
              <input
                type="number"
                name="stock"
                value={formData.stock}
                onChange={handleInputChange}
                className="input w-full text-xs font-bold"
                min="0"
                step={formData.unitType === 'discrete' ? '1' : '0.001'}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Minimum Stock Alert *
              </label>
              <input
                type="number"
                name="minStock"
                value={formData.minStock}
                onChange={handleInputChange}
                className="input w-full text-xs"
                min="0"
                step={formData.unitType === 'discrete' ? '1' : '0.001'}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Unit Type *
              </label>
              <select
                name="unitType"
                value={formData.unitType}
                onChange={handleInputChange}
                className="input w-full text-xs"
                required
              >
                <option value="discrete">Discrete (pieces, items, sets)</option>
                <option value="liquid">Liquid (oil, coolant, fluid)</option>
                <option value="weight">Weight (grease, powder)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Unit of Measure *
              </label>
              <select
                name="unit"
                value={formData.unit}
                onChange={handleInputChange}
                className="input w-full text-xs"
                required
              >
                {formData.unitType === 'discrete' && (
                  <>
                    <option value="pieces">Pieces</option>
                    <option value="sets">Sets</option>
                    <option value="pairs">Pairs</option>
                  </>
                )}
                {formData.unitType === 'liquid' && (
                  <>
                    <option value="liters">Liters</option>
                    <option value="ml">Milliliters (ml)</option>
                    <option value="gallons">Gallons</option>
                  </>
                )}
                {formData.unitType === 'weight' && (
                  <>
                    <option value="kg">Kilograms (kg)</option>
                    <option value="grams">Grams</option>
                  </>
                )}
              </select>
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-gray-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => navigate('/spare-parts')}
            className="btn btn-secondary text-xs"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createSparePartMutation.isLoading}
            className="btn btn-primary text-xs flex items-center gap-2 shadow-sm"
          >
            <Save className="h-4 w-4" />
            {createSparePartMutation.isLoading ? 'Registering Part...' : 'Save Spare Part'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateSparePart;
