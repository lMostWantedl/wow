import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { sparePartsService } from '../services/spareParts';
import { ArrowLeft, Save, Plus } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { DEFAULT_SPARE_PART_CATEGORIES } from '../constants/sparePartOptions';

const EditSparePart: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    partNumber: '',
    description: '',
    category: '',
    price: '',
    cost: '',
    stock: '',
    minStock: '',
    unit: 'pieces',
    unitType: 'discrete',
    supplier: ''
  });

  const { data: sparePart, isLoading } = useQuery(
    ['spare-part', id],
    () => sparePartsService.getSparePart(id!),
    {
      enabled: !!id,
      onSuccess: (data) => {
        setFormData({
          name: data.sparePart.name || '',
          partNumber: data.sparePart.partNumber || '',
          description: data.sparePart.description || '',
          category: data.sparePart.category || '',
          price: (data.sparePart.price || 0).toString(),
          cost: (data.sparePart.cost || 0).toString(),
          stock: (data.sparePart.stock || 0).toString(),
          minStock: (data.sparePart.minStock || 0).toString(),
          unit: data.sparePart.unit || 'pieces',
          unitType: data.sparePart.unitType || 'discrete',
          supplier: data.sparePart.supplier || ''
        });
      }
    }
  );

  const { data: categories } = useQuery('spare-part-categories', () => sparePartsService.getCategories());

  const mergedCategories = Array.from(new Set([
    ...DEFAULT_SPARE_PART_CATEGORIES,
    ...(categories?.categories || [])
  ])).sort((a, b) => a.localeCompare(b));

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
    updateSparePartMutation.mutate({
      ...formData,
      category: finalCategory,
      price: parseFloat(formData.price),
      cost: parseFloat(formData.cost),
      stock: parseFloat(formData.stock),
      minStock: parseFloat(formData.minStock)
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: value
      };
      
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
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => navigate(`/spare-parts/${id}`)}
            className="text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Spare Part</h1>
            <p className="text-gray-600">Update spare part information</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="input"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Part Number
              </label>
              <input
                type="text"
                name="partNumber"
                value={formData.partNumber}
                onChange={handleInputChange}
                className="input"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="input"
                rows={3}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Supplier
              </label>
              <input
                type="text"
                name="supplier"
                value={formData.supplier}
                onChange={handleInputChange}
                className="input"
              />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Pricing & Inventory</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price (₹) *
              </label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                className="input"
                min="0"
                step="0.01"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cost (₹) *
              </label>
              <input
                type="number"
                name="cost"
                value={formData.cost}
                onChange={handleInputChange}
                className="input"
                min="0"
                step="0.01"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Stock *
              </label>
              <input
                type="number"
                name="stock"
                value={formData.stock}
                onChange={handleInputChange}
                className="input"
                min="0"
                step={formData.unitType === 'discrete' ? '1' : '0.001'}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Minimum Stock *
              </label>
              <input
                type="number"
                name="minStock"
                value={formData.minStock}
                onChange={handleInputChange}
                className="input"
                min="0"
                step={formData.unitType === 'discrete' ? '1' : '0.001'}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit Type *
              </label>
              <select
                name="unitType"
                value={formData.unitType}
                onChange={handleInputChange}
                className="input"
                required
              >
                <option value="discrete">Discrete (pieces, items)</option>
                <option value="liquid">Liquid (oil, coolant, etc.)</option>
                <option value="weight">Weight (grease, powder, etc.)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit *
              </label>
              <select
                name="unit"
                value={formData.unit}
                onChange={handleInputChange}
                className="input"
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

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate(`/spare-parts/${id}`)}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={updateSparePartMutation.isLoading}
            className="btn btn-primary flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {updateSparePartMutation.isLoading ? 'Updating...' : 'Update Spare Part'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditSparePart;
