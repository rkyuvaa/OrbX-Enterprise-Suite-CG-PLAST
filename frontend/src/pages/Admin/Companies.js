import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
  Button, Box, Alert, Typography, Divider, MenuItem, TextField, Grid,
  Dialog, DialogTitle, DialogContent, DialogActions, Paper, Tabs, Tab
} from '@mui/material';
import { Add as AddIcon, Save as SaveIcon, CloudUpload as UploadIcon, Delete as DeleteIcon } from '@mui/icons-material';

import apiClient from '../../api/client';
import PageHeader from '../../components/PageHeader';
import CommonTable from '../../components/CommonTable';
import CommonModal from '../../components/CommonModal';
import FormInput from '../../components/FormInput';

const schema = yup.object().shape({
  name: yup.string().required('Company name is required'),
  code: yup.string().required('Company code is required'),
  address: yup.string().required('Registered address is required'),
  gstin: yup.string().required('GSTIN is required').max(15, 'GSTIN cannot exceed 15 chars'),
  pan: yup.string().nullable(),
  email: yup.string().email('Please enter a valid email').required('Email is required'),
  phone: yup.string().required('Phone number is required'),
  financial_year_start: yup.string().required('FY Start date is required'),
  
  // Bank details
  bank_name: yup.string().nullable(),
  bank_account_no: yup.string().nullable(),
  bank_ifsc_code: yup.string().nullable(),
  bank_branch_location: yup.string().nullable(),
  
  // SMTP credentials
  smtp_host: yup.string().nullable(),
  smtp_port: yup.number().nullable().transform((value) => (isNaN(value) ? null : value)).typeError('SMTP Port must be a number'),
  smtp_user: yup.string().nullable(),
  smtp_password: yup.string().nullable(),
  email_from: yup.string().email('Please enter a valid sender email').nullable(),
  email_subject_template: yup.string().nullable(),
  email_body_template: yup.string().nullable(),

  // Prefixes & Sequences
  so_prefix: yup.string().required('SO prefix is required'),
  so_suffix: yup.string().nullable(),
  so_next_number: yup.number().typeError('Must be a number').required('Sequence is required'),
  invoice_prefix: yup.string().required('Invoice prefix is required'),
  invoice_suffix: yup.string().nullable(),
  invoice_next_number: yup.number().typeError('Must be a number').required('Sequence is required'),
  challan_prefix: yup.string().required('Challan prefix is required'),
  challan_suffix: yup.string().nullable(),
  challan_next_number: yup.number().typeError('Must be a number').required('Sequence is required'),
  po_prefix: yup.string().required('PO prefix is required'),
  po_suffix: yup.string().nullable(),
  po_next_number: yup.number().typeError('Must be a number').required('Sequence is required'),
  grn_prefix: yup.string().required('GRN prefix is required'),
  grn_suffix: yup.string().nullable(),
  grn_next_number: yup.number().typeError('Must be a number').required('Sequence is required'),
  receipt_prefix: yup.string().required('Receipt prefix is required'),
  receipt_suffix: yup.string().nullable(),
  receipt_next_number: yup.number().typeError('Must be a number').required('Sequence is required'),
  
  // Terms
  invoice_terms: yup.string().nullable(),
  invoice_footer: yup.string().nullable(),
});

const Companies = () => {
  const [companies, setCompanies] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [modalTab, setModalTab] = useState(0);
  const [error, setError] = useState(null);

  // Logo upload state
  const [logoUrl, setLogoUrl] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // SMTP test state variables
  const [openTestModal, setOpenTestModal] = useState(false);
  const [testRecipient, setTestRecipient] = useState('');
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [testSuccess, setTestSuccess] = useState(null);
  const [testError, setTestError] = useState(null);

  const { control, handleSubmit, reset, getValues } = useForm({
    resolver: yupResolver(schema),
  });

  const loadCompanies = async () => {
    try {
      const res = await apiClient.get('/admin/companies');
      setCompanies(res.data);
    } catch (err) {
      setError('Failed to load companies list.');
    }
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  const handleOpenAdd = () => {
    setSelectedCompany(null);
    setLogoUrl('');
    setLogoFile(null);
    setModalTab(0);
    reset({
      name: '',
      code: '',
      address: '',
      gstin: '',
      pan: '',
      email: '',
      phone: '',
      financial_year_start: '2026-04-01',
      bank_name: '',
      bank_account_no: '',
      bank_ifsc_code: '',
      bank_branch_location: '',
      smtp_host: '',
      smtp_port: 587,
      smtp_user: '',
      smtp_password: '',
      email_from: '',
      email_subject_template: 'Invoice {invoice_number} from {company_name}',
      email_body_template: 'Dear {customer_name},\n\nPlease find attached Invoice {invoice_number}.\n\nDate: {invoice_date}\nAmount: {amount_due}\n\nThank you.',
      so_prefix: 'SO-',
      so_suffix: '',
      so_next_number: 1,
      invoice_prefix: 'INV-',
      invoice_suffix: '',
      invoice_next_number: 1,
      challan_prefix: 'DC-',
      challan_suffix: '',
      challan_next_number: 1,
      po_prefix: 'PO-',
      po_suffix: '',
      po_next_number: 1,
      grn_prefix: 'GRN-',
      grn_suffix: '',
      grn_next_number: 1,
      receipt_prefix: 'RCPT-',
      receipt_suffix: '',
      receipt_next_number: 1,
      invoice_terms: '1. Payment is due within 15 days of invoice date.\n2. Interest of 1.5% per month will be charged on late payments.',
      invoice_footer: 'Thank you for your business!',
    });
    setOpenModal(true);
  };

  const handleOpenEdit = (comp) => {
    setSelectedCompany(comp);
    setLogoUrl(comp.logo || '');
    setLogoFile(null);
    setModalTab(0);
    reset(comp);
    setOpenModal(true);
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Selected file must be an image.');
      return;
    }

    if (!selectedCompany) {
      setLogoFile(file);
      setLogoUrl(URL.createObjectURL(file));
      return;
    }

    try {
      setUploadingLogo(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', file);

      const res = await apiClient.post(`/admin/companies/${selectedCompany.id}/logo`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setLogoUrl(res.data.logo || '');
      loadCompanies();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to upload logo.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleTestSmtp = () => {
    const values = getValues();
    if (!values.smtp_host || !values.smtp_user || !values.smtp_password || !values.email_from) {
      setError('Please fill in SMTP Host, Username, Password, and Sender Email to run the test.');
      return;
    }
    setTestSuccess(null);
    setTestError(null);
    setTestRecipient('');
    setOpenTestModal(true);
  };

  const submitTestEmail = async () => {
    if (!testRecipient) return;
    setTestingSmtp(true);
    setTestSuccess(null);
    setTestError(null);
    try {
      const values = getValues();
      await apiClient.post('/admin/companies/test-email', {
        smtp_host: values.smtp_host,
        smtp_port: parseInt(values.smtp_port) || 587,
        smtp_user: values.smtp_user,
        smtp_password: values.smtp_password,
        email_from: values.email_from,
        recipient_email: testRecipient,
      });
      setTestSuccess(`Test email sent successfully to ${testRecipient}!`);
    } catch (err) {
      setTestError(err.response?.data?.detail || 'SMTP connection/delivery failed.');
    } finally {
      setTestingSmtp(false);
    }
  };

  const onSubmit = async (data) => {
    try {
      // Exclude logo from regular update payload to avoid overwriting with path string
      const { logo, ...updateData } = data;
      let companyId = selectedCompany?.id;
      
      if (selectedCompany) {
        await apiClient.put(`/admin/companies/${selectedCompany.id}`, updateData);
      } else {
        const res = await apiClient.post('/admin/companies', updateData);
        companyId = res.data.id;
      }
      
      if (logoFile && companyId) {
        setUploadingLogo(true);
        const formData = new FormData();
        formData.append('file', logoFile);
        await apiClient.post(`/admin/companies/${companyId}/logo`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      }

      setOpenModal(false);
      loadCompanies();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save company configuration.');
    }
  };

  const handleToggleActive = async (comp) => {
    try {
      const updatedStatus = !comp.is_active;
      await apiClient.put(`/admin/companies/${comp.id}`, { is_active: updatedStatus });
      loadCompanies();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update company status.');
    }
  };

  const handleDeleteCompany = async (comp) => {
    if (window.confirm(`Are you sure you want to delete "${comp.name}"?`)) {
      try {
        await apiClient.delete(`/admin/companies/${comp.id}`);
        loadCompanies();
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to delete company.');
      }
    }
  };

  const columns = [
    { id: 'code', label: 'Code' },
    { id: 'name', label: 'Company Name' },
    { id: 'gstin', label: 'GSTIN' },
    { id: 'invoice_prefix', label: 'Invoice Prefix' },
    { id: 'invoice_next_number', label: 'Next Invoice No.' },
    { id: 'address', label: 'Address' },
    {
      id: 'is_active',
      label: 'Status',
      render: (row) => (
        <Typography
          variant="caption"
          sx={{
            px: 1,
            py: 0.5,
            borderRadius: '4px',
            fontWeight: 600,
            backgroundColor: row.is_active ? 'rgba(45, 106, 79, 0.1)' : 'rgba(217, 4, 41, 0.1)',
            color: row.is_active ? '#2d6a4f' : '#d90429',
          }}
        >
          {row.is_active ? 'Active' : 'Inactive'}
        </Typography>
      ),
    },
  ];

  const actions = [
    { type: 'edit', label: 'Edit Company Details', onClick: handleOpenEdit },
    {
      type: 'deactivate',
      label: 'Deactivate Company',
      color: 'warning',
      condition: (row) => row.is_active,
      onClick: handleToggleActive
    },
    {
      type: 'activate',
      label: 'Activate Company',
      color: 'success',
      condition: (row) => !row.is_active,
      onClick: handleToggleActive
    },
    {
      label: 'Delete Company',
      color: 'error',
      icon: <DeleteIcon />,
      onClick: handleDeleteCompany
    }
  ];

  return (
    <Box>
      <PageHeader
        title="Companies"
        breadcrumbs={[
          { label: 'Dashboard', to: '/' },
          { label: 'Companies' },
        ]}
      />

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <CommonTable
        columns={columns}
        rows={companies}
        actions={actions}
        searchKey="name"
        tableActions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAdd}>
            Add Company
          </Button>
        }
      />

      <CommonModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        title={selectedCompany ? 'Edit Company Configuration' : 'Add New Company'}
        maxWidth="md"
        actions={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button onClick={() => setOpenModal(false)} variant="outlined">
              Cancel
            </Button>
            <Button type="submit" form="company-config-form" variant="contained">
              Save Company Settings
            </Button>
          </Box>
        }
      >
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs
            value={modalTab}
            onChange={(e, val) => setModalTab(val)}
            textColor="primary"
            indicatorColor="primary"
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="Company Profile" sx={{ fontWeight: 600, textTransform: 'none' }} />
            <Tab label="Document Sequences" sx={{ fontWeight: 600, textTransform: 'none' }} />
            <Tab label="Bank & Terms" sx={{ fontWeight: 600, textTransform: 'none' }} />
            <Tab label="SMTP Email Config" sx={{ fontWeight: 600, textTransform: 'none' }} />
          </Tabs>
        </Box>

        <form id="company-config-form" onSubmit={handleSubmit(onSubmit)}>
          {/* Tab 0: Company Profile & Logo */}
          <Box sx={{ display: modalTab === 0 ? 'block' : 'none' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3, p: 2, border: '1px dashed #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
              <Box sx={{ position: 'relative', width: 90, height: 90, border: '1px solid #cbd5e1', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff', overflow: 'hidden' }}>
                {logoUrl ? (
                  <img src={logoUrl} alt="Company Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', padding: '4px' }} />
                ) : (
                  <Typography variant="caption" color="text.secondary">No Logo</Typography>
                )}
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5, color: '#334155' }}>Company Logo</Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1, lineHeight: 1.3 }}>
                  Horizontal layout, transparent PNG recommended.
                </Typography>
                <Button
                  variant="outlined"
                  component="label"
                  size="small"
                  startIcon={<UploadIcon />}
                  disabled={uploadingLogo}
                >
                  {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={handleLogoUpload}
                  />
                </Button>
              </Box>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <FormInput name="name" control={control} label="Company Legal Name" />
              <FormInput name="code" control={control} label="Company Code" disabled={!!selectedCompany} />
              <FormInput name="gstin" control={control} label="GSTIN Number" />
              <FormInput name="pan" control={control} label="PAN Number (Optional)" />
              <FormInput name="email" control={control} label="Corporate Email" type="email" />
              <FormInput name="phone" control={control} label="Contact Phone Number" />
              <FormInput name="financial_year_start" control={control} label="Financial Year Start (YYYY-MM-DD)" />
              
              <Box sx={{ gridColumn: 'span 2' }}>
                <FormInput name="address" control={control} label="Registered Address" type="textarea" rows={2} />
              </Box>
            </Box>
          </Box>

          {/* Tab 1: Document Sequences */}
          <Box sx={{ display: modalTab === 1 ? 'grid' : 'none', gridTemplateColumns: '1fr', gap: 2.5 }}>
            {/* Sales Order Sequence */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#475569', mb: 1 }}>
                Sales Order (SO) Sequence
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1fr', gap: 2 }}>
                <FormInput name="so_prefix" control={control} label="SO Prefix" />
                <FormInput name="so_suffix" control={control} label="SO Suffix" />
                <FormInput name="so_next_number" control={control} label="Next No." type="number" />
              </Box>
            </Box>

            {/* Invoice Sequence */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#475569', mb: 1.5 }}>
                Tax Invoice (INV) Sequence
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1fr', gap: 2 }}>
                <FormInput name="invoice_prefix" control={control} label="Invoice Prefix" />
                <FormInput name="invoice_suffix" control={control} label="Invoice Suffix" />
                <FormInput name="invoice_next_number" control={control} label="Next No." type="number" />
              </Box>
            </Box>

            {/* Challan Sequence */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#475569', mb: 1.5 }}>
                Delivery Challan (DC) Sequence
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1fr', gap: 2 }}>
                <FormInput name="challan_prefix" control={control} label="Challan Prefix" />
                <FormInput name="challan_suffix" control={control} label="Challan Suffix" />
                <FormInput name="challan_next_number" control={control} label="Next No." type="number" />
              </Box>
            </Box>

            {/* Purchase Order Sequence */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#475569', mb: 1.5 }}>
                Purchase Order (PO) Sequence
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1fr', gap: 2 }}>
                <FormInput name="po_prefix" control={control} label="PO Prefix" />
                <FormInput name="po_suffix" control={control} label="PO Suffix" />
                <FormInput name="po_next_number" control={control} label="Next No." type="number" />
              </Box>
            </Box>

            {/* GRN Sequence */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#475569', mb: 1.5 }}>
                Goods Receipt Note (GRN) Sequence
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1fr', gap: 2 }}>
                <FormInput name="grn_prefix" control={control} label="GRN Prefix" />
                <FormInput name="grn_suffix" control={control} label="GRN Suffix" />
                <FormInput name="grn_next_number" control={control} label="Next No." type="number" />
              </Box>
            </Box>

            {/* Payment Receipt Sequence */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#475569', mb: 1.5 }}>
                Payment Receipt (RCPT) Sequence
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1fr', gap: 2 }}>
                <FormInput name="receipt_prefix" control={control} label="Receipt Prefix" />
                <FormInput name="receipt_suffix" control={control} label="Receipt Suffix" />
                <FormInput name="receipt_next_number" control={control} label="Next No." type="number" />
              </Box>
            </Box>
          </Box>

          {/* Tab 2: Bank & Terms */}
          <Box sx={{ display: modalTab === 2 ? 'block' : 'none' }}>
            <Typography variant="subtitle1" color="primary.main" sx={{ fontWeight: 700, mb: 1 }}>
              Bank Account Details (Printed on Invoice Copy)
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 4 }}>
              <FormInput name="bank_name" control={control} label="Bank Name" />
              <FormInput name="bank_account_no" control={control} label="Bank Account Number" />
              <FormInput name="bank_ifsc_code" control={control} label="IFSC Code" />
              <FormInput name="bank_branch_location" control={control} label="Bank Branch Location" />
            </Box>

            <Typography variant="subtitle1" color="primary.main" sx={{ fontWeight: 700, mb: 1 }}>
              Invoice Prints Legal Footer Notes
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FormInput name="invoice_terms" control={control} label="Invoice Terms & Conditions" type="textarea" rows={2} />
              <FormInput name="invoice_footer" control={control} label="Invoice Footer Note" />
            </Box>
          </Box>

          {/* Tab 3: SMTP Email config */}
          <Box sx={{ display: modalTab === 3 ? 'block' : 'none' }}>
            <Typography variant="subtitle1" color="primary.main" sx={{ fontWeight: 700, mb: 1 }}>
              SMTP Email Configurations
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 2 }}>
              <FormInput name="smtp_host" control={control} label="SMTP Server Host" />
              <FormInput name="smtp_port" control={control} label="SMTP Port" type="number" />
              <FormInput name="smtp_user" control={control} label="SMTP Username" />
              <FormInput name="smtp_password" control={control} label="SMTP Password" type="password" />
              <Box sx={{ gridColumn: 'span 2' }}>
                <FormInput name="email_from" control={control} label="Email Sender (From Address)" />
              </Box>
            </Box>

            <Box sx={{ display: 'flex', mb: 3 }}>
              <Button variant="outlined" color="secondary" onClick={handleTestSmtp} size="small">
                Test SMTP Credentials
              </Button>
            </Box>

            <Typography variant="subtitle1" color="primary.main" sx={{ fontWeight: 700, mb: 1 }}>
              Email Templates
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FormInput name="email_subject_template" control={control} label="Default Invoice Email Subject" />
              <FormInput name="email_body_template" control={control} label="Default Invoice Email Body Template" type="textarea" rows={4} />
            </Box>
          </Box>
        </form>
      </CommonModal>

      {/* SMTP CONNECTION TEST MODAL */}
      <Dialog
        open={openTestModal}
        onClose={() => !testingSmtp && setOpenTestModal(false)}
        maxWidth="xs"
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
        <DialogTitle sx={{ borderBottom: '1px solid rgba(255,255,255,0.08)', pb: 2, color: '#f1f5f9', fontWeight: 600 }}>
          Test SMTP Connection
        </DialogTitle>
        <DialogContent sx={{ pt: 3, pb: 1 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {testError && <Alert severity="error" sx={{ borderRadius: '8px' }}>{testError}</Alert>}
            {testSuccess && <Alert severity="success" sx={{ borderRadius: '8px' }}>{testSuccess}</Alert>}
            
            <Typography variant="body2" sx={{ color: '#94a3b8', mb: 1 }}>
              Enter a recipient email address to send a test message using your current SMTP form configurations.
            </Typography>
            
            <TextField
              id="test-recipient"
              label="Recipient Email"
              fullWidth
              size="small"
              value={testRecipient}
              onChange={(e) => setTestRecipient(e.target.value)}
              placeholder="test@example.com"
              sx={{
                '& .MuiOutlinedInput-root': { color: '#f1f5f9', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } },
                '& .MuiInputLabel-root': { color: '#94a3b8' }
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1, gap: 1 }}>
          <Button
            onClick={() => setOpenTestModal(false)}
            disabled={testingSmtp}
            variant="outlined"
            sx={{ color: '#94a3b8', borderColor: 'rgba(255,255,255,0.15)' }}
          >
            Close
          </Button>
          <Button
            onClick={submitTestEmail}
            disabled={testingSmtp || !testRecipient}
            variant="contained"
            sx={{
              background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
              '&:hover': { background: 'linear-gradient(135deg, #4338ca 0%, #4f46e5 100%)' }
            }}
          >
            {testingSmtp ? 'Testing...' : 'Send Test Email'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Companies;
