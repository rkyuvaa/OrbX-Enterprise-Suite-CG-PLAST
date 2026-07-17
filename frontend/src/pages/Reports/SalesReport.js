import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  Box, Button, Alert, Typography, Grid, TextField, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableFooter,
  CircularProgress
} from '@mui/material';
import { FileDownload as ExportIcon } from '@mui/icons-material';

import apiClient from '../../api/client';
import PageHeader from '../../components/PageHeader';

const SalesReport = () => {
  const { activeBranchId } = useSelector((state) => state.branch);
  const [invoices, setInvoices] = useState([]);
  const [flatItems, setFlatItems] = useState([]);
  const [startDate, setStartDate] = useState('2026-05-01');
  const [endDate, setEndDate] = useState('2026-06-30');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const query = activeBranchId ? `?company_id=${activeBranchId}` : '';
      const res = await apiClient.get(`/sales/invoices${query}`);
      const rawInvoices = res.data;
      setInvoices(rawInvoices);

      // Flatten into item rows
      const items = [];
      rawInvoices.forEach((inv) => {
        const isIntrastate = (inv.gst_breakup?.cgst > 0) || (inv.gst_breakup?.sgst > 0) || !(inv.gst_breakup?.igst > 0);

        inv.items.forEach((item) => {
          const taxableVal = (item.qty * item.rate) - item.discount_amount;
          const cgstPct = isIntrastate ? item.tax_rate / 2 : 0;
          const cgstAmt = isIntrastate ? item.tax_amount / 2 : 0;
          const sgstPct = isIntrastate ? item.tax_rate / 2 : 0;
          const sgstAmt = isIntrastate ? item.tax_amount / 2 : 0;
          const igstPct = !isIntrastate ? item.tax_rate : 0;
          const igstAmt = !isIntrastate ? item.tax_amount : 0;

          items.push({
            invoice_number: inv.invoice_number,
            date: inv.date,
            customer_name: inv.customer_name || 'N/A',
            customer_gstin: inv.customer_gstin || 'N/A',
            place_of_supply: inv.customer_billing_address || 'N/A',
            hsn_code: item.hsn_code || 'N/A',
            description: item.product_name || 'N/A',
            taxable_value: taxableVal,
            discount: item.discount_amount,
            cgst_pct: cgstPct,
            cgst_amount: cgstAmt,
            sgst_pct: sgstPct,
            sgst_amount: sgstAmt,
            igst_pct: igstPct,
            igst_amount: igstAmt,
            total_tax: item.tax_amount,
            total_invoice: inv.total_amount
          });
        });
      });
      setFlatItems(items);
    } catch (err) {
      setError('Failed to fetch sales reports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [activeBranchId]);

  // Compute column totals
  const totals = flatItems.reduce((acc, row) => {
    acc.taxable_value += row.taxable_value || 0;
    acc.discount += row.discount || 0;
    acc.cgst_amount += row.cgst_amount || 0;
    acc.sgst_amount += row.sgst_amount || 0;
    acc.igst_amount += row.igst_amount || 0;
    acc.total_tax += row.total_tax || 0;
    acc.total_invoice += row.total_invoice || 0;
    return acc;
  }, {
    taxable_value: 0,
    discount: 0,
    cgst_amount: 0,
    sgst_amount: 0,
    igst_amount: 0,
    total_tax: 0,
    total_invoice: 0
  });

  const handleExportCSV = () => {
    if (flatItems.length === 0) return;

    const headers = [
      'Invoice Number', 'Billing Date', 'Customer Name', 'GSTIN', 'Place of Supply',
      'HSN/SAC', 'Description', 'Taxable Value', 'Discount', 'CGST %', 'CGST Amt',
      'SGST %', 'SGST Amt', 'IGST %', 'IGST Amt', 'Total Tax', 'Total Invoice'
    ];

    const rows = flatItems.map((item) => [
      item.invoice_number,
      new Date(item.date).toLocaleDateString(),
      item.customer_name,
      item.customer_gstin,
      item.place_of_supply.replace(/,/g, ' '),
      item.hsn_code,
      item.description.replace(/,/g, ' '),
      item.taxable_value.toFixed(2),
      item.discount.toFixed(2),
      `${item.cgst_pct}%`,
      item.cgst_amount.toFixed(2),
      `${item.sgst_pct}%`,
      item.sgst_amount.toFixed(2),
      `${item.igst_pct}%`,
      item.igst_amount.toFixed(2),
      item.total_tax.toFixed(2),
      item.total_invoice.toFixed(2)
    ]);

    // Append total row to CSV
    rows.push([
      'TOTAL', '', '', '', '', '', '',
      totals.taxable_value.toFixed(2),
      totals.discount.toFixed(2),
      '',
      totals.cgst_amount.toFixed(2),
      '',
      totals.sgst_amount.toFixed(2),
      '',
      totals.igst_amount.toFixed(2),
      totals.total_tax.toFixed(2),
      totals.total_invoice.toFixed(2)
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SalesReport_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(val);
  };

  return (
    <Box>
      <PageHeader
        title="Sales Reports"
        breadcrumbs={[
          { label: 'Dashboard', to: '/' },
          { label: 'Sales Reports' },
        ]}
        actions={
          <Button variant="contained" startIcon={<ExportIcon />} onClick={handleExportCSV} disabled={flatItems.length === 0 || loading}>
            Export to CSV
          </Button>
        }
      />

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 3, mb: 3, borderRadius: '12px' }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} sm={4}>
            <TextField
              label="Start Date"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              label="End Date"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <Button variant="outlined" fullWidth onClick={loadReport} sx={{ py: 1.5 }} disabled={loading}>
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Apply Date Filters'}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ width: '100%', overflow: 'hidden', borderRadius: '12px' }}>
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ backgroundColor: '#1b4332', color: '#ffffff', fontWeight: 600, minWidth: 120 }}>Invoice No.</TableCell>
                <TableCell sx={{ backgroundColor: '#1b4332', color: '#ffffff', fontWeight: 600, minWidth: 100 }}>Billing Date</TableCell>
                <TableCell sx={{ backgroundColor: '#1b4332', color: '#ffffff', fontWeight: 600, minWidth: 150 }}>Customer Name</TableCell>
                <TableCell sx={{ backgroundColor: '#1b4332', color: '#ffffff', fontWeight: 600, minWidth: 130 }}>GSTIN</TableCell>
                <TableCell sx={{ backgroundColor: '#1b4332', color: '#ffffff', fontWeight: 600, minWidth: 160 }}>Place of Supply</TableCell>
                <TableCell sx={{ backgroundColor: '#1b4332', color: '#ffffff', fontWeight: 600, minWidth: 110 }}>HSN/SAC</TableCell>
                <TableCell sx={{ backgroundColor: '#1b4332', color: '#ffffff', fontWeight: 600, minWidth: 160 }}>Description</TableCell>
                <TableCell align="right" sx={{ backgroundColor: '#1b4332', color: '#ffffff', fontWeight: 600, minWidth: 120 }}>Taxable Value</TableCell>
                <TableCell align="right" sx={{ backgroundColor: '#1b4332', color: '#ffffff', fontWeight: 600, minWidth: 100 }}>Discount</TableCell>
                <TableCell align="right" sx={{ backgroundColor: '#1b4332', color: '#ffffff', fontWeight: 600, minWidth: 80 }}>CGST %</TableCell>
                <TableCell align="right" sx={{ backgroundColor: '#1b4332', color: '#ffffff', fontWeight: 600, minWidth: 110 }}>CGST Amt</TableCell>
                <TableCell align="right" sx={{ backgroundColor: '#1b4332', color: '#ffffff', fontWeight: 600, minWidth: 80 }}>SGST %</TableCell>
                <TableCell align="right" sx={{ backgroundColor: '#1b4332', color: '#ffffff', fontWeight: 600, minWidth: 110 }}>SGST Amt</TableCell>
                <TableCell align="right" sx={{ backgroundColor: '#1b4332', color: '#ffffff', fontWeight: 600, minWidth: 80 }}>IGST %</TableCell>
                <TableCell align="right" sx={{ backgroundColor: '#1b4332', color: '#ffffff', fontWeight: 600, minWidth: 110 }}>IGST Amt</TableCell>
                <TableCell align="right" sx={{ backgroundColor: '#1b4332', color: '#ffffff', fontWeight: 600, minWidth: 110 }}>Total Tax</TableCell>
                <TableCell align="right" sx={{ backgroundColor: '#1b4332', color: '#ffffff', fontWeight: 600, minWidth: 130 }}>Total Invoice</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {flatItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={17} align="center" sx={{ py: 6 }}>
                    {loading ? (
                      <CircularProgress size={36} sx={{ color: '#1b4332' }} />
                    ) : (
                      <Typography color="text.secondary">No records found for the selected date range.</Typography>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                flatItems.map((row, idx) => (
                  <TableRow hover key={idx} sx={{ backgroundColor: idx % 2 === 1 ? '#f8fafc' : '#ffffff' }}>
                    <TableCell sx={{ fontWeight: 500 }}>{row.invoice_number}</TableCell>
                    <TableCell>{new Date(row.date).toLocaleDateString()}</TableCell>
                    <TableCell>{row.customer_name}</TableCell>
                    <TableCell>{row.customer_gstin}</TableCell>
                    <TableCell>{row.place_of_supply}</TableCell>
                    <TableCell>{row.hsn_code}</TableCell>
                    <TableCell>{row.description}</TableCell>
                    <TableCell align="right">{formatCurrency(row.taxable_value)}</TableCell>
                    <TableCell align="right">{formatCurrency(row.discount)}</TableCell>
                    <TableCell align="right">{row.cgst_pct}%</TableCell>
                    <TableCell align="right">{formatCurrency(row.cgst_amount)}</TableCell>
                    <TableCell align="right">{row.sgst_pct}%</TableCell>
                    <TableCell align="right">{formatCurrency(row.sgst_amount)}</TableCell>
                    <TableCell align="right">{row.igst_pct}%</TableCell>
                    <TableCell align="right">{formatCurrency(row.igst_amount)}</TableCell>
                    <TableCell align="right">{formatCurrency(row.total_tax)}</TableCell>
                    <TableCell align="right">{formatCurrency(row.total_invoice)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            {flatItems.length > 0 && (
              <TableFooter>
                <TableRow sx={{ backgroundColor: '#e2e8f0' }}>
                  <TableCell colSpan={7} align="center" sx={{ fontWeight: 800, color: '#0f172a' }}>TOTAL</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, color: '#0f172a' }}>{formatCurrency(totals.taxable_value)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, color: '#0f172a' }}>{formatCurrency(totals.discount)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, color: '#0f172a' }}>-</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, color: '#0f172a' }}>{formatCurrency(totals.cgst_amount)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, color: '#0f172a' }}>-</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, color: '#0f172a' }}>{formatCurrency(totals.sgst_amount)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, color: '#0f172a' }}>-</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, color: '#0f172a' }}>{formatCurrency(totals.igst_amount)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, color: '#0f172a' }}>{formatCurrency(totals.total_tax)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, color: '#0f172a' }}>{formatCurrency(totals.total_invoice)}</TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default SalesReport;
