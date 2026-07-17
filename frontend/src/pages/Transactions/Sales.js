import React, { useState, useEffect, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import {
  Button, Box, Alert, Typography, Tabs, Tab, Paper, Grid, MenuItem, TextField,
  Table, TableHead, TableRow, TableCell, TableBody, IconButton, Divider, TableContainer,
  Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress, Snackbar
} from '@mui/material';
import {
  Add as AddIcon, Delete as DeleteIcon,
  Receipt as InvoiceIcon, Print as PrintIcon,
  Edit as EditIcon, Block as CancelIcon,
  Email as EmailIcon
} from '@mui/icons-material';
import { useSelector } from 'react-redux';

import apiClient from '../../api/client';
import PageHeader from '../../components/PageHeader';
import CommonTable from '../../components/CommonTable';
import CommonModal from '../../components/CommonModal';
import FormAutocomplete from '../../components/FormAutocomplete';

const Sales = () => {
  const [tabIndex, setTabIndex] = useState(0);
  const [sos, setSos] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [branches, setBranches] = useState([]);
  const [company, setCompany] = useState(null);

  const [openSOModal, setOpenSOModal] = useState(false);
  const [isDirectInvoice, setIsDirectInvoice] = useState(false);
  const [openInvoiceModal, setOpenInvoiceModal] = useState(false);
  const [openPrintModal, setOpenPrintModal] = useState(false);

  // Email dialog state
  const [openEmailModal, setOpenEmailModal] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [emailSnackbar, setEmailSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const [selectedSO, setSelectedSO] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [printDocType, setPrintDocType] = useState('Invoice');
  const [availableDCs, setAvailableDCs] = useState([]);
  const [selectedDCId, setSelectedDCId] = useState('');

  // Sales Order Form Local States
  const [soCustomerId, setSoCustomerId] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [soBranchId, setSoBranchId] = useState('');
  const [soDate, setSoDate] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [referenceNote, setReferenceNote] = useState('');
  const [referenceDate, setReferenceDate] = useState('');
  const [manualSoNumber, setManualSoNumber] = useState('');
  const [manualInvoiceNumber, setManualInvoiceNumber] = useState('');
  const [soItems, setSoItems] = useState([{ product_id: '', qty: 1, rate: 0, discount_amount: 0, tax_rate: 18 }]);

  // Quick Customer Create State
  const [openQuickCustomerModal, setOpenQuickCustomerModal] = useState(false);
  const [quickCustName, setQuickCustName] = useState('');
  const [quickCustGSTIN, setQuickCustGSTIN] = useState('');
  const [quickCustPhone, setQuickCustPhone] = useState('');
  const [quickCustEmail, setQuickCustEmail] = useState('');
  const [quickCustAddress, setQuickCustAddress] = useState('');
  const [quickCustOpeningBal, setQuickCustOpeningBal] = useState(0);
  const [quickCustOpeningBalType, setQuickCustOpeningBalType] = useState('Dr');
  const [quickCustomerError, setQuickCustomerError] = useState(null);
  const [quickCustomerLoading, setQuickCustomerLoading] = useState(false);

  // Quick Product Create State
  const [openQuickProductModal, setOpenQuickProductModal] = useState(false);
  const [quickProductRowIndex, setQuickProductRowIndex] = useState(null);
  const [quickProductName, setQuickProductName] = useState('');
  const [quickProductSKU, setQuickProductSKU] = useState('');
  const [quickProductType, setQuickProductType] = useState('RAW');
  const [quickProductUOM, setQuickProductUOM] = useState('KG');
  const [quickProductTaxRate, setQuickProductTaxRate] = useState(18);
  const [quickProductPurchasePrice, setQuickProductPurchasePrice] = useState(0);
  const [quickProductSellingPrice, setQuickProductSellingPrice] = useState(0);
  const [quickProductLoading, setQuickProductLoading] = useState(false);
  const [quickProductError, setQuickProductError] = useState(null);

  const [error, setError] = useState(null);
  const printRef = useRef();

  const { user } = useSelector((state) => state.auth);
  const { activeBranchId } = useSelector((state) => state.branch);
  const isSuperAdmin = user?.role_name === 'Super Admin';

  const loadData = async () => {
    try {
      const query = activeBranchId ? `?company_id=${activeBranchId}` : '';
      const soRes = await apiClient.get(`/sales/so${query}`);
      const invRes = await apiClient.get(`/sales/invoices${query}`);
      const brRes = await apiClient.get('/admin/companies');

      setSos(soRes.data);
      setInvoices(invRes.data);
      setBranches(brRes.data);
      if (activeBranchId) {
        const activeBr = brRes.data.find(b => b.id === activeBranchId);
        setCompany(activeBr || (brRes.data.length > 0 ? brRes.data[0] : null));
      } else {
        setCompany(brRes.data.length > 0 ? brRes.data[0] : null);
      }
    } catch (err) {
      setError('Failed to load transaction sales documents.');
    }
  };

  useEffect(() => {
    loadData();
  }, [activeBranchId]);

  const handleCancelSO = async (so) => {
    if (window.confirm(`Are you sure you want to cancel Sales Order ${so.so_number || `SO-${so.id.substring(0, 6).toUpperCase()}`}?`)) {
      try {
        await apiClient.post(`/sales/so/${so.id}/cancel`);
        loadData();
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to cancel Sales Order.');
      }
    }
  };

  const handleDeleteSO = async (so) => {
    if (window.confirm(`WARNING: Are you sure you want to PERMANENTLY delete Sales Order ${so.so_number || `SO-${so.id.substring(0, 6).toUpperCase()}`}? This action cannot be undone.`)) {
      try {
        await apiClient.delete(`/sales/so/${so.id}`);
        loadData();
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to delete Sales Order.');
      }
    }
  };

  const handleCancelInvoice = async (inv) => {
    if (window.confirm(`Are you sure you want to cancel Tax Invoice ${inv.invoice_number}?`)) {
      try {
        await apiClient.post(`/sales/invoices/${inv.id}/cancel`);
        loadData();
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to cancel Tax Invoice.');
      }
    }
  };

  const handleDeleteInvoice = async (inv) => {
    if (window.confirm(`WARNING: Are you sure you want to PERMANENTLY delete Tax Invoice ${inv.invoice_number}? This action cannot be undone and will reverse stock levels.`)) {
      try {
        await apiClient.delete(`/sales/invoices/${inv.id}`);
        loadData();
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to delete Tax Invoice.');
      }
    }
  };

  const getNextSoNumber = (branchId, branchList = branches) => {
    const br = branchList.find((b) => b.id === branchId);
    if (!br) return '';
    const nextNum = String(br.so_next_number).padStart(5, '0');
    return `${br.so_prefix || ''}${nextNum}${br.so_suffix || ''}`;
  };

  const getNextInvoiceNumber = (branchId, branchList = branches) => {
    const br = branchList.find((b) => b.id === branchId);
    if (!br) return '';
    const nextNum = String(br.invoice_next_number).padStart(5, '0');
    return `${br.invoice_prefix || ''}${nextNum}${br.invoice_suffix || ''}`;
  };

  const handleOpenAddSO = () => {
    setIsDirectInvoice(false);
    setSelectedSO(null);
    setSoCustomerId('');
    setSelectedCustomer(null);
    const defaultBranchId = activeBranchId || (branches.length > 0 ? branches[0].id : '');
    setSoBranchId(defaultBranchId);
    setSoDate(new Date().toISOString().split('T')[0]);
    setSoItems([{ product_id: '', qty: 1, rate: 0, discount_amount: 0, tax_rate: 18 }]);
    setManualSoNumber(getNextSoNumber(defaultBranchId));
    setOpenSOModal(true);
  };

  const handleOpenAddDirectInvoice = () => {
    setIsDirectInvoice(true);
    setSelectedSO(null);
    setSoCustomerId('');
    setSelectedCustomer(null);
    const defaultBranchId = activeBranchId || (branches.length > 0 ? branches[0].id : '');
    setSoBranchId(defaultBranchId);
    setSoDate(new Date().toISOString().split('T')[0]);
    setSoItems([{ product_id: '', qty: 1, rate: 0, discount_amount: 0, tax_rate: 18 }]);
    setManualSoNumber('');
    setOpenSOModal(true);
  };

  const handleOpenEditSO = (so) => {
    setSelectedSO(so);
    setSoCustomerId(so.customer_id);
    setSelectedCustomer({
      id: so.customer_id,
      name: so.customer_name,
      gstin: so.customer_gstin,
      billing_address: so.customer_billing_address,
      shipping_address: so.customer_shipping_address
    });
    setSoBranchId(so.company_id);
    setSoDate(so.date ? new Date(so.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
    setSoItems(
      so.items.map((item) => ({
        product_id: item.product_id,
        qty: item.qty,
        rate: item.rate,
        discount_amount: item.discount_amount,
        tax_rate: item.tax_rate,
        product_name: item.product_name,
        sku: item.sku
      }))
    );
    setManualSoNumber(so.so_number || '');
    setOpenSOModal(true);
  };

  const handleOpenQuickCustomer = () => {
    setQuickCustName('');
    setQuickCustGSTIN('');
    setQuickCustPhone('');
    setQuickCustEmail('');
    setQuickCustAddress('');
    setQuickCustOpeningBal(0);
    setQuickCustOpeningBalType('Dr');
    setQuickCustomerError(null);
    setOpenQuickCustomerModal(true);
  };

  const handleSaveQuickCustomer = async () => {
    if (!quickCustName) {
      setQuickCustomerError('Customer name is required.');
      return;
    }
    setQuickCustomerLoading(true);
    setQuickCustomerError(null);
    try {
      const payload = {
        name: quickCustName,
        gstin: quickCustGSTIN || null,
        phone: quickCustPhone || null,
        email: quickCustEmail || null,
        billing_address: quickCustAddress || null,
        shipping_address: quickCustAddress || null,
        opening_bal: parseFloat(quickCustOpeningBal) || 0.0,
        opening_bal_type: quickCustOpeningBalType,
        company_id: activeBranchId
      };
      const res = await apiClient.post('/customers/', payload);
      const newCust = res.data;
      
      setSoCustomerId(newCust.id);
      setSelectedCustomer({
        id: newCust.id,
        name: newCust.name,
        gstin: newCust.gstin,
        billing_address: newCust.billing_address,
        shipping_address: newCust.shipping_address
      });
      setOpenQuickCustomerModal(false);
    } catch (err) {
      setQuickCustomerError(err.response?.data?.detail || 'Failed to create customer.');
    } finally {
      setQuickCustomerLoading(false);
    }
  };

  const handleOpenQuickProduct = (idx) => {
    setQuickProductRowIndex(idx);
    setQuickProductName('');
    setQuickProductSKU('');
    setQuickProductType('RAW');
    setQuickProductUOM('KG');
    setQuickProductTaxRate(18);
    setQuickProductPurchasePrice(0);
    setQuickProductSellingPrice(0);
    setQuickProductError(null);
    setOpenQuickProductModal(true);
  };

  const handleSaveQuickProduct = async () => {
    if (!quickProductName) {
      setQuickProductError('Product name is required.');
      return;
    }
    setQuickProductLoading(true);
    setQuickProductError(null);
    try {
      const payload = {
        name: quickProductName,
        sku: null,
        hsn_code: quickProductSKU || null,
        product_type: quickProductType,
        category_id: null,
        uom: quickProductUOM,
        tax_rate: parseFloat(quickProductTaxRate) || 18.0,
        purchase_price: parseFloat(quickProductPurchasePrice) || 0.0,
        selling_price: parseFloat(quickProductSellingPrice) || 0.0,
        min_stock_level: 0.0
      };
      const res = await apiClient.post('/products/', payload);
      const newProd = res.data;
      
      setSoItems(prevItems => prevItems.map((it, i) => {
        if (i === quickProductRowIndex) {
          return {
            ...it,
            product_id: newProd.id,
            rate: parseFloat(parseFloat(newProd.selling_price || 0).toFixed(2)),
            tax_rate: parseFloat(parseFloat(newProd.tax_rate || 0).toFixed(2)),
            product_name: newProd.name,
            sku: newProd.sku
          };
        }
        return it;
      }));
      setOpenQuickProductModal(false);
    } catch (err) {
      setQuickProductError(err.response?.data?.detail || 'Failed to create product.');
    } finally {
      setQuickProductLoading(false);
    }
  };

  const handleAddItemRow = () => {
    setSoItems([...soItems, { product_id: '', qty: 1, rate: 0, discount_amount: 0, tax_rate: 18 }]);
  };

  const handleRemoveItemRow = (idx) => {
    setSoItems(soItems.filter((_, i) => i !== idx));
  };

  const handleItemChange = (idx, field, value) => {
    setSoItems(
      soItems.map((item, i) => {
        if (i === idx) {
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  const submitSO = async () => {
    try {
      const payload = {
        customer_id: soCustomerId,
        company_id: soBranchId,
        so_number: manualSoNumber || null,
        date: soDate ? new Date(soDate).toISOString() : null,
        items: soItems.map(item => ({
          product_id: item.product_id,
          qty: item.qty,
          rate: item.rate,
          discount_amount: item.discount_amount,
          tax_rate: item.tax_rate
        }))
      };
      if (selectedSO) {
        await apiClient.put(`/sales/so/${selectedSO.id}`, payload);
      } else {
        const res = await apiClient.post('/sales/so', payload);
        if (isDirectInvoice) {
          const soId = res.data.id;
          const invoicePayload = {
            sales_order_id: soId,
            delivery_challan_id: null,
            invoice_number: null,
            date: soDate ? new Date(soDate).toISOString() : null,
            due_date: new Date(Date.now() + 15 * 86400000).toISOString(),
            reference_note: 'Direct Invoice',
            reference_date: null
          };
          await apiClient.post('/sales/invoices', invoicePayload);
        }
      }
      setOpenSOModal(false);
      loadData();
    } catch (err) {
      setError(isDirectInvoice ? 'Failed to generate Direct Tax Invoice.' : 'Failed to submit Sales Order.');
    }
  };



  // ==========================================
  // INVOICE MANAGEMENT FLOWS
  // ==========================================
  const handleOpenInvoice = (so) => {
    setSelectedSO(so);
    setSelectedDCId('');
    setAvailableDCs([]);
    setInvoiceDate(new Date().toISOString().split('T')[0]);
    setReferenceNote('');
    setReferenceDate('');
    setManualInvoiceNumber(getNextInvoiceNumber(so.company_id));
    
    // Fetch transferred DCs for this customer
    apiClient.get(`/inventory/transfers?customer_id=${so.customer_id}`)
      .then(res => {
        const activeDCs = res.data.filter(dc => dc.status === 'Transferred');
        setAvailableDCs(activeDCs);
      })
      .catch(err => console.error('Error fetching delivery challans', err));

    setOpenInvoiceModal(true);
  };

  const submitInvoice = async () => {
    try {
      const payload = {
        sales_order_id: selectedSO.id,
        delivery_challan_id: selectedDCId || null,
        invoice_number: manualInvoiceNumber || null,
        date: invoiceDate ? new Date(invoiceDate).toISOString() : null,
        due_date: new Date(Date.now() + 15 * 86400000).toISOString(),
        reference_note: referenceNote || null,
        reference_date: referenceDate ? new Date(referenceDate).toISOString() : null
      };
      await apiClient.post('/sales/invoices', payload);
      setOpenInvoiceModal(false);
      loadData();
    } catch (err) {
      setError('Failed to generate Tax Invoice.');
    }
  };

  // ==========================================
  // PRINT LAYOUT HANDLERS
  // ==========================================
  const handleOpenPrint = (invoice) => {
    setSelectedInvoice(invoice);
    setPrintDocType('Invoice');
    setOpenPrintModal(true);
  };

  const handleOpenPrintSO = (so) => {
    setSelectedSO(so);
    setPrintDocType('SalesOrder');
    setOpenPrintModal(true);
  };

  // ==========================================
  // EMAIL INVOICE HANDLER
  // ==========================================
  const handleOpenEmailDialog = () => {
    if (!selectedInvoice) return;
    const companyName = company?.name || 'ORBX ERP';
    const invDate = selectedInvoice.date ? new Date(selectedInvoice.date).toLocaleDateString('en-IN') : '';
    const amount = selectedInvoice.total_amount?.toFixed(2) || '0.00';
    const custName = selectedInvoice.customer_name || 'Customer';

    const formatTemplate = (template, fallback) => {
      if (!template) return fallback;
      try {
        return template
          .replace(/{invoice_number}/g, selectedInvoice.invoice_number)
          .replace(/{company_name}/g, companyName)
          .replace(/{customer_name}/g, custName)
          .replace(/{invoice_date}/g, invDate)
          .replace(/{amount_due}/g, amount);
      } catch (err) {
        return fallback;
      }
    };

    const defaultSubject = `Tax Invoice ${selectedInvoice.invoice_number} from ${companyName}`;
    const defaultBody = `Dear ${custName},\n\nPlease find attached your Tax Invoice ${selectedInvoice.invoice_number}.\n\nInvoice Date: ${invDate}\nAmount Due: ₹${amount}\n\nThank you for your business.\n\nRegards,\n${companyName}`;

    setEmailTo(selectedInvoice.customer_email || '');
    setEmailSubject(formatTemplate(company?.email_subject_template, defaultSubject));
    setEmailBody(formatTemplate(company?.email_body_template, defaultBody));
    setOpenEmailModal(true);
  };

  const handleSendEmail = async () => {
    if (!selectedInvoice) return;
    setEmailSending(true);
    try {
      await apiClient.post(`/sales/invoices/${selectedInvoice.id}/email`, {
        recipient_email: emailTo || null,
        subject: emailSubject,
        body: emailBody,
      });
      setOpenEmailModal(false);
      setEmailSnackbar({ open: true, message: `Invoice emailed successfully to ${emailTo}`, severity: 'success' });
    } catch (err) {
      const detail = err.response?.data?.detail || 'Failed to send invoice email.';
      setEmailSnackbar({ open: true, message: detail, severity: 'error' });
    } finally {
      setEmailSending(false);
    }
  };

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    pageStyle: `
      @page { size: A4 portrait; margin: 0 !important; }
      body { margin: 0 !important; padding: 0 !important; }
    `
  });

  const handleDownloadPDF = async () => {
    if (!window.html2canvas || !window.jspdf) {
      const loadScript = (src) => {
        return new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = src;
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      };

      try {
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
      } catch (err) {
        setError("Failed to load PDF generation libraries. Please try again.");
        return;
      }
    }

    try {
      const element = printRef.current;
      const { jsPDF } = window.jspdf;
      
      const originalStyle = element.style.cssText;
      // Force a wide capture frame to prevent any text wrapping or cutoff due to screen constraints
      element.style.cssText += '; width: 800px !important; max-width: none !important; padding: 0 !important; margin: 0 !important;';
      
      const canvas = await window.html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        windowWidth: 800
      });
      
      element.style.cssText = originalStyle;

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      // A4 dimensions: 210 x 297 mm
      const margin = 15;
      const pageWidth = 210;
      const pageHeight = 297;
      
      const imgWidth = pageWidth - (margin * 2); // 180mm printable width
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = margin;

      // Draw first page
      pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
      
      // Hide bottom bleed to create bottom margin
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, pageHeight - margin, pageWidth, margin, 'F');
      
      const heightShown = pageHeight - (margin * 2);
      heightLeft -= heightShown;

      // Handle multi-page overflow
      while (heightLeft > 0) {
        position -= heightShown;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
        
        // Hide top and bottom bleed to maintain margins
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, pageWidth, margin, 'F'); // Top margin cover
        pdf.rect(0, pageHeight - margin, pageWidth, margin, 'F'); // Bottom margin cover
        
        heightLeft -= heightShown;
      }

      pdf.save(`${printDocType}_${printData?.invoice_number || 'Document'}.pdf`);
    } catch (err) {
      console.error(err);
      setError("Failed to generate PDF file.");
    }
  };

  const numberToWords = (num) => {
    if (num === undefined || num === null || isNaN(num)) return 'Zero Rupees Only';
    let n = parseFloat(num);
    if (n === 0) return 'Zero Rupees Only';

    const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const convertLessThanOneThousand = (val) => {
      if (val < 20) return units[val];
      if (val < 100) return tens[Math.floor(val / 10)] + (val % 10 !== 0 ? ' ' + units[val % 10] : '');
      return units[Math.floor(val / 100)] + ' Hundred' + (val % 100 !== 0 ? ' and ' + convertLessThanOneThousand(val % 100) : '');
    };

    const convert = (val) => {
      if (val === 0) return '';
      let parts = [];
      
      // Crores
      if (val >= 10000000) {
        const crores = Math.floor(val / 10000000);
        parts.push(convertLessThanOneThousand(crores) + ' Crore');
        val %= 10000000;
      }
      
      // Lakhs
      if (val >= 100000) {
        const lakhs = Math.floor(val / 100000);
        parts.push(convertLessThanOneThousand(lakhs) + ' Lakh');
        val %= 100000;
      }
      
      // Thousands
      if (val >= 1000) {
        const thousands = Math.floor(val / 1000);
        parts.push(convertLessThanOneThousand(thousands) + ' Thousand');
        val %= 1000;
      }
      
      // Remainder under 1000
      if (val > 0) {
        parts.push(convertLessThanOneThousand(val));
      }
      
      return parts.join(' ').trim();
    };

    const rupees = Math.floor(n);
    const paise = Math.round((n - rupees) * 100);
    
    let word = '';
    if (rupees > 0) {
      word += convert(rupees) + ' Rupees';
    } else {
      word += 'Zero Rupees';
    }
    
    if (paise > 0) {
      word += ' and ' + convertLessThanOneThousand(paise) + ' Paise';
    }
    
    return word + ' Only';
  };

  const formatBillingDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };


  const soColumns = [
    { id: 'so_number', label: 'SO Number', render: (row) => row.so_number || `SO-${row.id.substring(0, 6).toUpperCase()}` },
    { id: 'date', label: 'Order Date', render: (row) => new Date(row.date).toLocaleDateString() },
    {
      id: 'customer_name',
      label: 'Customer',
      render: (row) => row.customer_name || 'Unknown'
    },
    { id: 'grand_total', label: 'Grand Total (₹)', render: (row) => `₹${row.grand_total.toFixed(2)}` },
    {
      id: 'status',
      label: 'Status',
      render: (row) => (
        <Typography
          variant="caption"
          sx={{
            px: 1,
            py: 0.5,
            borderRadius: '4px',
            fontWeight: 600,
            backgroundColor:
              row.status === 'Invoiced' ? 'rgba(45, 106, 79, 0.1)' :
              row.status === 'Delivered' ? 'rgba(45, 106, 79, 0.1)' :
              row.status === 'Draft' ? 'rgba(100, 116, 139, 0.1)' : 'rgba(255, 143, 0, 0.1)',
            color:
              row.status === 'Invoiced' ? '#2d6a4f' :
              row.status === 'Delivered' ? '#2d6a4f' :
              row.status === 'Draft' ? '#64748b' : '#ff8f00',
          }}
        >
          {row.status}
        </Typography>
      )
    }
  ];

  const invoiceColumns = [
    { id: 'invoice_number', label: 'Invoice No.' },
    {
      id: 'sales_order_number',
      label: 'Sales Order No.',
      render: (row) => row.sales_order_number ? (
        <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
          {row.sales_order_number}
        </Typography>
      ) : '-'
    },
    {
      id: 'delivery_challan_number',
      label: 'Ref. Challan',
      render: (row) => row.delivery_challan_number ? (
        <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
          {row.delivery_challan_number}
        </Typography>
      ) : '-'
    },
    { id: 'date', label: 'Billing Date', render: (row) => new Date(row.date).toLocaleDateString() },
    {
      id: 'customer_name',
      label: 'Customer Name',
      render: (row) => row.customer_name || 'Unknown'
    },
    { id: 'total_amount', label: 'Invoice Value (₹)', render: (row) => `₹${row.total_amount.toFixed(2)}` },
    {
      id: 'status',
      label: 'Status',
      render: (row) => (
        <Typography
          variant="caption"
          sx={{
            px: 1,
            py: 0.5,
            borderRadius: '4px',
            fontWeight: 600,
            backgroundColor: row.status === 'Paid' ? 'rgba(45, 106, 79, 0.1)' : 'rgba(217, 4, 41, 0.1)',
            color: row.status === 'Paid' ? '#2d6a4f' : '#d90429',
          }}
        >
          {row.status}
        </Typography>
      )
    }
  ];

  const soTotalSum = soItems.reduce((acc, item) => acc + (parseInt(item.qty) || 0) * (parseFloat(item.rate) || 0), 0);
  const soTotalDiscount = soItems.reduce((acc, item) => acc + (parseFloat(item.discount_amount) || 0), 0);
  const soTotalTax = soItems.reduce((acc, item) => acc + (((parseInt(item.qty) || 0) * (parseFloat(item.rate) || 0) - (parseFloat(item.discount_amount) || 0)) * (parseFloat(item.tax_rate) || 18) / 100), 0);

  // Unified print data mapper
  const printData = (() => {
    if (printDocType === 'Invoice') {
      return selectedInvoice;
    } else if (printDocType === 'SalesOrder') {
      if (!selectedSO) return null;
      const companyState = company?.state_code || (company?.gstin ? company.gstin.substring(0, 2) : '22');
      const customerState = selectedSO.customer_gstin ? selectedSO.customer_gstin.substring(0, 2) : '';
      const isIntrastate = !customerState || companyState === customerState;
      const cgst = isIntrastate ? selectedSO.tax_amount / 2 : 0;
      const sgst = isIntrastate ? selectedSO.tax_amount / 2 : 0;
      const igst = !isIntrastate ? selectedSO.tax_amount : 0;
      return {
        invoice_number: selectedSO.so_number || `SO-${selectedSO.id.substring(0, 6).toUpperCase()}`,
        date: selectedSO.date,
        customer_name: selectedSO.customer_name,
        customer_gstin: selectedSO.customer_gstin,
        customer_billing_address: selectedSO.customer_billing_address,
        customer_shipping_address: selectedSO.customer_shipping_address,
        subtotal: selectedSO.total_amount,
        discount_amount: selectedSO.discount_amount,
        tax_amount: selectedSO.tax_amount,
        total_amount: selectedSO.grand_total,
        items: selectedSO.items,
        gst_breakup: { cgst, sgst, igst },
        company_id: selectedSO.company_id
      };
    }
    return null;
  })();

  const printBranch = printData ? branches.find((b) => b.id === printData.company_id) : null;
  const activePrintCompany = printBranch || company;

  const getHsnTaxSummary = () => {
    if (!printData || !printData.items) return [];
    const summary = {};
    const isIntrastate = (printData.gst_breakup?.cgst || 0) > 0 || (printData.gst_breakup?.sgst || 0) > 0;

    printData.items.forEach(item => {
      const hsn = item.hsn_code || 'N/A';
      const taxableValue = (item.rate * item.qty) - (item.discount_amount || 0);
      const gstRate = item.tax_rate || 18;
      const taxAmt = item.tax_amount || 0;

      if (!summary[hsn]) {
        summary[hsn] = {
          hsn,
          taxableValue: 0,
          cgstRate: isIntrastate ? (gstRate / 2) : 0,
          cgstAmount: 0,
          sgstRate: isIntrastate ? (gstRate / 2) : 0,
          sgstAmount: 0,
          igstRate: !isIntrastate ? gstRate : 0,
          igstAmount: 0,
          totalTax: 0
        };
      }
      summary[hsn].taxableValue += taxableValue;
      if (isIntrastate) {
        summary[hsn].cgstAmount += (taxAmt / 2);
        summary[hsn].sgstAmount += (taxAmt / 2);
      } else {
        summary[hsn].igstAmount += taxAmt;
      }
      summary[hsn].totalTax += taxAmt;
    });

    return Object.values(summary);
  };


  return (
    <Box>
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <CommonTable
        columns={invoiceColumns}
        rows={invoices}
        actions={[
          {
            icon: <EditIcon />,
            label: 'Edit Tax Invoice',
            onClick: (row) => {
              const linkedSO = sos.find(so => so.id === row.sales_order_id);
              if (linkedSO) {
                handleOpenEditSO(linkedSO);
              } else {
                setError('Associated Sales Order not found for editing.');
              }
            },
            color: 'secondary'
          },
          {
            icon: <PrintIcon />,
            label: 'Print Tax Invoice',
            onClick: handleOpenPrint,
            color: 'primary'
          },
          {
            icon: <CancelIcon />,
            label: 'Cancel Tax Invoice',
            condition: (row) => row.status !== 'Cancelled',
            onClick: handleCancelInvoice,
            color: 'error'
          },
          ...(isSuperAdmin ? [{
            icon: <DeleteIcon />,
            label: 'Delete Tax Invoice',
            onClick: handleDeleteInvoice,
            color: 'error'
          }] : [])
        ]}
        searchKey="invoice_number"
        tableActions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAddDirectInvoice}>
            Create Invoice
          </Button>
        }
      />

      <CommonModal
        open={openSOModal}
        onClose={() => setOpenSOModal(false)}
        title={selectedSO ? "Edit Invoice" : "Create Invoice"}
        maxWidth="md"
        actions={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button onClick={() => setOpenSOModal(false)} variant="outlined">Cancel</Button>
            <Button onClick={submitSO} variant="contained">Save Invoice</Button>
          </Box>
        }
      >
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr 1fr' }, gap: 2, alignItems: 'flex-start', mb: 3 }}>
          <Box>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <FormAutocomplete
                label="Select Customer"
                endpoint="/customers/"
                value={soCustomerId}
                size="small"
                onChange={(val) => setSoCustomerId(val)}
                onChangeOverride={(custObj) => setSelectedCustomer(custObj)}
                initialOption={selectedCustomer}
                sx={{ flexGrow: 1 }}
              />
              <IconButton 
                color="primary" 
                onClick={handleOpenQuickCustomer}
                title="Add New Customer"
                sx={{ border: '1px solid #cbd5e1', borderRadius: '8px', p: '8.5px', backgroundColor: '#f8fafc' }}
              >
                <AddIcon />
              </IconButton>
            </Box>
            {selectedCustomer && (
              <Box sx={{ mt: 1, px: 0.5, fontSize: '0.75rem', color: 'text.secondary', lineHeight: 1.3 }}>
                GSTIN: <strong>{selectedCustomer.gstin || 'N/A'}</strong> | Phone: <strong>{selectedCustomer.phone || 'N/A'}</strong>
                <br />
                Address: <strong>{selectedCustomer.billing_address || 'N/A'}</strong>
              </Box>
            )}
          </Box>
          <Box>
            <TextField
              label="Invoice Number (Optional)"
              fullWidth
              size="small"
              value={manualSoNumber}
              onChange={(e) => setManualSoNumber(e.target.value)}
            />
          </Box>
          <Box>
            <TextField
              type="date"
              label="Invoice Date"
              fullWidth
              size="small"
              value={soDate}
              onChange={(e) => setSoDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        </Box>

        <Typography variant="subtitle1" color="primary.main" sx={{ fontWeight: 600, mb: 1 }}>
          Invoice Items Grid
        </Typography>

        <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                <TableCell sx={{ py: 1, px: 1, fontWeight: 600 }}>Product</TableCell>
                <TableCell align="center" sx={{ py: 1, px: 1, fontWeight: 600, width: 80 }}>Qty</TableCell>
                <TableCell align="center" sx={{ py: 1, px: 1, fontWeight: 600, width: 130 }}>Rate (₹)</TableCell>
                <TableCell align="center" sx={{ py: 1, px: 1, fontWeight: 600, width: 100 }}>Disc (₹)</TableCell>
                <TableCell align="center" sx={{ py: 1, px: 1, fontWeight: 600, width: 90 }}>GST %</TableCell>
                <TableCell align="right" sx={{ py: 1, px: 1, fontWeight: 600 }}>Total (₹)</TableCell>
                <TableCell align="center" sx={{ py: 1, px: 1, width: 50 }}></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {soItems.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell sx={{ py: 0.5, px: 0.5, minWidth: 280 }}>
                    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                      <FormAutocomplete
                        label="Select Product"
                        endpoint="/products/"
                        value={item.product_id}
                        size="small"
                        onChange={(val) => handleItemChange(idx, 'product_id', val)}
                        onChangeOverride={(prodObj) => {
                          if (prodObj) {
                            setSoItems(prevItems => prevItems.map((it, i) => {
                              if (i === idx) {
                                return {
                                  ...it,
                                  product_id: prodObj.id,
                                  rate: parseFloat(parseFloat(prodObj.selling_price || 0).toFixed(2)),
                                  tax_rate: parseFloat(parseFloat(prodObj.tax_rate || 0).toFixed(2)),
                                  product_name: prodObj.name,
                                  sku: prodObj.sku
                                };
                              }
                              return it;
                            }));
                          }
                        }}
                        initialOption={item.product_id ? { id: item.product_id, name: item.product_name || 'Unknown', sku: item.sku || '' } : null}
                        sx={{ flexGrow: 1 }}
                      />
                      <IconButton 
                        color="primary" 
                        onClick={() => handleOpenQuickProduct(idx)}
                        title="Add New Product"
                        size="small"
                        sx={{ border: '1px solid #cbd5e1', borderRadius: '4px', p: '5px', backgroundColor: '#f8fafc' }}
                      >
                        <AddIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ py: 0.5, px: 0.5 }}>
                    <TextField
                      type="number"
                      size="small"
                      value={item.qty}
                      onChange={(e) => handleItemChange(idx, 'qty', parseInt(e.target.value) || 0)}
                      inputProps={{ style: { padding: '4px 6px', textAlign: 'center' } }}
                      sx={{ '& .MuiInputBase-root': { height: 32 } }}
                    />
                  </TableCell>
                  <TableCell sx={{ py: 0.5, px: 0.5 }}>
                    <TextField
                      type="number"
                      size="small"
                      value={item.rate}
                      onChange={(e) => handleItemChange(idx, 'rate', parseFloat(e.target.value) || 0)}
                      onBlur={() => handleItemChange(idx, 'rate', parseFloat(parseFloat(item.rate || 0).toFixed(2)))}
                      inputProps={{ style: { padding: '4px 6px', textAlign: 'center' } }}
                      sx={{ '& .MuiInputBase-root': { height: 32 } }}
                    />
                  </TableCell>
                  <TableCell sx={{ py: 0.5, px: 0.5 }}>
                    <TextField
                      type="number"
                      size="small"
                      value={item.discount_amount}
                      onChange={(e) => handleItemChange(idx, 'discount_amount', parseFloat(e.target.value) || 0)}
                      onBlur={() => handleItemChange(idx, 'discount_amount', parseFloat(parseFloat(item.discount_amount || 0).toFixed(2)))}
                      inputProps={{ style: { padding: '4px 6px', textAlign: 'center' } }}
                      sx={{ '& .MuiInputBase-root': { height: 32 } }}
                    />
                  </TableCell>
                  <TableCell sx={{ py: 0.5, px: 0.5 }}>
                    <TextField
                      type="number"
                      size="small"
                      value={item.tax_rate}
                      onChange={(e) => handleItemChange(idx, 'tax_rate', parseFloat(e.target.value) || 0)}
                      onBlur={() => handleItemChange(idx, 'tax_rate', parseFloat(parseFloat(item.tax_rate || 0).toFixed(2)))}
                      inputProps={{ style: { padding: '4px 6px', textAlign: 'center' } }}
                      sx={{ '& .MuiInputBase-root': { height: 32 } }}
                    />
                  </TableCell>
                  <TableCell align="right" sx={{ py: 0.5, px: 0.5, fontWeight: 600 }}>
                    {(((item.qty * item.rate) - item.discount_amount) * (1 + item.tax_rate / 100)).toFixed(2)}
                  </TableCell>
                  <TableCell align="center" sx={{ py: 0.5, px: 0.5 }}>
                    <IconButton color="error" size="small" onClick={() => handleRemoveItemRow(idx)} disabled={soItems.length === 1}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Button variant="outlined" startIcon={<AddIcon />} onClick={handleAddItemRow} sx={{ mb: 4 }}>
          Add Item Row
        </Button>

        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1, borderTop: '1px solid #e2e8f0', pt: 2 }}>
          <Typography variant="body2">Subtotal: <strong>₹{soTotalSum.toFixed(2)}</strong></Typography>
          <Typography variant="body2">Discount: <strong>-₹{soTotalDiscount.toFixed(2)}</strong></Typography>
          <Typography variant="body2">Taxes (GST): <strong>₹{soTotalTax.toFixed(2)}</strong></Typography>
          <Typography variant="subtitle1" color="primary.main">Grand Total: <strong>₹{(soTotalSum - soTotalDiscount + soTotalTax).toFixed(2)}</strong></Typography>
        </Box>
      </CommonModal>


      {/* GENERATE INVOICE MODAL */}
      <CommonModal
        open={openInvoiceModal}
        onClose={() => setOpenInvoiceModal(false)}
        title="Create Tax Invoice"
      >
        <Typography variant="body1" sx={{ mb: 2 }}>
          Generating sequential tax invoice for order: <strong>{selectedSO?.so_number || `SO-${selectedSO?.id.substring(0, 6).toUpperCase()}`}</strong>
        </Typography>
        
        {availableDCs.length > 0 ? (
          <TextField
            select
            fullWidth
            label="Refer / Link Delivery Challan"
            value={selectedDCId}
            onChange={(e) => setSelectedDCId(e.target.value)}
            sx={{ mb: 3 }}
            helperText="Selecting a Delivery Challan will link this invoice and skip deducting inventory twice."
          >
            <MenuItem value="">
              <em>None (Deduct items directly from stock)</em>
            </MenuItem>
            {availableDCs.map((dc) => (
              <MenuItem key={dc.id} value={dc.id}>
                {dc.challan_number} (Created: {new Date(dc.date).toLocaleDateString()})
              </MenuItem>
            ))}
          </TextField>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            No pending Delivery Challans found for this customer. Stock will be deducted from inventory.
          </Typography>
        )}

        <TextField
          fullWidth
          size="small"
          label="Invoice Number"
          value={manualInvoiceNumber}
          onChange={(e) => setManualInvoiceNumber(e.target.value)}
          sx={{ mb: 3 }}
        />

        <TextField
          type="date"
          fullWidth
          label="Invoice Date"
          value={invoiceDate}
          onChange={(e) => setInvoiceDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ mb: 3 }}
        />

        <TextField
          fullWidth
          label="Reference Note"
          value={referenceNote}
          onChange={(e) => setReferenceNote(e.target.value)}
          placeholder="Enter additional remarks or reference note"
          sx={{ mb: 3 }}
        />

        <TextField
          type="date"
          fullWidth
          label="Reference Date"
          value={referenceDate}
          onChange={(e) => setReferenceDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ mb: 3 }}
        />

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <Button onClick={() => setOpenInvoiceModal(false)} variant="outlined">Cancel</Button>
          <Button onClick={submitInvoice} variant="contained">Generate invoice</Button>
        </Box>
      </CommonModal>

      {/* PRINT-READY INVOICE / SALES ORDER PRINT MODAL */}
      <CommonModal
        open={openPrintModal}
        onClose={() => setOpenPrintModal(false)}
        title={printDocType === 'Invoice' ? "Print Tax Invoice" : "Print Sales Order"}
        maxWidth="md"
        actions={
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button variant="outlined" startIcon={<PrintIcon />} onClick={handlePrint}>
              {printDocType === 'Invoice' ? 'Print Invoice' : 'Print Sales Order'}
            </Button>
            <Button variant="contained" onClick={handleDownloadPDF}>
              Download PDF
            </Button>
            {printDocType === 'Invoice' && (
              <Button
                variant="contained"
                color="secondary"
                startIcon={<EmailIcon />}
                onClick={handleOpenEmailDialog}
                sx={{
                  background: 'linear-gradient(135deg, #1a237e 0%, #283593 100%)',
                  '&:hover': { background: 'linear-gradient(135deg, #283593 0%, #3949ab 100%)' }
                }}
              >
                Email to Customer
              </Button>
            )}
          </Box>
        }
      >
        <Box sx={{ p: 4, '@media print': { p: 0 } }}>
          <Box
            ref={printRef}
            sx={{
              width: '100%',
              maxWidth: '180mm',
              minHeight: '265mm',
              mx: 'auto',
              boxSizing: 'border-box',
              backgroundColor: '#ffffff',
              color: '#000000',
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              boxShadow: 'none',
              '@media print': {
                width: '210mm !important',
                maxWidth: '210mm !important',
                minHeight: '297mm !important',
                padding: '12mm 15mm !important',
                margin: '0 !important',
                boxShadow: 'none !important',
                boxSizing: 'border-box !important',
              }
            }}
          >
          {/* Header */}
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'row',
            alignItems: 'center', 
            justifyContent: activePrintCompany?.logo ? 'flex-start' : 'center', 
            gap: 3, 
            mb: 2, 
            minHeight: 90,
            width: '100%'
          }}>
            {activePrintCompany?.logo && (
              <Box
                component="img"
                src={activePrintCompany.logo}
                alt="Company Logo"
                sx={{
                  maxHeight: 90,
                  maxWidth: 90,
                  objectFit: 'contain',
                  '@media print': {
                    printColorAdjust: 'exact',
                  }
                }}
              />
            )}
            <Box sx={{ textAlign: 'center', flexGrow: 1 }}>
              <Typography sx={{ fontSize: '1.5rem', fontWeight: 800, color: 'primary.main', mb: 0.5, lineHeight: 1.2 }}>
                {activePrintCompany?.name ? activePrintCompany.name.trim() : 'ORBX CORPORATION'}
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '0.9rem' }}>{activePrintCompany?.address ? activePrintCompany.address.trim() : ''}</Typography>
              <Typography variant="body2" sx={{ fontSize: '0.9rem' }}>GSTIN: <strong>{activePrintCompany?.gstin ? activePrintCompany.gstin.trim() : ''}</strong></Typography>
              <Typography variant="body2" sx={{ fontSize: '0.9rem' }}>
                Email: {activePrintCompany?.email ? activePrintCompany.email.trim() : ''} | Phone: {activePrintCompany?.phone ? activePrintCompany.phone.trim() : ''}
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ mb: 2 }} />

          {/* Document Details (Title, Number & Date) */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Box sx={{ textAlign: 'right' }}>
              <Typography sx={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                {printDocType === 'Invoice' ? 'TAX INVOICE' : 'SALES ORDER'}{' '}
                <span style={{ fontWeight: 600, color: '#334155', fontSize: '1.15rem', marginLeft: '6px' }}>
                  {printData?.invoice_number}
                </span>
              </Typography>
              {printDocType === 'Invoice' && printData?.delivery_challan_number && (
                <Typography variant="body2" sx={{ fontSize: '0.85rem', color: '#475569', mt: 0.5 }}>
                  Challan No: <strong>{printData.delivery_challan_number}</strong>
                </Typography>
              )}
              <Typography variant="body2" sx={{ fontSize: '0.85rem', color: '#475569', mt: 0.5 }}>
                Date: <strong>{printData ? formatBillingDate(printData.date) : ''}</strong>
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ mb: 2 }} />

          {/* Addresses */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
            <Box sx={{ width: '48%' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5, fontSize: '0.9rem' }}>BILL TO:</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.9rem' }}>{printData?.customer_name}</Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-line', fontSize: '0.85rem', color: 'text.secondary' }}>{printData?.customer_billing_address}</Typography>
              <Typography variant="body2" sx={{ fontSize: '0.9rem', mt: 0.5 }}>GSTIN: <strong>{printData?.customer_gstin}</strong></Typography>
            </Box>
            <Box sx={{ width: '48%' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5, fontSize: '0.9rem' }}>SHIP TO:</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.9rem' }}>{printData?.customer_name}</Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-line', fontSize: '0.85rem', color: 'text.secondary' }}>{printData?.customer_shipping_address}</Typography>
            </Box>
          </Box>

          {/* Items Grid */}
          {(() => {
            const hasDiscount = printData?.items?.some(item => (item.discount_amount || 0) > 0) || false;
            return (
              <TableContainer sx={{ mb: 6 }}>
                <Table size="small" sx={{ 
                  '& .MuiTableCell-root': { py: 0.25, px: 1, fontSize: '0.85rem' },
                  '& .MuiTableCell-root:first-of-type': { paddingLeft: '0 !important' },
                  '& .MuiTableCell-root:last-of-type': { paddingRight: '0 !important' }
                }}>
                  <TableHead>
                    <TableRow sx={{ borderTop: '1.5px solid #000000', borderBottom: '1.5px solid #000000' }}>
                      <TableCell sx={{ fontWeight: 700, width: '5%', whiteSpace: 'nowrap' }}>S.No.</TableCell>
                      <TableCell sx={{ fontWeight: 700, width: hasDiscount ? '30%' : '40%', whiteSpace: 'nowrap' }}>Item Description</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, width: '12%', whiteSpace: 'nowrap' }}>HSN</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, width: '8%', whiteSpace: 'nowrap' }}>Qty</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, width: '12%', whiteSpace: 'nowrap' }}>Rate (₹)</TableCell>
                      {hasDiscount && <TableCell align="center" sx={{ fontWeight: 700, width: '10%', whiteSpace: 'nowrap' }}>Disc (₹)</TableCell>}
                      <TableCell align="center" sx={{ fontWeight: 700, width: '10%', whiteSpace: 'nowrap' }}>GST %</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, width: '13%', whiteSpace: 'nowrap' }}>Amount (₹)</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {printData?.items?.map((item, idx) => {
                      return (
                        <TableRow key={idx} sx={{ borderBottom: '1px solid #e2e8f0', '@media print': { pageBreakInside: 'avoid' } }}>
                          <TableCell>{idx + 1}</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>{item.product_name || 'Unknown'}</TableCell>
                          <TableCell align="center">{item.hsn_code || 'N/A'}</TableCell>
                          <TableCell align="center">{item.qty}</TableCell>
                          <TableCell align="center">{item.rate.toFixed(2)}</TableCell>
                          {hasDiscount && <TableCell align="center">{item.discount_amount.toFixed(2)}</TableCell>}
                          <TableCell align="center">{item.tax_rate}%</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>{item.amount.toFixed(2)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            );
          })()}

          {/* Summary / Totals */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
            <Box sx={{ width: '50%' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5, fontSize: '0.85rem' }}>Terms & Conditions:</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', whiteSpace: 'pre-line', fontSize: '0.75rem', display: 'block', lineHeight: 1.3, mb: 2 }}>
                {printBranch?.invoice_terms}
              </Typography>

              {printDocType === 'Invoice' && (printData?.sales_order_number || printData?.reference_note || printData?.reference_date) && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5, fontSize: '0.85rem' }}>Invoice Reference:</Typography>
                  {printData?.sales_order_number && (
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem', display: 'block', lineHeight: 1.3 }}>
                      Sales Order No: <strong style={{ color: '#000000' }}>{printData.sales_order_number}</strong>
                    </Typography>
                  )}
                  {printData?.reference_note && (
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem', display: 'block', lineHeight: 1.3 }}>
                      Reference Note: <strong style={{ color: '#000000' }}>{printData.reference_note}</strong>
                    </Typography>
                  )}
                  {printData?.reference_date && (
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem', display: 'block', lineHeight: 1.3 }}>
                      Reference Date: <strong style={{ color: '#000000' }}>{formatBillingDate(printData.reference_date)}</strong>
                    </Typography>
                  )}
                </Box>
              )}
            </Box>
            <Box sx={{ width: '42%', textAlign: 'right' }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.75, fontSize: '0.85rem' }}>
                <Typography variant="body2" sx={{ textAlign: 'left' }}>Subtotal:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>₹{printData?.subtotal?.toFixed(2)}</Typography>
                
                {printData?.discount_amount > 0 && (
                  <>
                    <Typography variant="body2" sx={{ textAlign: 'left' }}>Discount:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>-₹{printData.discount_amount.toFixed(2)}</Typography>
                  </>
                )}

                {printData?.gst_breakup?.cgst > 0 && (
                  <>
                    <Typography variant="body2" sx={{ textAlign: 'left' }}>CGST:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>₹{printData?.gst_breakup?.cgst?.toFixed(2)}</Typography>
                  </>
                )}

                {printData?.gst_breakup?.sgst > 0 && (
                  <>
                    <Typography variant="body2" sx={{ textAlign: 'left' }}>SGST:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>₹{printData?.gst_breakup?.sgst?.toFixed(2)}</Typography>
                  </>
                )}

                {printData?.gst_breakup?.igst > 0 && (
                  <>
                    <Typography variant="body2" sx={{ textAlign: 'left' }}>IGST:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>₹{printData?.gst_breakup?.igst?.toFixed(2)}</Typography>
                  </>
                )}
              </Box>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', fontSize: '0.9rem' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, textAlign: 'left' }}>Grand Total:</Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                  ₹{printData?.total_amount?.toFixed(2)}
                </Typography>
              </Box>
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" sx={{ fontStyle: 'italic', fontWeight: 600, display: 'block', color: 'text.secondary', fontSize: '0.8rem' }}>
                  Rupees: {printData ? numberToWords(printData.total_amount) : ''}
                </Typography>
              </Box>
            </Box>
          </Box>

          <Divider sx={{ my: 1.5 }} />

          {printDocType === 'Invoice' && activePrintCompany?.bank_name && (
            <>
              <Box sx={{ mb: 1.5, px: 0.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b', mb: 0.25 }}>
                  Bank Details:
                </Typography>
                <Typography variant="body2" sx={{ fontSize: '0.8rem', color: '#334155', lineHeight: 1.3 }}>
                  Bank Name: <strong>{activePrintCompany.bank_name}</strong> | A/C No: <strong>{activePrintCompany.bank_account_no}</strong>
                </Typography>
                <Typography variant="body2" sx={{ fontSize: '0.8rem', color: '#334155', lineHeight: 1.3 }}>
                  IFSC Code: <strong>{activePrintCompany.bank_ifsc_code}</strong> | Branch: <strong>{activePrintCompany.bank_branch_location}</strong>
                </Typography>
              </Box>
              <Divider sx={{ mb: 1.5 }} />
            </>
          )}

          {/* Signatures & Footer */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mt: 3, '@media print': { pageBreakInside: 'avoid' } }}>
            <Box>
              <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>Customer Signature</Typography>
              <Box sx={{ height: 35, borderBottom: '1px solid #000000', width: 150 }} />
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>Authorized Signatory for {activePrintCompany?.name ? activePrintCompany.name.trim() : ''}</Typography>
              <Box sx={{ height: 35, borderBottom: '1px solid #000000', width: 150, ml: 'auto' }} />
            </Box>
          </Box>

          <Box sx={{ textAlign: 'center', mt: 4 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
              {printBranch?.invoice_footer || 'Thank you for your business!'}
            </Typography>
          </Box>
        </Box>
        </Box>
      </CommonModal>

      {/* EMAIL INVOICE DIALOG */}
      <Dialog
        open={openEmailModal}
        onClose={() => !emailSending && setOpenEmailModal(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 25px 50px rgba(0,0,0,0.5)'
          }
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex', alignItems: 'center', gap: 1.5,
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            pb: 2, color: '#f1f5f9'
          }}
        >
          <EmailIcon sx={{ color: '#818cf8' }} />
          Email Tax Invoice
        </DialogTitle>
        <DialogContent sx={{ pt: 3, pb: 1 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField
              id="email-to"
              label="To"
              fullWidth
              size="small"
              value={emailTo}
              onChange={(e) => setEmailTo(e.target.value)}
              placeholder="customer@example.com"
              helperText={!emailTo ? "⚠ Customer has no email on record — please enter one" : ""}
              sx={{
                '& .MuiOutlinedInput-root': { color: '#f1f5f9', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } },
                '& .MuiInputLabel-root': { color: '#94a3b8' },
                '& .MuiFormHelperText-root': { color: '#f59e0b' }
              }}
            />
            <TextField
              id="email-subject"
              label="Subject"
              fullWidth
              size="small"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': { color: '#f1f5f9', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } },
                '& .MuiInputLabel-root': { color: '#94a3b8' }
              }}
            />
            <TextField
              id="email-body"
              label="Message"
              fullWidth
              multiline
              minRows={5}
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': { color: '#f1f5f9', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } },
                '& .MuiInputLabel-root': { color: '#94a3b8' }
              }}
            />
            <Box
              sx={{
                display: 'flex', alignItems: 'center', gap: 1,
                p: 1.5, borderRadius: '8px',
                background: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid rgba(99, 102, 241, 0.2)'
              }}
            >
              <EmailIcon sx={{ fontSize: 16, color: '#818cf8' }} />
              <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                A PDF copy of <strong style={{ color: '#c7d2fe' }}>{selectedInvoice?.invoice_number}</strong> will be attached automatically.
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1, gap: 1 }}>
          <Button
            onClick={() => setOpenEmailModal(false)}
            disabled={emailSending}
            variant="outlined"
            sx={{ color: '#94a3b8', borderColor: 'rgba(255,255,255,0.15)' }}
          >
            Cancel
          </Button>
          <Button
            id="send-email-btn"
            onClick={handleSendEmail}
            disabled={emailSending || !emailTo}
            variant="contained"
            startIcon={emailSending ? <CircularProgress size={16} color="inherit" /> : <EmailIcon />}
            sx={{
              background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
              '&:hover': { background: 'linear-gradient(135deg, #4338ca 0%, #4f46e5 100%)' },
              '&:disabled': { opacity: 0.5 }
            }}
          >
            {emailSending ? 'Sending…' : 'Send Invoice'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* EMAIL SUCCESS / ERROR SNACKBAR */}
      <Snackbar
        open={emailSnackbar.open}
        autoHideDuration={5000}
        onClose={() => setEmailSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setEmailSnackbar(prev => ({ ...prev, open: false }))}
          severity={emailSnackbar.severity}
          sx={{ width: '100%', borderRadius: '8px' }}
        >
          {emailSnackbar.message}
        </Alert>
      </Snackbar>

      {/* QUICK CUSTOMER CREATE MODAL */}
      <Dialog
        open={openQuickCustomerModal}
        onClose={() => !quickCustomerLoading && setOpenQuickCustomerModal(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: '12px' }
        }}
      >
        <DialogTitle sx={{ fontWeight: 600, pb: 1, borderBottom: '1px solid #f1f5f9' }}>
          Quick Add New Customer
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {quickCustomerError && <Alert severity="error" sx={{ mb: 2, borderRadius: '8px' }}>{quickCustomerError}</Alert>}
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 1 }}>
            <Box sx={{ gridColumn: 'span 2' }}>
              <TextField
                label="Customer Name"
                fullWidth
                size="small"
                value={quickCustName}
                onChange={(e) => setQuickCustName(e.target.value)}
                required
              />
            </Box>
            <TextField
              label="GSTIN Number"
              fullWidth
              size="small"
              value={quickCustGSTIN}
              onChange={(e) => setQuickCustGSTIN(e.target.value.toUpperCase())}
            />
            <TextField
              label="Phone Number"
              fullWidth
              size="small"
              value={quickCustPhone}
              onChange={(e) => setQuickCustPhone(e.target.value)}
            />
            <Box sx={{ gridColumn: 'span 2' }}>
              <TextField
                label="Email Address"
                fullWidth
                size="small"
                type="email"
                value={quickCustEmail}
                onChange={(e) => setQuickCustEmail(e.target.value)}
              />
            </Box>
            <Box sx={{ gridColumn: 'span 2' }}>
              <TextField
                label="Billing & Shipping Address"
                fullWidth
                size="small"
                multiline
                rows={2}
                value={quickCustAddress}
                onChange={(e) => setQuickCustAddress(e.target.value)}
              />
            </Box>
            <TextField
              label="Opening Balance"
              fullWidth
              size="small"
              type="number"
              value={quickCustOpeningBal}
              onChange={(e) => setQuickCustOpeningBal(e.target.value)}
            />
            <TextField
              select
              label="Balance Type"
              fullWidth
              size="small"
              value={quickCustOpeningBalType}
              onChange={(e) => setQuickCustOpeningBalType(e.target.value)}
            >
              <MenuItem value="Dr">Debit (Dr)</MenuItem>
              <MenuItem value="Cr">Credit (Cr)</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1, gap: 1 }}>
          <Button onClick={() => setOpenQuickCustomerModal(false)} disabled={quickCustomerLoading} variant="outlined">
            Cancel
          </Button>
          <Button 
            onClick={handleSaveQuickCustomer} 
            disabled={quickCustomerLoading || !quickCustName} 
            variant="contained"
            sx={{ color: '#ffffff' }}
          >
            {quickCustomerLoading ? 'Saving...' : 'Save Customer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* QUICK PRODUCT CREATE MODAL */}
      <Dialog
        open={openQuickProductModal}
        onClose={() => !quickProductLoading && setOpenQuickProductModal(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: '12px' }
        }}
      >
        <DialogTitle sx={{ fontWeight: 600, pb: 1, borderBottom: '1px solid #f1f5f9' }}>
          Quick Add New Product
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {quickProductError && <Alert severity="error" sx={{ mb: 2, borderRadius: '8px' }}>{quickProductError}</Alert>}
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 1 }}>
            <Box sx={{ gridColumn: 'span 2' }}>
              <TextField
                label="Product Name"
                fullWidth
                size="small"
                value={quickProductName}
                onChange={(e) => setQuickProductName(e.target.value)}
                required
              />
            </Box>
            <TextField
              label="HSN Code (Optional)"
              fullWidth
              size="small"
              value={quickProductSKU}
              onChange={(e) => setQuickProductSKU(e.target.value)}
            />
            <TextField
              select
              label="Product Type"
              fullWidth
              size="small"
              value={quickProductType}
              onChange={(e) => setQuickProductType(e.target.value)}
            >
              <MenuItem value="RAW">Raw Material (RAW)</MenuItem>
              <MenuItem value="FINISHED">Finished Good (FINISHED)</MenuItem>
              <MenuItem value="COMPONENT">Component / Semi-Finished</MenuItem>
              <MenuItem value="CONSUMABLE">Consumable (CONSUMABLE)</MenuItem>
            </TextField>
            <TextField
              select
              label="Unit of Measure (UOM)"
              fullWidth
              size="small"
              value={quickProductUOM}
              onChange={(e) => setQuickProductUOM(e.target.value)}
            >
              <MenuItem value="KG">Kilograms (KG)</MenuItem>
              <MenuItem value="PCS">Pieces (PCS)</MenuItem>
              <MenuItem value="LTR">Liters (LTR)</MenuItem>
              <MenuItem value="BOX">Boxes (BOX)</MenuItem>
            </TextField>
            <TextField
              label="Tax Rate (%)"
              fullWidth
              size="small"
              type="number"
              value={quickProductTaxRate}
              onChange={(e) => setQuickProductTaxRate(e.target.value)}
            />
            <TextField
              label="Purchase Rate (₹)"
              fullWidth
              size="small"
              type="number"
              value={quickProductPurchasePrice}
              onChange={(e) => setQuickProductPurchasePrice(e.target.value)}
            />
            <TextField
              label="Selling Rate (₹)"
              fullWidth
              size="small"
              type="number"
              value={quickProductSellingPrice}
              onChange={(e) => setQuickProductSellingPrice(e.target.value)}
            />
            <Box sx={{ gridColumn: 'span 2', mt: 1, color: 'text.secondary', fontSize: '0.75rem' }}>
              * Category is not mandatory and will be set to None by default.
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1, gap: 1 }}>
          <Button onClick={() => setOpenQuickProductModal(false)} disabled={quickProductLoading} variant="outlined">
            Cancel
          </Button>
          <Button 
            onClick={handleSaveQuickProduct} 
            disabled={quickProductLoading || !quickProductName} 
            variant="contained"
            sx={{ color: '#ffffff' }}
          >
            {quickProductLoading ? 'Saving...' : 'Save Product'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Sales;
