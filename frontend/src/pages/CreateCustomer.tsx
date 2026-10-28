import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from 'react-query';
import { customersService } from '../services/customers';
import { vehiclesService } from '../services/vehicles';
import { ArrowLeft, Plus, Trash2, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { getEngineTypesByCategory, FUEL_TYPES, TRANSMISSION_TYPES, BODY_TYPES } from '../constants/vehicleOptions';

interface CreateCustomerFormData {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  vehicles: Array<{
    makeId?: string;
    modelId?: string;
    variantId?: string;
    colorId?: string;
    licensePlate?: string;
    vin?: string;
    year?: number;
    isPrimary: boolean;
  }>;
}

const CreateCustomer: React.FC = () => {
  const navigate = useNavigate();
  const [manualInputs, setManualInputs] = useState<{ [key: string]: boolean }>({});
  const [manualData, setManualData] = useState<{ [key: string]: any }>({});
  const [decodingVinIndex, setDecodingVinIndex] = useState<number | null>(null);

  const { data: makes } = useQuery('vehicleMakes', () => vehiclesService.getMakes());
  const { data: models } = useQuery('vehicleModels', () => vehiclesService.getModels(''));
  const { data: variants } = useQuery('vehicleVariants', () => vehiclesService.getVariants(''));
  const { data: colors } = useQuery('vehicleColors', () => vehiclesService.getColors(''));

  const createCustomerMutation = useMutation(
    (data: CreateCustomerFormData) => customersService.createCustomer(data),
    {
      onSuccess: () => {
        toast.success('Customer created successfully!');
        navigate('/customers');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to create customer');
      }
    }
  );

  const [formData, setFormData] = useState<CreateCustomerFormData>({
    name: '',
    phone: '',
    email: '',
    address: '',
    vehicles: [{ makeId: '', modelId: '', variantId: '', colorId: '', licensePlate: '', vin: '', isPrimary: true }]
  });

  const handleInputChange = (field: keyof CreateCustomerFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleVehicleChange = (index: number, field: string, value: any) => {
    const newVehicles = [...formData.vehicles];
    newVehicles[index] = { ...newVehicles[index], [field]: value };
    setFormData(prev => ({ ...prev, vehicles: newVehicles }));
  };

  const addVehicle = () => {
    setFormData(prev => ({
      ...prev,
      vehicles: [...prev.vehicles, { makeId: '', modelId: '', variantId: '', colorId: '', licensePlate: '', vin: '', isPrimary: false }]
    }));
  };

  const removeVehicle = (index: number) => {
    if (formData.vehicles.length > 1) {
      const newVehicles = formData.vehicles.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, vehicles: newVehicles }));
    }
  };

  const toggleManualInput = (index: number, field: string) => {
    const key = `${index}-${field}`;
    setManualInputs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleManualDataChange = (index: number, field: string, value: any) => {
    const key = `${index}-${field}`;
    setManualData(prev => ({ ...prev, [key]: value }));
  };

  const handleDecodeVin = async (index: number) => {
    const targetVin = formData.vehicles[index]?.vin;
    if (!targetVin || targetVin.trim().length < 5) {
      toast.error('Please enter a valid VIN / Chassis number (at least 5 characters)');
      return;
    }

    setDecodingVinIndex(index);
    try {
      const decoded = await vehiclesService.decodeVin(targetVin);
      
      const newVehicles = [...formData.vehicles];
      const current = { ...newVehicles[index] };

      if (decoded.year) {
        current.year = decoded.year;
      }

      if (decoded.makeId) {
        current.makeId = decoded.makeId;
      } else if (decoded.make && decoded.make !== 'Unknown') {
        toggleManualInput(index, 'make');
        handleManualDataChange(index, 'make', decoded.make);
        if (decoded.country) {
          handleManualDataChange(index, 'makeCountry', decoded.country);
        }
      }

      if (decoded.modelId) {
        current.modelId = decoded.modelId;
      } else if (decoded.model) {
        toggleManualInput(index, 'model');
        handleManualDataChange(index, 'model', decoded.model);
        if (decoded.bodyType) {
          handleManualDataChange(index, 'modelBodyType', decoded.bodyType.toLowerCase());
        }
      }

      newVehicles[index] = current;
      setFormData(prev => ({ ...prev, vehicles: newVehicles }));

      toast.success(
        `Decoded: ${decoded.make} ${decoded.model || ''} ${decoded.year ? `(${decoded.year})` : ''}`.trim()
      );
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to decode VIN');
    } finally {
      setDecodingVinIndex(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Attach manual vehicle metadata if entered
    const enrichedVehicles = formData.vehicles.map((v, idx) => {
      const res = { ...v } as any;
      if (manualInputs[`${idx}-make`] && manualData[`${idx}-make`]) {
        res.makeName = manualData[`${idx}-make`];
      }
      if (manualInputs[`${idx}-model`] && manualData[`${idx}-model`]) {
        res.modelName = manualData[`${idx}-model`];
      }
      if (manualInputs[`${idx}-variant`] && manualData[`${idx}-variant`]) {
        res.variantName = manualData[`${idx}-variant`];
        res.variantCode = manualData[`${idx}-variantCode`];
        res.engineType = manualData[`${idx}-variantEngineType`];
        res.engineCapacity = manualData[`${idx}-variantEngineCapacity`];
        res.transmission = manualData[`${idx}-variantTransmission`];
        res.fuelType = manualData[`${idx}-variantFuelType`];
      }
      if (manualInputs[`${idx}-color`] && manualData[`${idx}-color`]) {
        res.colorName = manualData[`${idx}-color`];
      }
      return res;
    });

    createCustomerMutation.mutate({
      ...formData,
      vehicles: enrichedVehicles
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-4 mb-2">
          <button
            onClick={() => navigate('/customers')}
            className="p-2 rounded-lg text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Create Customer</h1>
            <p className="text-gray-600 dark:text-slate-400 text-sm">Add a new customer profile and vehicle records</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer Information */}
        <div className="card bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/50">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Customer Information</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="input w-full dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Phone *
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="input w-full dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="input w-full dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  className="input w-full dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Vehicle Information */}
        <div className="card bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/50">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Vehicle Information</h2>
              <button
                type="button"
                onClick={addVehicle}
                className="btn btn-secondary flex items-center gap-2 text-sm"
              >
                <Plus className="h-4 w-4" />
                Add Vehicle
              </button>
            </div>
          </div>
          <div className="p-6 space-y-6">
            {formData.vehicles.map((vehicle, index) => (
              <div key={index} className="border border-gray-200 dark:border-slate-700 rounded-xl p-5 bg-gray-50/50 dark:bg-slate-900/40">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-md font-bold text-gray-900 dark:text-slate-100">
                    Vehicle {index + 1}
                  </h3>
                  {formData.vehicles.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeVehicle(index)}
                      className="text-red-600 hover:text-red-800 dark:text-red-400 p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* VIN Quick Fetch Bar */}
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 rounded-xl p-3.5 mb-4">
                  <label className="block text-xs font-semibold text-blue-900 dark:text-blue-300 mb-1">
                    Fetch Vehicle Details from VIN / Chassis Number
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      placeholder="Enter 17-digit VIN (e.g. MAT... or 1HG...)"
                      value={vehicle.vin || ''}
                      onChange={(e) => handleVehicleChange(index, 'vin', e.target.value.toUpperCase())}
                      className="input uppercase bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100 font-mono text-sm flex-1"
                      maxLength={17}
                    />
                    <button
                      type="button"
                      onClick={() => handleDecodeVin(index)}
                      disabled={decodingVinIndex === index}
                      className="btn btn-primary text-sm whitespace-nowrap flex items-center justify-center gap-1.5"
                    >
                      {decodingVinIndex === index ? (
                        <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                      ) : (
                        <>
                          <Search className="h-4 w-4" />
                          Decode VIN
                        </>
                      )}
                    </button>
                  </div>
                  {vehicle.year ? (
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-1.5">
                      Detected Model Year: <strong>{vehicle.year}</strong>
                    </p>
                  ) : null}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Make */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium text-gray-700">
                        Make
                      </label>
                      <label className="flex items-center gap-2 text-sm text-gray-600">
                        <input
                          type="checkbox"
                          checked={manualInputs[`${index}-make`] || false}
                          onChange={() => toggleManualInput(index, 'make')}
                          className="rounded border-gray-300"
                        />
                        Manual Entry
                      </label>
                    </div>
                    {manualInputs[`${index}-make`] ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="Enter make name"
                          value={manualData[`${index}-make`] || ''}
                          onChange={(e) => handleManualDataChange(index, 'make', e.target.value)}
                          className="input"
                        />
                        <input
                          type="text"
                          placeholder="Country (optional)"
                          value={manualData[`${index}-makeCountry`] || ''}
                          onChange={(e) => handleManualDataChange(index, 'makeCountry', e.target.value)}
                          className="input"
                        />
                      </div>
                    ) : (
                      <select
                        value={vehicle.makeId}
                        onChange={(e) => handleVehicleChange(index, 'makeId', e.target.value)}
                        className="input"
                      >
                        <option value="">Select Make</option>
                        {makes?.makes.map((make) => (
                          <option key={make.id} value={make.id}>
                            {make.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Model */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium text-gray-700">
                        Model
                      </label>
                      <label className="flex items-center gap-2 text-sm text-gray-600">
                        <input
                          type="checkbox"
                          checked={manualInputs[`${index}-model`] || false}
                          onChange={() => toggleManualInput(index, 'model')}
                          className="rounded border-gray-300"
                        />
                        Manual Entry
                      </label>
                    </div>
                    {manualInputs[`${index}-model`] ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="Enter model name"
                          value={manualData[`${index}-model`] || ''}
                          onChange={(e) => handleManualDataChange(index, 'model', e.target.value)}
                          className="input"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="number"
                            placeholder="Start Year"
                            value={manualData[`${index}-modelYearStart`] || ''}
                            onChange={(e) => handleManualDataChange(index, 'modelYearStart', e.target.value)}
                            className="input"
                          />
                          <input
                            type="number"
                            placeholder="End Year"
                            value={manualData[`${index}-modelYearEnd`] || ''}
                            onChange={(e) => handleManualDataChange(index, 'modelYearEnd', e.target.value)}
                            className="input"
                          />
                        </div>
                        <select
                          value={manualData[`${index}-modelBodyType`] || ''}
                          onChange={(e) => handleManualDataChange(index, 'modelBodyType', e.target.value)}
                          className="input"
                        >
                          <option value="">Select Body Type (optional)</option>
                          {BODY_TYPES.map((body) => (
                            <option key={body.value} value={body.value}>
                              {body.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <select
                        value={vehicle.modelId}
                        onChange={(e) => handleVehicleChange(index, 'modelId', e.target.value)}
                        className="input"
                        disabled={!vehicle.makeId}
                      >
                        <option value="">Select Model</option>
                        {models?.models
                          .filter(model => model.make_id === vehicle.makeId)
                          .map((model) => (
                            <option key={model.id} value={model.id}>
                              {model.name}
                            </option>
                          ))}
                      </select>
                    )}
                  </div>

                  {/* Variant */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium text-gray-700">
                        Variant
                      </label>
                      <label className="flex items-center gap-2 text-sm text-gray-600">
                        <input
                          type="checkbox"
                          checked={manualInputs[`${index}-variant`] || false}
                          onChange={() => toggleManualInput(index, 'variant')}
                          className="rounded border-gray-300"
                        />
                        Manual Entry
                      </label>
                    </div>
                    {manualInputs[`${index}-variant`] ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="Enter variant name"
                          value={manualData[`${index}-variant`] || ''}
                          onChange={(e) => handleManualDataChange(index, 'variant', e.target.value)}
                          className="input"
                        />
                        <input
                          type="text"
                          placeholder="Variant Code (optional)"
                          value={manualData[`${index}-variantCode`] || ''}
                          onChange={(e) => handleManualDataChange(index, 'variantCode', e.target.value)}
                          className="input"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            value={manualData[`${index}-variantEngineType`] || ''}
                            onChange={(e) => handleManualDataChange(index, 'variantEngineType', e.target.value)}
                            className="input"
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
                            placeholder="Engine Capacity (e.g. 1.5L / 1498cc)"
                            value={manualData[`${index}-variantEngineCapacity`] || ''}
                            onChange={(e) => handleManualDataChange(index, 'variantEngineCapacity', e.target.value)}
                            className="input"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            value={manualData[`${index}-variantTransmission`] || ''}
                            onChange={(e) => handleManualDataChange(index, 'variantTransmission', e.target.value)}
                            className="input"
                          >
                            <option value="">Select Transmission</option>
                            {TRANSMISSION_TYPES.map((trans) => (
                              <option key={trans.value} value={trans.label}>
                                {trans.label}
                              </option>
                            ))}
                          </select>
                          <select
                            value={manualData[`${index}-variantFuelType`] || ''}
                            onChange={(e) => handleManualDataChange(index, 'variantFuelType', e.target.value)}
                            className="input"
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
                        value={vehicle.variantId}
                        onChange={(e) => handleVehicleChange(index, 'variantId', e.target.value)}
                        className="input"
                        disabled={!vehicle.modelId}
                      >
                        <option value="">Select Variant</option>
                        {variants?.variants
                          .filter(variant => variant.model_id === vehicle.modelId)
                          .map((variant) => (
                            <option key={variant.id} value={variant.id}>
                              {variant.name}
                            </option>
                          ))}
                      </select>
                    )}
                  </div>

                  {/* Color */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium text-gray-700">
                        Color
                      </label>
                      <label className="flex items-center gap-2 text-sm text-gray-600">
                        <input
                          type="checkbox"
                          checked={manualInputs[`${index}-color`] || false}
                          onChange={() => toggleManualInput(index, 'color')}
                          className="rounded border-gray-300"
                        />
                        Manual Entry
                      </label>
                    </div>
                    {manualInputs[`${index}-color`] ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="Enter color name"
                          value={manualData[`${index}-color`] || ''}
                          onChange={(e) => handleManualDataChange(index, 'color', e.target.value)}
                          className="input"
                        />
                        <input
                          type="text"
                          placeholder="Color Code (optional)"
                          value={manualData[`${index}-colorCode`] || ''}
                          onChange={(e) => handleManualDataChange(index, 'colorCode', e.target.value)}
                          className="input"
                        />
                        <select
                          value={manualData[`${index}-colorType`] || ''}
                          onChange={(e) => handleManualDataChange(index, 'colorType', e.target.value)}
                          className="input"
                        >
                          <option value="">Color Type (optional)</option>
                          <option value="solid">Solid</option>
                          <option value="metallic">Metallic</option>
                          <option value="pearl">Pearl</option>
                          <option value="matte">Matte</option>
                        </select>
                      </div>
                    ) : (
                      <select
                        value={vehicle.colorId}
                        onChange={(e) => handleVehicleChange(index, 'colorId', e.target.value)}
                        className="input"
                      >
                        <option value="">Select Color</option>
                        {colors?.colors.map((color) => (
                          <option key={color.id} value={color.id}>
                            {color.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* License Plate */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      License Plate
                    </label>
                    <input
                      type="text"
                      value={vehicle.licensePlate}
                      onChange={(e) => handleVehicleChange(index, 'licensePlate', e.target.value.toUpperCase())}
                      className="input uppercase"
                      placeholder="e.g. MH01AB1234"
                    />
                  </div>

                  {/* Model Year */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Manufacturing Year
                    </label>
                    <input
                      type="number"
                      value={vehicle.year || ''}
                      onChange={(e) => handleVehicleChange(index, 'year', e.target.value ? parseInt(e.target.value) : undefined)}
                      className="input"
                      placeholder="e.g. 2022"
                    />
                  </div>

                  {/* Primary Vehicle */}
                  <div className="flex items-center col-span-full pt-2">
                    <input
                      type="checkbox"
                      id={`primary-${index}`}
                      checked={vehicle.isPrimary}
                      onChange={(e) => handleVehicleChange(index, 'isPrimary', e.target.checked)}
                      className="mr-2 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <label htmlFor={`primary-${index}`} className="text-sm font-medium text-gray-700">
                      Primary Vehicle for this customer
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/customers')}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createCustomerMutation.isLoading}
            className="btn btn-primary"
          >
            {createCustomerMutation.isLoading ? 'Creating...' : 'Create Customer'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateCustomer;
