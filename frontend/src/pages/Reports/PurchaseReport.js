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

const PurchaseReport = () => {
  const { activeBranchId } = useSelector((state) => state.branch);
  const [pos, setPos] = useState([]);
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
      const res = await apiClient.get(`/purchase/po${query}`);
      const sRes = await apiClient.get('/suppliers/');
      const pRes = await apiClient.get('/products/');
      const brRes = await apiClient.get('/admin/companies');

      const rawPos = res.data;
      const rawSuppliers = sRes.data;
      const rawProducts = pRes.data;
      const activeBr = brRes.data.find(b => b.id === activeBranchId);

      setPos(rawPos);

      // Flatten PO items into report rows
      const items = [];
      rawPos.forEach((po) => {
        const supplier = rawSuppliers.find((sup) => sup.id === po.supplier_id);
        const companyState = activeBr?.state_code || (activeBr?.gstin ? activeBr.gstin.substring(0, 2) : '22');
        const supplierState = supplier?.gstin ? supplier.gstin.substring(0, 2) : '';
        const isIntrastate = !supplierState || companyState === supplierState;

        po.items.forEach((item) => {
          const product = rawProducts.find((p) => p.id === item.product_id);
          const taxableVal = item.qty * item.rate;
          const cgstPct = isIntrastate ? item.tax_rate / 2 : 0;
          const cgstAmt = isIntrastate ? item.tax_amount / 2 : 0;
          const sgstPct = isIntrastate ? item.tax_rate / 2 : 0;
          const sgstAmt = isIntrastate ? item.tax_amount / 2 : 0;
          const igstPct = !isIntrastate ? item.tax_rate : 0;
          const igstAmt = !isIntrastate ? item.tax_amount : 0;

          items.push({
            po_number: po.po_number || `PO-${po.id.substring(0, 6).toUpperCase()}`,
            date: po.date,
            supplier_name: supplier?.name || 'N/A',
            supplier_gstin: supplier?.gstin || 'N/A',
            place_of_supply: supplier?.address || 'N/A',
            hsn_code: product?.hsn_code || 'N/A',
            description: item.product_name || 'N/A',
            taxable_value: taxableVal,
            discount: 0,
            cgst_pct: cgstPct,
            cgst_amount: cgstAmt,
            sgst_pct: sgstPct,
            sgst_amount: sgstAmt,
            igst_pct: igstPct,
            igst_amount: igstAmt,
            total_tax: item.tax_amount,
            total_invoice: po.grand_total
          });
        });
      });
      setFlatItems(items);
    } catch (err) {
      setError('Failed to fetch purchase reports.');
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
      'PO Number', 'Order Date', 'Supplier Name', 'GSTIN', 'Place of Supply',
      'HSN/SAC', 'Description', 'Taxable Value', 'Discount', 'CGST %', 'CGST Amt',
      'SGST %', 'SGST Amt', 'IGST %', 'IGST Amt', 'Total Tax', 'Total Invoice'
    ];

    const rows = flatItems.map((item) => [
      item.po_number,
      new Date(item.date).toLocaleDateString(),
      item.supplier_name,
      item.supplier_gstin,
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
    link.setAttribute('download', `PurchaseReport_${startDate}_to_${endDate}.csv`);
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
        title="Purchase Reports"
        breadcrumbs={[
          { label: 'Dashboard', to: '/' },
          { label: 'Purchase Reports' },
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
                <TableCell sx={{ backgroundColor: '#1b4332', color: '#ffffff', fontWeight: 600, minWidth: 120 }}>PO Number</TableCell>
                <TableCell sx={{ backgroundColor: '#1b4332', color: '#ffffff', fontWeight: 600, minWidth: 100 }}>Order Date</TableCell>
                <TableCell sx={{ backgroundColor: '#1b4332', color: '#ffffff', fontWeight: 600, minWidth: 150 }}>Supplier Vendor</TableCell>
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
                    <TableCell sx={{ fontWeight: 500 }}>{row.po_number}</TableCell>
                    <TableCell>{new Date(row.date).toLocaleDateString()}</TableCell>
                    <TableCell>{row.supplier_name}</TableCell>
                    <TableCell>{row.supplier_gstin}</TableCell>
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

export default PurchaseReport;
