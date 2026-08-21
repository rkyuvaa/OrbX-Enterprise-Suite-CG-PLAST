import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useReactToPrint } from 'react-to-print';
import {
  Box, Button, Card, CardContent, Grid, Typography, Alert,
  Divider, TextField, Autocomplete, Paper, Table, TableHead,
  TableRow, TableCell, TableBody, TableContainer, ToggleButton,
  ToggleButtonGroup, CircularProgress
} from '@mui/material';
import {
  Print as PrintIcon,
  FileDownload as ExportIcon,
  Search as SearchIcon,
  AccountBalanceWallet as BalanceIcon,
  Receipt as ReceiptIcon,
  CheckCircle as PaidIcon,
  AddCard as AdditionalIcon,
  Person as CustomerIcon,
  LocalShipping as SupplierIcon,
  Save as SaveIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';

import apiClient from '../../api/client';
import CommonTable from '../../components/CommonTable';

const MyLedger = () => {
  const { activeBranchId } = useSelector((state) => state.branch);

  const [partyType, setPartyType] = useState('CUSTOMER'); // 'CUSTOMER' or 'SUPPLIER'
  const [parties, setParties] = useState([]);
  const [selectedParty, setSelectedParty] = useState(null);

  const [startMonth, setStartMonth] = useState('');
  const [endMonth, setEndMonth] = useState('');

  const [ledgerData, setLedgerData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [company, setCompany] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [savingKey, setSavingKey] = useState(null);
  const [modifiedKeys, setModifiedKeys] = useState({});

  const printRef = useRef();

  // Load parties list when partyType changes
  const loadParties = async () => {
    try {
      setSelectedParty(null);
      setLedgerData(null);
      setTransactions([]);
      setModifiedKeys({});
      if (partyType === 'CUSTOMER') {
        const res = await apiClient.get('/customers/');
        setParties(res.data.filter(c => c.is_active !== false));
      } else {
        const res = await apiClient.get('/suppliers/');
        setParties(res.data.filter(s => s.is_active !== false));
      }

      const compRes = await apiClient.get('/admin/companies');
      if (activeBranchId) {
        const activeBr = compRes.data.find(b => b.id === activeBranchId);
        setCompany(activeBr || (compRes.data.length > 0 ? compRes.data[0] : null));
      } else {
        setCompany(compRes.data.length > 0 ? compRes.data[0] : null);
      }
    } catch (err) {
      setError('Failed to initialize party list for My Ledger.');
    }
  };

  useEffect(() => {
    loadParties();
  }, [partyType, activeBranchId]);

  // Recalculate running balance & totals dynamically across transactions
  const recalculateLedger = (txList) => {
    let runningBalance = 0.0;
    let totalDebit = 0.0;
    let totalCredit = 0.0;
    let totalAdditional = 0.0;

    const updatedTx = txList.map((tx) => {
      const debit = parseFloat(tx.debit) || 0.0;
      const credit = parseFloat(tx.credit) || 0.0;
      const addAmt = parseFloat(tx.additional_amount) || 0.0;

      totalDebit += debit;
      totalCredit += credit;
      totalAdditional += addAmt;

      runningBalance = runningBalance + debit - credit + addAmt;

      return {
        ...tx,
        running_balance: parseFloat(runningBalance.toFixed(2))
      };
    });

    return {
      updatedTx,
      totalDebit: parseFloat(totalDebit.toFixed(2)),
      totalCredit: parseFloat(totalCredit.toFixed(2)),
      totalAdditional: parseFloat(totalAdditional.toFixed(2)),
      grandTotal: parseFloat(runningBalance.toFixed(2))
    };
  };

  // Fetch My Ledger data from API
  const handleSearch = async () => {
    if (!selectedParty) {
      setError(`Please select a ${partyType === 'CUSTOMER' ? 'customer' : 'supplier'} first.`);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      let url = `/reports/my-ledger?party_type=${partyType}&party_id=${selectedParty.id}`;
      if (startMonth) url += `&start_date=${startMonth}`;
      if (endMonth) url += `&end_date=${endMonth}`;
      if (activeBranchId) url += `&company_id=${activeBranchId}`;

      const res = await apiClient.get(url);
      setLedgerData(res.data);
      setTransactions(res.data.transactions || []);
      setModifiedKeys({});
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load My Ledger report.');
      setLedgerData(null);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedParty) {
      handleSearch();
    } else {
      setLedgerData(null);
      setTransactions([]);
    }
  }, [selectedParty, startMonth, endMonth, activeBranchId]);

  // Handle local change in Additional Amount
  const handleAdditionalAmountChange = (txKey, value) => {
    setModifiedKeys((prev) => ({ ...prev, [txKey]: true }));
    setTransactions((prevTx) => {
      const newTxList = prevTx.map((item) => {
        if (item.tx_key === txKey) {
          return { ...item, additional_amount: value }; // Keep string in input for easy editing
        }
        return item;
      });

      const { updatedTx, totalDebit, totalCredit, totalAdditional, grandTotal } = recalculateLedger(newTxList);

      setLedgerData((prev) => ({
        ...prev,
        total_debit: totalDebit,
        total_credit: totalCredit,
        total_additional_amount: totalAdditional,
        grand_total: grandTotal
      }));

      return updatedTx;
    });
  };

  // Persist additional amount to backend on save button click
  const handleSaveAdditionalAmount = async (tx) => {
    if (!selectedParty) return;
    const addAmt = parseFloat(tx.additional_amount) || 0.0;
    setSavingKey(tx.tx_key);
    try {
      await apiClient.post('/reports/my-ledger/adjustment', {
        party_type: partyType,
        party_id: selectedParty.id,
        tx_key: tx.tx_key,
        tx_type: tx.tx_type,
        reference_no: tx.reference_no,
        additional_amount: addAmt,
        company_id: activeBranchId || null
      });
      setModifiedKeys((prev) => {
        const next = { ...prev };
        delete next[tx.tx_key];
        return next;
      });
    } catch (err) {
      setError('Failed to save additional amount change.');
    } finally {
      setSavingKey(null);
    }
  };

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
  });

  const handleExportCSV = () => {
    if (!transactions || transactions.length === 0) return;

    const headers = ['Date', 'Reference No', 'Description', 'Debit (₹)', 'Credit (₹)', 'Additional Amount (₹)', 'Balance (₹)'];
    const rows = transactions.map((tx) => [
      new Date(tx.date).toLocaleDateString('en-IN'),
      tx.reference_no,
      tx.tx_type,
      (tx.debit || 0).toFixed(2),
      (tx.credit || 0).toFixed(2),
      (parseFloat(tx.additional_amount) || 0).toFixed(2),
      (tx.running_balance || 0).toFixed(2),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `MyLedger_${partyType}_${selectedParty?.name?.replace(/\s+/g, '_')}_${startMonth || 'all'}_to_${endMonth || 'all'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columns = [
    {
      id: 'date',
      label: 'Date',
      render: (row) => new Date(row.date).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    },
    { id: 'reference_no', label: 'Reference No', render: (row) => <strong>{row.reference_no}</strong> },
    { id: 'tx_type', label: 'Description' },
    { id: 'debit', label: 'Debit (₹)', render: (row) => row.debit > 0 ? `₹${row.debit.toFixed(2)}` : '-' },
    { id: 'credit', label: 'Credit (₹)', render: (row) => row.credit > 0 ? `₹${row.credit.toFixed(2)}` : '-' },
    {
      id: 'additional_amount',
      label: 'Additional Amount (₹)',
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TextField
            type="number"
            size="small"
            value={row.additional_amount !== undefined ? row.additional_amount : 0}
            onChange={(e) => handleAdditionalAmountChange(row.tx_key, e.target.value)}
            placeholder="0.00"
            sx={{
              width: 100,
              '& .MuiInputBase-input': {
                py: 0.5,
                px: 1,
                textAlign: 'right',
                fontWeight: 600,
                color: (parseFloat(row.additional_amount) || 0) !== 0 ? '#b45309' : 'inherit'
              }
            }}
          />
          {savingKey === row.tx_key ? (
            <CircularProgress size={16} />
          ) : modifiedKeys[row.tx_key] ? (
            <Button
              variant="contained"
              color="success"
              size="small"
              onClick={() => handleSaveAdditionalAmount(row)}
              startIcon={<SaveIcon sx={{ fontSize: '0.85rem !important' }} />}
              sx={{
                py: 0.25,
                px: 1,
                minWidth: '55px',
                fontSize: '0.7rem',
                fontWeight: 700,
                textTransform: 'none',
                borderRadius: '4px',
                backgroundColor: '#10b981',
                '&:hover': { backgroundColor: '#059669' }
              }}
            >
              Save
            </Button>
          ) : (
            <CheckCircleIcon sx={{ color: '#10b981', fontSize: 18 }} titleAccess="Saved successfully" />
          )}
        </Box>
      )
    },
    {
      id: 'running_balance',
      label: 'Balance (₹)',
      render: (row) => (
        <Typography variant="body2" sx={{ fontWeight: 700, color: row.running_balance > 0 ? '#1e293b' : '#2d6a4f' }}>
          ₹{(row.running_balance || 0).toFixed(2)}
        </Typography>
      )
    }
  ];

  return (
    <Box>
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Control Filters Card */}
      <Card sx={{ mb: 4, borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
              My Ledger Statement Filters
            </Typography>

            <ToggleButtonGroup
              value={partyType}
              exclusive
              onChange={(e, nextVal) => nextVal && setPartyType(nextVal)}
              size="small"
              color="primary"
            >
              <ToggleButton value="CUSTOMER" sx={{ px: 2, fontWeight: 600 }}>
                <CustomerIcon sx={{ mr: 1, fontSize: 18 }} /> Customer Ledger
              </ToggleButton>
              <ToggleButton value="SUPPLIER" sx={{ px: 2, fontWeight: 600 }}>
                <SupplierIcon sx={{ mr: 1, fontSize: 18 }} /> Vendor / Supplier Ledger
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={5}>
              <Autocomplete
                options={parties}
                getOptionLabel={(option) => `${option.name} (${option.code || option.gstin || 'N/A'})`}
                value={selectedParty}
                onChange={(event, newValue) => setSelectedParty(newValue)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={`Select ${partyType === 'CUSTOMER' ? 'Customer' : 'Vendor / Supplier'}`}
                    variant="outlined"
                    size="small"
                    fullWidth
                  />
                )}
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField
                type="month"
                label="Start Month (YYYY-MM)"
                value={startMonth}
                onChange={(e) => setStartMonth(e.target.value)}
                size="small"
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField
                type="month"
                label="End Month (YYYY-MM)"
                value={endMonth}
                onChange={(e) => setEndMonth(e.target.value)}
                size="small"
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={1}>
              <Button
                variant="contained"
                onClick={handleSearch}
                fullWidth
                sx={{ height: 40 }}
              >
                <SearchIcon />
              </Button>
            </Grid>
          </Grid>

          {/* Selected Party Details Banner */}
          {selectedParty && (
            <Box sx={{ mt: 3, p: 2, backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: '#475569' }}>
                {partyType === 'CUSTOMER' ? 'Customer' : 'Supplier'} Contact & Details
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={3}>
                  <Typography variant="caption" color="textSecondary" display="block">Name</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedParty.name}</Typography>
                </Grid>
                <Grid item xs={6} sm={2}>
                  <Typography variant="caption" color="textSecondary" display="block">GSTIN</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedParty.gstin || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={6} sm={2}>
                  <Typography variant="caption" color="textSecondary" display="block">Phone</Typography>
                  <Typography variant="body2">{selectedParty.phone || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12} sm={5}>
                  <Typography variant="caption" color="textSecondary" display="block">Address</Typography>
                  <Typography variant="body2">{selectedParty.billing_address || selectedParty.address || 'N/A'}</Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* KPI Summary Cards & Table */}
      {ledgerData && (
        <Box>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {/* KPI 1: Debit */}
            <Grid item xs={12} sm={3}>
              <Card sx={{
                borderRadius: '12px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                background: 'linear-gradient(135deg, #1b4332 0%, #2d6a4f 100%)',
                color: '#ffffff'
              }}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 3 }}>
                  <Box>
                    <Typography variant="body2" sx={{ opacity: 0.85, fontWeight: 500 }}>Total Debit</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5 }}>₹{(ledgerData.total_debit || 0).toFixed(2)}</Typography>
                  </Box>
                  <ReceiptIcon sx={{ fontSize: 36, opacity: 0.3 }} />
                </CardContent>
              </Card>
            </Grid>

            {/* KPI 2: Credit */}
            <Grid item xs={12} sm={3}>
              <Card sx={{
                borderRadius: '12px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                background: 'linear-gradient(135deg, #028090 0%, #00a896 100%)',
                color: '#ffffff'
              }}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 3 }}>
                  <Box>
                    <Typography variant="body2" sx={{ opacity: 0.85, fontWeight: 500 }}>Total Credit</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5 }}>₹{(ledgerData.total_credit || 0).toFixed(2)}</Typography>
                  </Box>
                  <PaidIcon sx={{ fontSize: 36, opacity: 0.3 }} />
                </CardContent>
              </Card>
            </Grid>

            {/* KPI 3: Additional Amount Total */}
            <Grid item xs={12} sm={3}>
              <Card sx={{
                borderRadius: '12px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                background: 'linear-gradient(135deg, #b45309 0%, #d97706 100%)',
                color: '#ffffff'
              }}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 3 }}>
                  <Box>
                    <Typography variant="body2" sx={{ opacity: 0.85, fontWeight: 500 }}>Total Additional Amt</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5 }}>₹{(ledgerData.total_additional_amount || 0).toFixed(2)}</Typography>
                  </Box>
                  <AdditionalIcon sx={{ fontSize: 36, opacity: 0.3 }} />
                </CardContent>
              </Card>
            </Grid>

            {/* KPI 4: Grand Total */}
            <Grid item xs={12} sm={3}>
              <Card sx={{
                borderRadius: '12px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                background: 'linear-gradient(135deg, #0f172a 0%, #334155 100%)',
                color: '#ffffff'
              }}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 3 }}>
                  <Box>
                    <Typography variant="body2" sx={{ opacity: 0.85, fontWeight: 500 }}>Grand Total / Balance</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, color: '#facc15' }}>₹{(ledgerData.grand_total || 0).toFixed(2)}</Typography>
                  </Box>
                  <BalanceIcon sx={{ fontSize: 36, opacity: 0.3 }} />
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Ledger Table Container */}
          <CommonTable
            columns={columns}
            rows={transactions}
            searchKey="reference_no"
            searchPlaceholder="Search transactions..."
            tableActions={
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button variant="outlined" startIcon={<ExportIcon />} onClick={handleExportCSV}>
                  Export CSV
                </Button>
                <Button variant="contained" startIcon={<PrintIcon />} onClick={handlePrint}>
                  Print Statement
                </Button>
              </Box>
            }
          />
        </Box>
      )}

      {/* Hidden Printable Statement Document */}
      <div style={{ display: 'none' }}>
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
          <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 2, minHeight: 90 }}>
            {company?.logo && (
              <Box
                component="img"
                src={company.logo}
                alt="Company Logo"
                sx={{
                  position: 'absolute',
                  left: 0,
                  maxHeight: 90,
                  maxWidth: 90,
                  objectFit: 'contain',
                  '@media print': { printColorAdjust: 'exact' }
                }}
              />
            )}
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#1b4332' }}>
                {company?.name || 'ORBX Corporation'}
              </Typography>
              <Typography variant="body2" sx={{ color: '#475569', whiteSpace: 'pre-line' }}>
                {company?.address || 'ORBX Head Office'}
                {company?.phone && `\nPhone: ${company.phone}`}
                {company?.gstin && `\nGSTIN: ${company.gstin}`}
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ mb: 3, borderBottomWidth: 2 }} />

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Box sx={{ textAlign: 'right' }}>
              <Typography sx={{ fontSize: '1.25rem', fontWeight: 800, color: '#334155', lineHeight: 1.2 }}>
                MY LEDGER STATEMENT ({partyType})
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '0.85rem', color: '#64748b', mt: 0.5 }}>
                Period: <strong>{startMonth || 'Beginning'} to {endMonth || 'Present'}</strong>
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ mb: 3, borderBottomWidth: 2 }} />

          <Grid container spacing={2} sx={{ mb: 4 }}>
            <Grid item xs={6}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#64748b', textTransform: 'uppercase', mb: 1 }}>
                STATEMENT FOR:
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 700 }}>
                {selectedParty?.name}
              </Typography>
              <Typography variant="body2" sx={{ color: '#334155', whiteSpace: 'pre-line' }}>
                {selectedParty?.billing_address || selectedParty?.address}
                {selectedParty?.phone && `\nPhone: ${selectedParty.phone}`}
                {selectedParty?.gstin && `\nGSTIN: ${selectedParty.gstin}`}
              </Typography>
            </Grid>
            <Grid item xs={6} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
              <Paper variant="outlined" sx={{ p: 2, width: '85%', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <Typography variant="caption" color="textSecondary" display="block">MY LEDGER SUMMARY</Typography>
                <Grid container spacing={1} sx={{ mt: 1 }}>
                  <Grid item xs={7}><Typography variant="body2" color="textSecondary">Total Debit:</Typography></Grid>
                  <Grid item xs={5} sx={{ textAlign: 'right' }}><Typography variant="body2" sx={{ fontWeight: 600 }}>₹{(ledgerData?.total_debit || 0).toFixed(2)}</Typography></Grid>
                  <Grid item xs={7}><Typography variant="body2" color="textSecondary">Total Credit:</Typography></Grid>
                  <Grid item xs={5} sx={{ textAlign: 'right' }}><Typography variant="body2" sx={{ fontWeight: 600 }}>₹{(ledgerData?.total_credit || 0).toFixed(2)}</Typography></Grid>
                  <Grid item xs={7}><Typography variant="body2" color="textSecondary">Total Additional:</Typography></Grid>
                  <Grid item xs={5} sx={{ textAlign: 'right' }}><Typography variant="body2" sx={{ fontWeight: 600 }}>₹{(ledgerData?.total_additional_amount || 0).toFixed(2)}</Typography></Grid>
                  <Grid item xs={12}><Divider sx={{ my: 0.5 }} /></Grid>
                  <Grid item xs={7}><Typography variant="body2" sx={{ fontWeight: 700 }}>Grand Total:</Typography></Grid>
                  <Grid item xs={5} sx={{ textAlign: 'right' }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e293b' }}>
                      ₹{(ledgerData?.grand_total || 0).toFixed(2)}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          </Grid>

          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
            Ledger Transactions & Additional Amounts
          </Typography>
          <TableContainer component={Paper} variant="outlined" sx={{ mb: 4 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f1f5f9' }}>
                  <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Reference No</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Debit (₹)</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Credit (₹)</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Add. Amt (₹)</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Balance (₹)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {transactions.map((tx, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{new Date(tx.date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}</TableCell>
                    <TableCell>{tx.reference_no}</TableCell>
                    <TableCell>{tx.tx_type}</TableCell>
                    <TableCell align="right">{tx.debit > 0 ? `₹${tx.debit.toFixed(2)}` : '-'}</TableCell>
                    <TableCell align="right">{tx.credit > 0 ? `₹${tx.credit.toFixed(2)}` : '-'}</TableCell>
                    <TableCell align="right">{(parseFloat(tx.additional_amount) || 0) !== 0 ? `₹${(parseFloat(tx.additional_amount) || 0).toFixed(2)}` : '-'}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>₹{(tx.running_balance || 0).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ mt: 6, textAlign: 'center' }}>
            <Typography variant="caption" color="textSecondary">
              This is a computer-generated My Ledger statement of accounts. No signature required.
            </Typography>
          </Box>
        </Box>
      </div>
    </Box>
  );
};

export default MyLedger;
