import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useAuth } from '../contexts/AuthContext';
import { billsService } from '../services/bills';
import { BillDetailsItem } from '../types';
import { format, isValid } from 'date-fns';
import { Edit, Printer, Plus, ArrowLeft, Wrench, Package } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import toast from 'react-hot-toast';

// Helper function to safely format dates
const safeFormatDate = (dateString: string | null | undefined, formatString: string = 'MMM dd, yyyy'): string => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return isValid(date) ? format(date, formatString) : 'N/A';
};

// Helper function to format quantities cleanly (e.g. 1 instead of 1.000)
const formatQuantity = (qty: any): string => {
  if (qty == null || qty === '') return '0';
  const num = parseFloat(qty);
  if (isNaN(num)) return String(qty);
  if (Number.isInteger(num)) return num.toString();
  return parseFloat(num.toFixed(3)).toString();
};

const BillDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentReference, setPaymentReference] = useState('');
  const printRef = useRef<HTMLDivElement>(null);

  const { data: billData, isLoading } = useQuery(
    ['bill', id],
    () => billsService.getBill(id!),
    {
      enabled: !!id,
    }
  );

  const addPaymentMutation = useMutation(
    (data: any) => billsService.addPayment(id!, data),
    {
      onSuccess: () => {
        toast.success('Payment added successfully!');
        queryClient.invalidateQueries(['bill', id]);
        setShowPaymentForm(false);
        setPaymentAmount('');
        setPaymentReference('');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to add payment');
      }
    }
  );

  const handleAddPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    addPaymentMutation.mutate({
      amount: parseFloat(paymentAmount),
      paymentMethod,
      reference: paymentReference,
    });
  };

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `Bill-${billData?.bill?.bill_number || 'Unknown'}`,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!billData?.bill) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Bill not found</p>
      </div>
    );
  }

  const bill = billData.bill as BillDetailsItem;

  const laborSubtotal = (bill.services || []).reduce(
    (sum, item) => sum + (Number(item.total_price) || (Number(item.quantity) * Number(item.unit_price)) || 0),
    0
  );
  const partsSubtotal = (bill.spareParts || []).reduce(
    (sum, item) => sum + (Number(item.total_price) || (Number(item.quantity) * Number(item.unit_price)) || 0),
    0
  );

  return (
    <div>
      {/* Print-only content */}
      <div ref={printRef} className="hidden print:block print:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <img 
                src="/logo.png" 
                alt="Wings on Wheels" 
                className="h-16 w-auto object-contain mr-4"
              />
              <div className="text-left">
                <h1 className="text-3xl font-bold text-gray-900">Wings on Wheels</h1>
                <p className="text-sm font-semibold text-primary-600 uppercase tracking-wider">Professional Auto Service & Diagnostics</p>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="text-lg font-semibold mb-2">Bill Information</h3>
              <p><strong>Bill Number:</strong> {bill.bill_number || 'N/A'}</p>
              <p><strong>Date:</strong> {safeFormatDate(bill.service_date)}</p>
              <p><strong>Status:</strong> {bill.status}</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Customer Information</h3>
              <p><strong>Name:</strong> {bill.customer_name || 'N/A'}</p>
              <p><strong>Phone:</strong> {bill.customer_phone || 'N/A'}</p>
              {bill.customer_email && <p><strong>Email:</strong> {bill.customer_email}</p>}
            </div>
          </div>

          {(bill.vehicle_number || bill.vehicle_model || bill.vehicle_year || bill.vehicle_vin) && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-2">Vehicle Information</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {bill.vehicle_number && <p><strong>Vehicle:</strong> {bill.vehicle_number}</p>}
                {bill.vehicle_model && <p><strong>Model:</strong> {bill.vehicle_model}</p>}
                {bill.vehicle_year && <p><strong>Year:</strong> {bill.vehicle_year}</p>}
                {bill.vehicle_vin && <p><strong>VIN:</strong> {bill.vehicle_vin}</p>}
              </div>
            </div>
          )}

          {/* 1. Labor & Services (Print) */}
          {bill.services && bill.services.length > 0 && (
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2 pb-1 border-b border-gray-300">
                <h3 className="text-base font-bold uppercase tracking-wider text-gray-800">
                  1. Labor & Services
                </h3>
                <span className="text-xs font-semibold text-gray-600">
                  Labor Subtotal: ₹{laborSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <table className="w-full border-collapse border border-gray-300 text-sm">
                <thead>
                  <tr className="bg-gray-100 text-gray-800">
                    <th className="border border-gray-300 p-2 text-center w-12">#</th>
                    <th className="border border-gray-300 p-2 text-left">Labor / Service Description</th>
                    <th className="border border-gray-300 p-2 text-center w-28">Hours / Qty</th>
                    <th className="border border-gray-300 p-2 text-right w-32">Rate (₹)</th>
                    <th className="border border-gray-300 p-2 text-right w-32">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {bill.services.map((item, idx) => (
                    <tr key={`service-${item.id || idx}`} className="hover:bg-gray-50">
                      <td className="border border-gray-300 p-2 text-center text-gray-600">{idx + 1}</td>
                      <td className="border border-gray-300 p-2">
                        <div className="font-semibold text-gray-900">{item.service_name || item.description}</div>
                        {item.description && item.description !== item.service_name && (
                          <div className="text-xs text-gray-600 italic mt-0.5">{item.description}</div>
                        )}
                      </td>
                      <td className="border border-gray-300 p-2 text-center">
                        {formatQuantity(item.quantity)} {Number(item.quantity) === 1 ? 'hr' : 'hrs'}
                      </td>
                      <td className="border border-gray-300 p-2 text-right">
                        ₹{(Number(item.unit_price) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="border border-gray-300 p-2 text-right font-medium">
                        ₹{(Number(item.total_price) || (Number(item.quantity) * Number(item.unit_price)) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-semibold">
                    <td colSpan={4} className="border border-gray-300 p-2 text-right text-gray-700">Labor Subtotal:</td>
                    <td className="border border-gray-300 p-2 text-right text-gray-900">
                      ₹{laborSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* 2. Spare Parts & Materials (Print) */}
          {bill.spareParts && bill.spareParts.length > 0 && (
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2 pb-1 border-b border-gray-300">
                <h3 className="text-base font-bold uppercase tracking-wider text-gray-800">
                  2. Spare Parts & Materials
                </h3>
                <span className="text-xs font-semibold text-gray-600">
                  Parts Subtotal: ₹{partsSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <table className="w-full border-collapse border border-gray-300 text-sm">
                <thead>
                  <tr className="bg-gray-100 text-gray-800">
                    <th className="border border-gray-300 p-2 text-center w-12">#</th>
                    <th className="border border-gray-300 p-2 text-left">Part Name & Description</th>
                    <th className="border border-gray-300 p-2 text-center w-28">Part No.</th>
                    <th className="border border-gray-300 p-2 text-center w-24">Quantity</th>
                    <th className="border border-gray-300 p-2 text-center w-20">Unit</th>
                    <th className="border border-gray-300 p-2 text-right w-28">Unit Price (₹)</th>
                    <th className="border border-gray-300 p-2 text-right w-32">Total (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {bill.spareParts.map((item, idx) => (
                    <tr key={`sparepart-${item.id || idx}`} className="hover:bg-gray-50">
                      <td className="border border-gray-300 p-2 text-center text-gray-600">{idx + 1}</td>
                      <td className="border border-gray-300 p-2">
                        <div className="font-semibold text-gray-900">{item.spare_part_name || item.description}</div>
                        {item.description && item.description !== item.spare_part_name && (
                          <div className="text-xs text-gray-600 italic mt-0.5">{item.description}</div>
                        )}
                      </td>
                      <td className="border border-gray-300 p-2 text-center font-mono text-xs text-gray-700">
                        {item.part_number || '—'}
                      </td>
                      <td className="border border-gray-300 p-2 text-center font-medium">
                        {formatQuantity(item.quantity)}
                      </td>
                      <td className="border border-gray-300 p-2 text-center text-gray-600">
                        {item.unit || 'pcs'}
                      </td>
                      <td className="border border-gray-300 p-2 text-right">
                        ₹{(Number(item.unit_price) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="border border-gray-300 p-2 text-right font-medium">
                        ₹{(Number(item.total_price) || (Number(item.quantity) * Number(item.unit_price)) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-semibold">
                    <td colSpan={6} className="border border-gray-300 p-2 text-right text-gray-700">Spare Parts Subtotal:</td>
                    <td className="border border-gray-300 p-2 text-right text-gray-900">
                      ₹{partsSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          <div className="flex justify-end mb-8">
            <div className="w-80 text-sm">
              {laborSubtotal > 0 && (
                <div className="flex justify-between py-1 text-gray-600">
                  <span>Labor Subtotal:</span>
                  <span>₹{laborSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              )}
              {partsSubtotal > 0 && (
                <div className="flex justify-between py-1 text-gray-600">
                  <span>Spare Parts Subtotal:</span>
                  <span>₹{partsSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex justify-between py-1 font-semibold border-t border-gray-200">
                <span>Subtotal:</span>
                <span>₹{(bill.subtotal || (laborSubtotal + partsSubtotal) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              {bill.discount_amount && bill.discount_amount > 0 ? (
                <div className="flex justify-between py-1 text-green-600">
                  <span>Discount:</span>
                  <span>-₹{bill.discount_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              ) : null}
              {bill.tax_amount && bill.tax_amount > 0 ? (
                <div className="flex justify-between py-1 text-gray-700">
                  <span>Tax ({bill.tax_rate || 0}%):</span>
                  <span>₹{bill.tax_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              ) : null}
              <div className="flex justify-between py-1.5 font-bold border-t-2 border-gray-800 text-base">
                <span>Total Amount:</span>
                <span>₹{(bill.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between py-1 text-blue-600">
                <span>Paid Amount:</span>
                <span>₹{(bill.paid_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between py-1 font-bold text-red-600 border-t border-gray-200">
                <span>Balance Due:</span>
                <span>₹{Math.max(0, (bill.total_amount || 0) - (bill.paid_amount || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Screen content */}
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/bills')}
              className="btn btn-secondary flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Bill #{bill.bill_number || 'N/A'}
              </h1>
              <p className="text-gray-500">
                Created on {safeFormatDate(bill.created_at)}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="btn btn-secondary flex items-center gap-2"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
            {user?.role !== 'CUSTOMER' && (
              <button
                onClick={() => navigate(`/bills/${id}/edit`)}
                className="btn btn-primary flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                Edit
              </button>
            )}
          </div>
        </div>

        {/* Bill Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Customer & Technician Info */}
            <div className="card p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Customer & Service Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Customer</h4>
                  <p className="font-semibold text-gray-900">{bill.customer_name || 'N/A'}</p>
                  <p className="text-sm text-gray-500">{bill.customer_phone || 'N/A'}</p>
                  {bill.customer_email && (
                    <p className="text-sm text-gray-500">{bill.customer_email}</p>
                  )}
                  {bill.customer_address && (
                    <p className="text-sm text-gray-500 mt-1">{bill.customer_address}</p>
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Service Details</h4>
                  <p><span className="text-gray-500 text-sm">Date:</span> <span className="font-medium">{safeFormatDate(bill.service_date)}</span></p>
                  {bill.technician_name && (
                    <p className="mt-1"><span className="text-gray-500 text-sm">Technician:</span> <span className="font-medium">{bill.technician_name}</span></p>
                  )}
                </div>
              </div>
            </div>

            {/* Vehicle Information */}
            {(bill.vehicle_number || bill.vehicle_model || bill.vehicle_year || bill.vehicle_vin) && (
              <div className="card p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Vehicle Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {bill.vehicle_number && (
                    <div>
                      <p className="text-sm text-gray-500">License Plate</p>
                      <p className="font-bold text-gray-900 font-mono">{bill.vehicle_number}</p>
                    </div>
                  )}
                  {bill.vehicle_model && (
                    <div>
                      <p className="text-sm text-gray-500">Model</p>
                      <p className="font-medium text-gray-900">{bill.vehicle_model}</p>
                    </div>
                  )}
                  {bill.vehicle_year && (
                    <div>
                      <p className="text-sm text-gray-500">Year</p>
                      <p className="font-medium text-gray-900">{bill.vehicle_year}</p>
                    </div>
                  )}
                  {bill.vehicle_vin && (
                    <div>
                      <p className="text-sm text-gray-500">VIN / Chassis</p>
                      <p className="font-mono text-xs bg-gray-100 dark:bg-slate-800 p-1 rounded font-medium text-gray-900 dark:text-slate-100">{bill.vehicle_vin}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 1. Labor & Services */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-primary-600" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Labor & Services</h3>
                  <span className="text-xs bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 font-semibold px-2.5 py-0.5 rounded-full">
                    {bill.services?.length || 0}
                  </span>
                </div>
                <div className="text-sm font-semibold text-gray-700 dark:text-slate-300">
                  Labor Total: <span className="text-primary-600 dark:text-primary-400 font-bold">₹{laborSubtotal.toLocaleString()}</span>
                </div>
              </div>
              
              {bill.services && bill.services.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Labor / Service Name</th>
                        <th>Scope / Notes</th>
                        <th className="text-center">Hours / Qty</th>
                        <th className="text-right">Rate</th>
                        <th className="text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bill.services.map((item) => (
                        <tr key={`service-${item.id}`}>
                          <td className="font-medium text-gray-900 dark:text-slate-100">
                            {item.service_name || item.description}
                          </td>
                          <td className="text-gray-500 text-sm">
                            {item.description && item.description !== item.service_name ? item.description : '—'}
                          </td>
                          <td className="text-center">
                            {formatQuantity(item.quantity)} {Number(item.quantity) === 1 ? 'hr' : 'hrs'}
                          </td>
                          <td className="text-right">₹{(Number(item.unit_price) || 0).toLocaleString()}</td>
                          <td className="text-right font-medium text-gray-900 dark:text-slate-100">
                            ₹{(Number(item.total_price) || (Number(item.quantity) * Number(item.unit_price)) || 0).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-gray-200 dark:border-slate-700 font-semibold text-sm">
                        <td colSpan={4} className="text-right py-3 text-gray-600 dark:text-slate-400">Labor Subtotal:</td>
                        <td className="text-right py-3 text-primary-600 dark:text-primary-400">₹{laborSubtotal.toLocaleString()}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="py-6 text-center text-gray-400 italic text-sm">
                  No labor or services recorded for this bill.
                </div>
              )}
            </div>

            {/* 2. Spare Parts & Materials */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Spare Parts & Materials</h3>
                  <span className="text-xs bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold px-2.5 py-0.5 rounded-full">
                    {bill.spareParts?.length || 0}
                  </span>
                </div>
                <div className="text-sm font-semibold text-gray-700 dark:text-slate-300">
                  Parts Total: <span className="text-blue-600 dark:text-blue-400 font-bold">₹{partsSubtotal.toLocaleString()}</span>
                </div>
              </div>

              {bill.spareParts && bill.spareParts.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Part Description</th>
                        <th className="text-center">Part No.</th>
                        <th className="text-center">Quantity</th>
                        <th className="text-center">Unit</th>
                        <th className="text-right">Unit Price</th>
                        <th className="text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bill.spareParts.map((item) => (
                        <tr key={`sparepart-${item.id}`}>
                          <td>
                            <div className="font-medium text-gray-900 dark:text-slate-100">
                              {item.spare_part_name || item.description}
                            </div>
                            {item.description && item.description !== item.spare_part_name && (
                              <div className="text-xs text-gray-500 italic mt-0.5">{item.description}</div>
                            )}
                          </td>
                          <td className="text-center">
                            {item.part_number ? (
                              <span className="font-mono text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-slate-700">
                                {item.part_number}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="text-center font-medium">
                            {formatQuantity(item.quantity)}
                          </td>
                          <td className="text-center text-xs font-semibold text-gray-500 uppercase">
                            {item.unit || 'pcs'}
                          </td>
                          <td className="text-right">₹{(Number(item.unit_price) || 0).toLocaleString()}</td>
                          <td className="text-right font-medium text-gray-900 dark:text-slate-100">
                            ₹{(Number(item.total_price) || (Number(item.quantity) * Number(item.unit_price)) || 0).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-gray-200 dark:border-slate-700 font-semibold text-sm">
                        <td colSpan={5} className="text-right py-3 text-gray-600 dark:text-slate-400">Spare Parts Subtotal:</td>
                        <td className="text-right py-3 text-blue-600 dark:text-blue-400">₹{partsSubtotal.toLocaleString()}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="py-6 text-center text-gray-400 italic text-sm">
                  No spare parts recorded for this bill.
                </div>
              )}
            </div>

            {/* Payments History */}
            {bill.payments && bill.payments.length > 0 && (
              <div className="card p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Payment History</h3>
                <div className="space-y-3">
                  {bill.payments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-900/60 rounded-lg border border-gray-100 dark:border-slate-800">
                      <div>
                        <p className="font-semibold text-gray-900">₹{(payment.amount || 0).toLocaleString()}</p>
                        <p className="text-xs text-gray-500">
                          {safeFormatDate(payment.paymentDate || payment.created_at)} • <span className="uppercase font-medium">{payment.paymentMethod || payment.payment_method}</span>
                          {payment.reference && ` • Ref: ${payment.reference}`}
                        </p>
                        {payment.notes && (
                          <p className="text-xs text-gray-500 mt-1 italic">{payment.notes}</p>
                        )}
                      </div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        Received
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bill Summary & Actions Sidebar */}
          <div className="space-y-6">
            <div className="card p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Summary</h3>
              <div className="space-y-3">
                {laborSubtotal > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Labor Subtotal:</span>
                    <span className="font-medium text-gray-700 dark:text-slate-300">₹{laborSubtotal.toLocaleString()}</span>
                  </div>
                )}
                {partsSubtotal > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Spare Parts Subtotal:</span>
                    <span className="font-medium text-gray-700 dark:text-slate-300">₹{partsSubtotal.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm border-t border-gray-100 dark:border-slate-800 pt-2">
                  <span className="text-gray-600 dark:text-slate-400 font-medium">Subtotal:</span>
                  <span className="font-semibold text-gray-900 dark:text-slate-100">₹{(bill.subtotal || (laborSubtotal + partsSubtotal) || 0).toLocaleString()}</span>
                </div>
                {bill.discount_amount && bill.discount_amount > 0 ? (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount:</span>
                    <span>-₹{bill.discount_amount.toLocaleString()}</span>
                  </div>
                ) : null}
                {bill.tax_amount && bill.tax_amount > 0 ? (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Tax ({bill.tax_rate || 0}%):</span>
                    <span className="font-medium">₹{bill.tax_amount.toLocaleString()}</span>
                  </div>
                ) : null}
                <div className="flex justify-between text-base font-bold border-t border-gray-200 pt-3">
                  <span>Total Amount:</span>
                  <span className="text-primary-600">₹{(bill.total_amount || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm text-blue-600">
                  <span>Total Paid:</span>
                  <span>₹{(bill.paid_amount || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-red-600 border-t border-gray-100 pt-2">
                  <span>Balance Due:</span>
                  <span>₹{Math.max(0, (bill.total_amount || 0) - (bill.paid_amount || 0)).toLocaleString()}</span>
                </div>

                <div className="pt-2">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                    bill.payment_status === 'PAID'
                      ? 'bg-green-100 text-green-800'
                      : bill.payment_status === 'PARTIAL'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    Payment: {bill.payment_status || 'PENDING'}
                  </span>
                </div>
              </div>

              {/* Record Payment Button */}
              {user?.role !== 'CUSTOMER' && (bill.total_amount || 0) > (bill.paid_amount || 0) && (
                <div className="mt-6 pt-4 border-t border-gray-200">
                  {!showPaymentForm ? (
                    <button
                      onClick={() => setShowPaymentForm(true)}
                      className="btn btn-primary w-full flex items-center justify-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Record Payment
                    </button>
                  ) : (
                    <form onSubmit={handleAddPayment} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Amount (₹)
                        </label>
                        <input
                          type="number"
                          className="input"
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                          step="0.01"
                          min="0.01"
                          max={Math.max(0, (bill.total_amount || 0) - (bill.paid_amount || 0))}
                          required
                          placeholder="e.g. 1500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Payment Method
                        </label>
                        <select
                          className="input"
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                        >
                          <option value="cash">Cash</option>
                          <option value="upi">UPI</option>
                          <option value="card">Card</option>
                          <option value="bank_transfer">Bank Transfer</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Reference / Transaction ID
                        </label>
                        <input
                          type="text"
                          className="input"
                          value={paymentReference}
                          onChange={(e) => setPaymentReference(e.target.value)}
                          placeholder="UPI Ref / Cheque No"
                        />
                      </div>
                      <div className="flex space-x-2 pt-1">
                        <button
                          type="submit"
                          disabled={addPaymentMutation.isLoading}
                          className="btn btn-primary flex-1"
                        >
                          {addPaymentMutation.isLoading ? 'Recording...' : 'Save Payment'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowPaymentForm(false)}
                          className="btn btn-secondary"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillDetails;
