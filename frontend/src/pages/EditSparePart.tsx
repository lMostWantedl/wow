import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { sparePartsService } from '../services/spareParts';
import { ArrowLeft, Save, Plus, Car, Wrench, Tag, Info } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { DEFAULT_SPARE_PART_CATEGORIES } from '../constants/sparePartOptions';
import {
  POPULAR_VEHICLE_MAKES,
  FUEL_TYPES,
  PART_TYPES,
  POPULAR_PART_BRANDS
} from '../constants/vehicleCompatibility';

const EditSparePart: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');

  // Custom Make / Model / Generation text toggle
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
    yearStart: '',
    yearEnd: '',
    variant: 'All Variants',
    fuelType: 'Petrol',
    partType: 'OEM Genuine',
    brand: 'Maruti MGP',
    compatibilityNotes: '',
    price: '',
    cost: '',
    stock: '',
    minStock: '',
    unit: 'pieces',
    unitType: 'discrete',
    supplier: '',
    isUniversal: false
  });

  const { data: sparePart, isLoading } = useQuery(
    ['spare-part', id],
    () => sparePartsService.getSparePart(id!),
    {
      enabled: !!id,
      onSuccess: (data) => {
        const sp = data.sparePart;
        const partMake = sp.make || '';
        const isUniv = partMake.toLowerCase() === 'universal';

        // Check if make is custom or in presets
        const matchedMake = POPULAR_VEHICLE_MAKES.find(
          m => m.make.toLowerCase() === partMake.toLowerCase()
        );
        const customMake = !isUniv && !!partMake && !matchedMake;

        // Check if model is custom
        let customModel = false;
        const currentModel = sp.model || '';
        if (matchedMake && currentModel) {
          const matchedModel = matchedMake.models.find(
            m => m.name.toLowerCase() === currentModel.toLowerCase()
          );
          customModel = !matchedModel;
        } else if (customMake && currentModel) {
          customModel = true;
        }

        setIsCustomMake(customMake);
        setIsCustomModel(customModel);

        setFormData({
          name: sp.name || '',
          partNumber: sp.partNumber || '',
          oemPartNumber: sp.oemPartNumber || '',
          description: sp.description || '',
          category: sp.category || '',
          make: isUniv ? 'Universal' : (partMake || 'Maruti Suzuki'),
          model: sp.model || 'Swift',
          generation: sp.generation || 'All Generations',
          yearStart: sp.yearStart ? sp.yearStart.toString() : '',
          yearEnd: sp.yearEnd ? sp.yearEnd.toString() : '',
          variant: sp.variant || 'All Variants',
          fuelType: sp.fuelType || 'Petrol',
          partType: sp.partType || 'OEM Genuine',
          brand: sp.brand || '',
          compatibilityNotes: sp.compatibilityNotes || '',
          price: (sp.price || 0).toString(),
          cost: (sp.cost || 0).toString(),
          stock: (sp.stock || 0).toString(),
          minStock: (sp.minStock || 0).toString(),
          unit: sp.unit || 'pieces',
          unitType: sp.unitType || 'discrete',
          supplier: sp.supplier || '',
          isUniversal: isUniv
        });
      }
    }
  );

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

  const updateSparePartMutation = useMutation(
    (data: any) => sparePartsService.updateSparePart(id!, data),
    {
      onSuccess: () => {
        toast.success('Spare part updated successfully!');
        queryClient.invalidateQueries('spare-parts');
        queryClient.invalidateQueries(['spare-part', id]);
        navigate(`/spare-parts/${id}`);
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to update spare part');
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

    const { isUniversal, ...restFormData } = formData;
    const payload = {
      ...restFormData,
      category: finalCategory,
      make: isUniversal ? 'Universal' : formData.make,
      model: isUniversal ? 'All Models' : formData.model,
      generation: isUniversal ? 'All Generations' : formData.generation,
      yearStart: formData.yearStart ? parseInt(formData.yearStart, 10) : undefined,
      yearEnd: formData.yearEnd ? parseInt(formData.yearEnd, 10) : undefined,
      price: parseFloat(formData.price) || 0,
      cost: parseFloat(formData.cost) || 0,
      stock: parseFloat(formData.stock) || 0,
      minStock: parseFloat(formData.minStock) || 0
    };

    updateSparePartMutation.mutate(payload);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: value
      };
      
      // Auto-update model list when make changes
      if (name === 'make' && !prev.isUniversal) {
        const found = POPULAR_VEHICLE_MAKES.find(m => m.make === value);
        if (found && found.models.length > 0) {
          newData.model = found.models[0].name;
          newData.generation = found.models[0].generations?.[0] || 'All Generations';
        }
      }

      // Auto-update generations when model changes
      if (name === 'model' && !prev.isUniversal) {
        const makeObj = POPULAR_VEHICLE_MAKES.find(m => m.make === (newData.make || prev.make));
        if (makeObj) {
          const modelObj = makeObj.models.find(m => m.name === value);
          if (modelObj?.generations && modelObj.generations.length > 0) {
            newData.generation = modelObj.generations[0];
          }
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

  const toggleUniversal = (isUniv: boolean) => {
    setFormData(prev => ({
      ...prev,
      isUniversal: isUniv,
      make: isUniv ? 'Universal' : 'Maruti Suzuki',
      model: isUniv ? 'All Models' : 'Swift',
      generation: isUniv ? 'All Generations' : '3rd Gen (2018-2024)'
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!sparePart) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Spare part not found</p>
        <button
          onClick={() => navigate('/spare-parts')}
          className="btn btn-primary mt-4"
        >
          Back to Spare Parts
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/spare-parts/${id}`)}
            className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Edit Spare Part</h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-primary-100 dark:bg-primary-950/60 text-primary-700 dark:text-primary-400 border border-primary-300 dark:border-primary-800/60">
                Car-Specific / Fitment
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Update vehicle compatibility, brand specifications, pricing, and stock levels
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* CARD 1: VEHICLE COMPATIBILITY & BRAND FITMENT */}
        <div className="card p-6 bg-white dark:bg-[#0c101c] border border-gray-200 dark:border-slate-800 rounded-xl shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-gray-100 dark:border-slate-800 gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 rounded-lg">
                <Car className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-slate-100">Vehicle Compatibility & Brand Fitment</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Specify which exact car manufacturer, model, and generation this part belongs to</p>
              </div>
            </div>

            {/* Universal vs Car-Specific Toggle */}
            <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold">
              <button
                type="button"
                onClick={() => toggleUniversal(false)}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  !formData.isUniversal
                    ? 'bg-primary-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                Car-Specific Part
              </button>
              <button
                type="button"
                onClick={() => toggleUniversal(true)}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  formData.isUniversal
                    ? 'bg-primary-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                Universal / Fluids
              </button>
            </div>
          </div>

          {!formData.isUniversal ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Make */}
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
                      {isCustomMake ? 'Pick Preset' : '+ Other Brand'}
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
                      {POPULAR_VEHICLE_MAKES.map(m => (
                        <option key={m.make} value={m.make}>{m.make}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      name="make"
                      value={formData.make}
                      onChange={handleInputChange}
                      placeholder="e.g. Renault, Nissan, Skoda, Audi"
                      className="input w-full text-xs"
                      required
                    />
                  )}
                </div>

                {/* Model */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Vehicle Model *
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
                placeholder="e.g. 55810M68P00, 04465-0K240"
                className="input w-full text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Garage Internal Part Number / SKU
              </label>
              <input
                type="text"
                name="partNumber"
                value={formData.partNumber}
                onChange={handleInputChange}
                placeholder="e.g. SWIFT3-BRK-01"
                className="input w-full text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Part Type / Grading *
              </label>
              <select
                name="partType"
                value={formData.partType}
                onChange={handleInputChange}
                className="input w-full text-xs font-medium"
              >
                {PART_TYPES.map(pt => (
                  <option key={pt} value={pt}>{pt}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Manufacturer / Brand
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="brand"
                  list="popular-brands"
                  value={formData.brand}
                  onChange={handleInputChange}
                  placeholder="e.g. Maruti Genuine (MGP), Bosch, Mobis, TVS"
                  className="input w-full text-xs"
                />
                <datalist id="popular-brands">
                  {POPULAR_PART_BRANDS.map(b => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
              </div>
            </div>

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
                    className="input flex-1 text-xs"
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

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Description & Technical Specifications
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={2}
                placeholder="Include material, fitting details, warranty, or supplier notes..."
                className="input w-full text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Supplier / Vendor
              </label>
              <input
                type="text"
                name="supplier"
                value={formData.supplier}
                onChange={handleInputChange}
                placeholder="e.g. Metro Auto Distributors, Direct OEM"
                className="input w-full text-xs"
              />
            </div>
          </div>
        </div>

        {/* CARD 3: PRICING & INVENTORY */}
        <div className="card p-6 bg-white dark:bg-[#0c101c] border border-gray-200 dark:border-slate-800 rounded-xl shadow-xs">
          <div className="flex items-center gap-2.5 mb-4 border-b border-gray-100 dark:border-slate-800 pb-3">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <Tag className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-slate-100">Pricing & Inventory</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Set customer retail rates, garage procurement costs, and threshold alerts</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Retail Price (₹) *
              </label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                className="input w-full text-xs font-semibold"
                min="0"
                step="0.01"
                placeholder="0.00"
                required
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Billed to customer</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Garage Cost (₹) *
              </label>
              <input
                type="number"
                name="cost"
                value={formData.cost}
                onChange={handleInputChange}
                className="input w-full text-xs font-semibold"
                min="0"
                step="0.01"
                placeholder="0.00"
                required
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Procurement cost</span>
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
                className="input w-full text-xs font-semibold"
                min="0"
                step={formData.unitType === 'discrete' ? '1' : '0.001'}
                placeholder="0"
                required
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Units currently on shelf</span>
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
                className="input w-full text-xs font-semibold"
                min="0"
                step={formData.unitType === 'discrete' ? '1' : '0.001'}
                placeholder="3"
                required
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Alert when stock falls below</span>
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
                <option value="discrete">Discrete (pieces, items)</option>
                <option value="liquid">Liquid (oil, coolant, etc.)</option>
                <option value="weight">Weight (grease, powder, etc.)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Unit *
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
                    <option value="quarts">Quarts</option>
                    <option value="pints">Pints</option>
                  </>
                )}
                {formData.unitType === 'weight' && (
                  <>
                    <option value="kg">Kilograms (kg)</option>
                    <option value="grams">Grams</option>
                    <option value="lbs">Pounds (lbs)</option>
                    <option value="oz">Ounces (oz)</option>
                  </>
                )}
              </select>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(`/spare-parts/${id}`)}
            className="btn btn-secondary px-5 text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={updateSparePartMutation.isLoading}
            className="btn btn-primary flex items-center gap-2 px-6 py-2.5 text-xs font-semibold shadow-md"
          >
            <Save className="h-4 w-4" />
            {updateSparePartMutation.isLoading ? 'Saving Changes...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditSparePart;
