import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box, Button, Card, CardContent, Typography, Grid, TextField,
  Dialog, DialogTitle, DialogContent, DialogActions, Alert, Divider,
  IconButton, useTheme, useMediaQuery, Autocomplete, Paper,
  Table, TableHead, TableRow, TableCell, TableBody, Chip, Tooltip, Tab, Tabs
} from '@mui/material';
import {
  Add as AddIcon,
  Close as CloseIcon,
  PlayArrow as StartIcon,
  CheckCircle as FinishIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  Scale as ScaleIcon,
  AttachMoney as ExpenseIcon,
  History as HistoryIcon,
  PrecisionManufacturing as FactoryIcon,
  ReceiptLong as BomIcon
} from '@mui/icons-material';

import apiClient from '../../api/client';
import PageHeader from '../../components/PageHeader';

const RecyclingProcess = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const { activeBranchId } = useSelector((state) => state.branch);

  // Tab State
  const [activeTab, setActiveTab] = useState(0);

  // Modals States
  const [openNewModal, setOpenNewModal] = useState(false);
  const [openViewModal, setOpenViewModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [openFinishModal, setOpenFinishModal] = useState(false);

  // Loading & Error States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Master Data
  const [products, setProducts] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [manufacturingProcesses, setManufacturingProcesses] = useState([]);
  const [stock, setStock] = useState([]);

  // Active / Selected Process State
  const [selectedProcess, setSelectedProcess] = useState(null);

  // Form States - New Process
  const [newProductToRecycle, setNewProductToRecycle] = useState(null);
  const [newDate, setNewDate] = useState('');
  const [newExpenses, setNewExpenses] = useState('0');
  const [newItems, setNewItems] = useState([]); // Array of { product_id, product_name, bom_qty, actual_qty_used }
  const [newFormError, setNewFormError] = useState(null);

  // Form States - Edit Process
  const [editExpenses, setEditExpenses] = useState('0');
  const [editItems, setEditItems] = useState([]); // Array of { product_id, product_name, bom_qty, actual_qty_used }
  const [editFormError, setEditFormError] = useState(null);

  // Form States - Finish Process
  const [finishOutputProduct, setFinishOutputProduct] = useState(null);
  const [finishOutputWeight, setFinishOutputWeight] = useState('');
  const [finishRemarks, setFinishRemarks] = useState('');
  const [finishFormError, setFinishFormError] = useState(null);

  // Load All Initial Data
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const query = activeBranchId ? `?company_id=${activeBranchId}` : '';
      const [prodRes, recRes, mfgRes, stockRes] = await Promise.all([
        apiClient.get('/products/'),
        apiClient.get('/recycling/recipes'),
        apiClient.get(`/recycling/manufacturing${query}`),
        apiClient.get(`/inventory/stock${query}`)
      ]);
      setProducts(prodRes.data);  // store ALL products, filter where needed per context
      setRecipes(recRes.data);
      setManufacturingProcesses(mfgRes.data);
      setStock(stockRes.data || []);
    } catch (err) {
      setError('Failed to fetch manufacturing processes, BOM recipes, or stock positions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeBranchId]);

  const getStockQty = (productId) => {
    if (!stock || stock.length === 0) return 0;
    const found = stock.find((s) => s.product?.id === productId || s.product_id === productId);
    return found ? found.qty : 0;
  };

  // ==========================================
  // STEP 1 - CREATE MANUFACTURING ACTIONS
  // ==========================================
  const handleOpenNewModal = () => {
    setNewProductToRecycle(null);
    setNewDate(new Date().toISOString().split('T')[0]);
    setNewExpenses('0');
    setNewItems([]);
    setNewFormError(null);
    setOpenNewModal(true);
  };

  const handleProductToRecycleChange = (e, val) => {
    setNewProductToRecycle(val);
    setNewFormError(null);

    if (val) {
      // Step 1: Find the configured Recipe (BOM) for this product
      const matchingRecipe = recipes.find(r => r.finished_product_id === val.id);
      
      if (matchingRecipe) {
        // Step 2: Auto populate raw materials from recipe items
        const initialItems = matchingRecipe.items.map(item => {
          const fullProd = products.find(p => p.id === item.product_id);
          return {
            product_id: item.product_id,
            product_name: fullProd ? fullProd.name : 'Unknown Raw Material',
            sku: fullProd ? fullProd.sku : '',
            uom: fullProd ? fullProd.uom : 'KG',
            bom_qty: item.qty,
            actual_qty_used: item.qty // default actual quantity used to BOM quantity
          };
        });
        setNewItems(initialItems);
      } else {
        setNewItems([]);
        setNewFormError('Warning: No Recipe BOM template is configured for this product. You cannot record consumption without a BOM.');
      }
    } else {
      setNewItems([]);
    }
  };

  const handleNewActualQtyChange = (index, value) => {
    const updated = [...newItems];
    updated[index].actual_qty_used = parseFloat(value) || 0;
    setNewItems(updated);
  };

  const handleSaveNewProcess = async (e) => {
    e.preventDefault();
    setNewFormError(null);

    if (!newProductToRecycle) {
      setNewFormError('Please select a product to recycle.');
      return;
    }
    if (newItems.length === 0) {
      setNewFormError('Please select a product with a configured BOM recipe.');
      return;
    }
    if (newItems.some(i => i.actual_qty_used === '' || i.actual_qty_used < 0)) {
      setNewFormError('Please enter valid actual quantities used for all raw materials.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        product_to_recycle_id: newProductToRecycle.id,
        company_id: activeBranchId || '00000000-0000-0000-0000-000000000000',
        date: newDate ? new Date(newDate).toISOString() : new Date().toISOString(),
        process_expenses: parseFloat(newExpenses) || 0.0,
        items: newItems.map(i => ({
          product_id: i.product_id,
          bom_qty: i.bom_qty,
          actual_qty_used: i.actual_qty_used
        }))
      };

      await apiClient.post('/recycling/manufacturing', payload);
      setOpenNewModal(false);
      loadData();
    } catch (err) {
      setNewFormError(err.response?.data?.detail || 'Failed to start manufacturing process.');
    } finally {
      setSubmitting(false);
    }
  };

  // ==========================================
  // STEP 6 - OPEN MANUFACTURING ACTIONS
  // ==========================================
  const handleOpenViewModal = (process) => {
    setSelectedProcess(process);
    setOpenViewModal(true);
  };

  // ==========================================
  // STEP 7 - EDIT MANUFACTURING ACTIONS
  // ==========================================
  const handleOpenEditModal = (process) => {
    setSelectedProcess(process);
    setEditExpenses(String(process.process_expenses));
    
    // Map items
    const mapped = process.items.map(item => ({
      product_id: item.product_id,
      product_name: item.product_name,
      sku: item.sku,
      uom: item.uom,
      bom_qty: item.bom_qty,
      actual_qty_used: item.actual_qty_used
    }));
    setEditItems(mapped);
    setEditFormError(null);
    setOpenEditModal(true);
  };

  const handleEditActualQtyChange = (index, value) => {
    const updated = [...editItems];
    updated[index].actual_qty_used = parseFloat(value) || 0;
    setEditItems(updated);
  };

  const handleSaveEditProcess = async (e) => {
    e.preventDefault();
    setEditFormError(null);

    if (editItems.some(i => i.actual_qty_used === '' || i.actual_qty_used < 0)) {
      setEditFormError('Please enter valid actual quantities used for all raw materials.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        process_expenses: parseFloat(editExpenses) || 0.0,
        items: editItems.map(i => ({
          product_id: i.product_id,
          actual_qty_used: i.actual_qty_used
        }))
      };

      await apiClient.put(`/recycling/manufacturing/${selectedProcess.id}`, payload);
      setOpenEditModal(false);
      if (openViewModal) setOpenViewModal(false);
      loadData();
    } catch (err) {
      setEditFormError(err.response?.data?.detail || 'Failed to update manufacturing process.');
    } finally {
      setSubmitting(false);
    }
  };

  // ==========================================
  // STEP 8 - DELETE MANUFACTURING ACTIONS
  // ==========================================
  const handleDeleteProcess = async (process) => {
    if (!window.confirm(`Are you sure you want to delete manufacturing run ${process.manufacturing_no}?`)) return;

    try {
      await apiClient.delete(`/recycling/manufacturing/${process.id}`);
      loadData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete manufacturing process.');
    }
  };

  // ==========================================
  // STEP 9 & 10 - FINISH MANUFACTURING ACTIONS
  // ==========================================
  const handleOpenFinishModal = (process) => {
    setSelectedProcess(process);
    setFinishOutputProduct(null);
    setFinishOutputWeight('');
    setFinishRemarks('');
    setFinishFormError(null);
    setOpenFinishModal(true);
  };

  const handleCompleteProcess = async (e) => {
    e.preventDefault();
    setFinishFormError(null);

    if (!finishOutputProduct) {
      setFinishFormError('Please select the yielded Output Product.');
      return;
    }
    if (!finishOutputWeight || parseFloat(finishOutputWeight) <= 0) {
      setFinishFormError('Please enter a valid Output Weight.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        output_product_id: finishOutputProduct.id,
        output_weight: parseFloat(finishOutputWeight),
        remarks: finishRemarks
      };

      await apiClient.post(`/recycling/manufacturing/${selectedProcess.id}/finish`, payload);
      setOpenFinishModal(false);
      loadData();
    } catch (err) {
      setFinishFormError(err.response?.data?.detail || 'Failed to complete manufacturing process.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter processes based on Active Tab
  const activeProcesses = manufacturingProcesses.filter(p => p.status === 'In Process');
  const completedProcesses = manufacturingProcesses.filter(p => p.status === 'Completed');

  // Dashboard KPIs calculations
  const totalActive = activeProcesses.length;
  const totalCompleted = completedProcesses.length;
  const totalExpenses = manufacturingProcesses.reduce((acc, curr) => acc + curr.process_expenses, 0);
  const totalOutputWeight = completedProcesses.reduce((acc, curr) => acc + (curr.output_weight || 0), 0);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, mb: 2 }}>
        <Button
          variant="outlined"
          color="primary"
          startIcon={<BomIcon />}
          component={RouterLink}
          to="/recycling/bom"
          sx={{
            height: 40,
            borderRadius: '8px',
            fontWeight: 700
          }}
        >
          BOM Templates
        </Button>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleOpenNewModal}
          sx={{
            height: 40,
            borderRadius: '8px',
            fontWeight: 700
          }}
        >
          Start Process
        </Button>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3, borderRadius: '8px' }}>
          {error}
        </Alert>
      )}

      {/* Main Process List Card */}
      <Card sx={{ borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
        <Tabs
          value={activeTab}
          onChange={(e, val) => setActiveTab(val)}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider', backgroundColor: '#f8fafc', borderTopLeftRadius: '12px', borderTopRightRadius: '12px' }}
        >
          <Tab icon={<FactoryIcon fontSize="small" />} iconPosition="start" label={`In Process Runs (${totalActive})`} sx={{ fontWeight: 700, minHeight: 48 }} />
          <Tab icon={<HistoryIcon fontSize="small" />} iconPosition="start" label={`Completed History (${totalCompleted})`} sx={{ fontWeight: 700, minHeight: 48 }} />
        </Tabs>

        {loading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="textSecondary">Loading records...</Typography>
          </Box>
        ) : (
          <Box>
            {activeTab === 0 ? (
              // Active Runs Tab
              activeProcesses.length === 0 ? (
                <Box sx={{ p: 5, textAlign: 'center' }}>
                  <Typography color="textSecondary">No active manufacturing runs in process.</Typography>
                  <Button variant="outlined" sx={{ mt: 2 }} onClick={handleOpenNewModal}>Start a New Run</Button>
                </Box>
              ) : (
                <Table size="medium">
                  <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Manufacturing No.</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Product to Recycle</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Expenses</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {activeProcesses.map((p) => (
                      <TableRow key={p.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                        <TableCell sx={{ fontWeight: 700, color: '#1e3c72' }}>{p.manufacturing_no}</TableCell>
                        <TableCell>{new Date(p.date).toLocaleDateString()}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{p.product_to_recycle_name}</TableCell>
                        <TableCell>₹{p.process_expenses.toFixed(2)}</TableCell>
                        <TableCell>
                          <Chip label={p.status} color="warning" size="small" sx={{ fontWeight: 700, borderRadius: '6px' }} />
                        </TableCell>
                        <TableCell align="right">
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                            <Tooltip title="Open Read-only">
                              <IconButton size="small" onClick={() => handleOpenViewModal(p)} color="info">
                                <ViewIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Edit Details">
                              <IconButton size="small" onClick={() => handleOpenEditModal(p)} color="primary">
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete Run">
                              <IconButton size="small" onClick={() => handleDeleteProcess(p)} color="error">
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Button
                              variant="contained"
                              color="success"
                              size="small"
                              startIcon={<FinishIcon />}
                              onClick={() => handleOpenFinishModal(p)}
                              sx={{
                                fontWeight: 700,
                                textTransform: 'none',
                                borderRadius: '6px',
                                px: 1.5
                              }}
                            >
                              Finish
                            </Button>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )
            ) : (
              // Completed History Tab
              completedProcesses.length === 0 ? (
                <Box sx={{ p: 5, textAlign: 'center' }}>
                  <Typography color="textSecondary">No completed recycling records found.</Typography>
                </Box>
              ) : (
                <Table size="medium">
                  <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Manufacturing No.</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Completion Date</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Product Recycled</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Expenses</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Output Yielded</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {completedProcesses.map((p) => (
                      <TableRow key={p.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                        <TableCell sx={{ fontWeight: 700, color: '#2d6a4f' }}>{p.manufacturing_no}</TableCell>
                        <TableCell>{new Date(p.date).toLocaleDateString()}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{p.product_to_recycle_name}</TableCell>
                        <TableCell>₹{p.process_expenses.toFixed(2)}</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: 'success.main' }}>
                          {p.output_weight} kg ({p.output_product_name})
                        </TableCell>
                        <TableCell>
                          <Chip label={p.status} color="success" size="small" sx={{ fontWeight: 700, borderRadius: '6px' }} />
                        </TableCell>
                        <TableCell align="right">
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                            <Tooltip title="View Completed Details">
                              <IconButton size="small" onClick={() => handleOpenViewModal(p)} color="info">
                                <ViewIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )
            )}
          </Box>
        )}
      </Card>

      {/* DIALOG 1: STEP 1 & 2 & 3 & 4 - NEW MANUFACTURING */}
      <Dialog
        open={openNewModal}
        onClose={() => !submitting && setOpenNewModal(false)}
        fullWidth
        maxWidth="md"
        PaperProps={{ sx: { borderRadius: '12px' } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <span style={{ fontWeight: 800 }}>Start New Recycling Process</span>
          <IconButton onClick={() => setOpenNewModal(false)} disabled={submitting}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <form onSubmit={handleSaveNewProcess}>
          <DialogContent dividers sx={{ pt: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {newFormError && (
                <Alert severity={newFormError.startsWith('Warning') ? 'warning' : 'error'} onClose={() => setNewFormError(null)}>
                  {newFormError}
                </Alert>
              )}

              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Manufacturing No."
                    value="Auto-Generated on Save"
                    disabled
                    variant="outlined"
                    size="small"
                    fullWidth
                    InputProps={{ sx: { fontWeight: 700, fontStyle: 'italic', backgroundColor: '#f1f5f9' } }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    type="date"
                    label="Date *"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    variant="outlined"
                    size="small"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Autocomplete
                    options={products.filter(p => p.is_active !== false)}
                    getOptionLabel={(option) => `${option.name} (${option.sku})`}
                    value={newProductToRecycle}
                    onChange={handleProductToRecycleChange}
                    renderInput={(params) => <TextField {...params} label="Product to Recycle *" variant="outlined" size="small" required />}
                  />
                </Grid>
              </Grid>

              {newItems.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5, color: '#1e3c72', display: 'flex', alignItems: 'center' }}>
                    <FactoryIcon fontSize="small" sx={{ mr: 1 }} />
                    Raw Material Consumption (Loaded BOM)
                  </Typography>

                  <Table size="small" sx={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                    <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Raw Material</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>BOM Quantity</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Available Stock</TableCell>
                        <TableCell sx={{ fontWeight: 700 }} width="250">Actual Quantity Used *</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {newItems.map((item, idx) => {
                        const stockQty = getStockQty(item.product_id);
                        const isUnderStock = stockQty < item.actual_qty_used;
                        return (
                          <TableRow key={item.product_id}>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.product_name}</Typography>
                              <Typography variant="caption" color="textSecondary">{item.sku}</Typography>
                            </TableCell>
                            <TableCell>{item.bom_qty} {item.uom}</TableCell>
                            <TableCell sx={{ color: isUnderStock ? 'error.main' : 'text.secondary', fontWeight: isUnderStock ? 700 : 500 }}>
                              {stockQty.toLocaleString()} {item.uom}
                              {isUnderStock && ' (Low Stock)'}
                            </TableCell>
                            <TableCell>
                              <TextField
                                type="number"
                                size="small"
                                value={item.actual_qty_used}
                                onChange={(e) => handleNewActualQtyChange(idx, e.target.value)}
                                InputProps={{
                                  endAdornment: <Typography variant="caption" color="textSecondary">{item.uom}</Typography>
                                }}
                                fullWidth
                                error={isUnderStock}
                                helperText={isUnderStock ? 'Insufficient stock' : ''}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </Box>
              )}

              <Divider />

              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1, color: '#1e3c72', display: 'flex', alignItems: 'center' }}>
                  <ExpenseIcon fontSize="small" sx={{ mr: 1 }} />
                  Process Expenses
                </Typography>
                <Grid container>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      type="number"
                      label="Total Expense Incurred (₹)"
                      value={newExpenses}
                      onChange={(e) => setNewExpenses(e.target.value)}
                      variant="outlined"
                      size="small"
                      fullWidth
                    />
                  </Grid>
                </Grid>
              </Box>
            </Box>
          </DialogContent>

          <DialogActions sx={{ p: 2, gap: 1 }}>
            <Button onClick={() => setOpenNewModal(false)} variant="outlined" disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={submitting}
              sx={{
                fontWeight: 700,
                background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #2a5298 0%, #1e3c72 100%)',
                }
              }}
            >
              {submitting ? 'Saving...' : 'Save'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* DIALOG 2: STEP 6 - OPEN MANUFACTURING (Read-only) */}
      <Dialog
        open={openViewModal}
        onClose={() => setOpenViewModal(false)}
        fullWidth
        maxWidth="md"
        PaperProps={{ sx: { borderRadius: '12px' } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <span style={{ fontWeight: 800 }}>Manufacturing Run: {selectedProcess?.manufacturing_no}</span>
            <Chip
              label={selectedProcess?.status}
              color={selectedProcess?.status === 'Completed' ? 'success' : 'warning'}
              size="small"
              sx={{ fontWeight: 700, borderRadius: '6px' }}
            />
          </Box>
          <IconButton onClick={() => setOpenViewModal(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ pt: 2 }}>
          {selectedProcess && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Date Started</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 700 }}>{new Date(selectedProcess.date).toLocaleDateString()}</Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Product to Recycle</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 700 }}>{selectedProcess.product_to_recycle_name}</Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Process Expenses</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 700, color: 'primary.main' }}>₹{selectedProcess.process_expenses.toFixed(2)}</Typography>
                </Grid>
              </Grid>

              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5, color: '#1e3c72' }}>
                  Raw Material Consumption Details
                </Typography>
                <Table size="small" sx={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                  <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Raw Material</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>BOM Quantity</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Actual Quantity Used</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Variance</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedProcess.items.map((item) => {
                      const variance = item.actual_qty_used - item.bom_qty;
                      return (
                        <TableRow key={item.product_id}>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.product_name}</Typography>
                            <Typography variant="caption" color="textSecondary">{item.sku}</Typography>
                          </TableCell>
                          <TableCell>{item.bom_qty} {item.uom}</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>{item.actual_qty_used} {item.uom}</TableCell>
                          <TableCell sx={{ color: variance > 0 ? 'error.main' : variance < 0 ? 'success.main' : 'text.secondary', fontWeight: 700 }}>
                            {variance > 0 ? `+${variance.toFixed(2)}` : variance.toFixed(2)} {item.uom}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Box>

              {selectedProcess.status === 'Completed' && (
                <>
                  <Divider />
                  <Box sx={{ p: 2, backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5, color: '#166534', display: 'flex', alignItems: 'center' }}>
                      <FinishIcon fontSize="small" sx={{ mr: 1 }} />
                      Finished Yield Details
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={4}>
                        <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Yielded Output Product</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 700, color: '#166534' }}>{selectedProcess.output_product_name}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Output Weight</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 700, color: '#166534' }}>{selectedProcess.output_weight} kg</Typography>
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Remarks</Typography>
                        <Typography variant="body2" sx={{ fontStyle: 'italic' }}>{selectedProcess.remarks || 'No remarks provided.'}</Typography>
                      </Grid>
                    </Grid>
                  </Box>
                </>
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setOpenViewModal(false)} variant="outlined">
            Close
          </Button>
          {selectedProcess?.status === 'In Process' && (
            <Button
              variant="contained"
              startIcon={<EditIcon />}
              onClick={() => handleOpenEditModal(selectedProcess)}
              sx={{
                fontWeight: 700,
                background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
              }}
            >
              Edit
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* DIALOG 3: STEP 7 - EDIT MANUFACTURING */}
      <Dialog
        open={openEditModal}
        onClose={() => !submitting && setOpenEditModal(false)}
        fullWidth
        maxWidth="md"
        PaperProps={{ sx: { borderRadius: '12px' } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <span style={{ fontWeight: 800 }}>Edit Manufacturing Run: {selectedProcess?.manufacturing_no}</span>
          <IconButton onClick={() => setOpenEditModal(false)} disabled={submitting}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <form onSubmit={handleSaveEditProcess}>
          <DialogContent dividers sx={{ pt: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {editFormError && (
                <Alert severity="error" onClose={() => setEditFormError(null)}>
                  {editFormError}
                </Alert>
              )}

              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Manufacturing No."
                    value={selectedProcess?.manufacturing_no || ''}
                    disabled
                    variant="outlined"
                    size="small"
                    fullWidth
                    InputProps={{ sx: { fontWeight: 700, backgroundColor: '#f1f5f9' } }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Date"
                    value={selectedProcess ? new Date(selectedProcess.date).toLocaleDateString() : ''}
                    disabled
                    variant="outlined"
                    size="small"
                    fullWidth
                    InputProps={{ sx: { backgroundColor: '#f1f5f9' } }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Product to Recycle"
                    value={selectedProcess?.product_to_recycle_name || ''}
                    disabled
                    variant="outlined"
                    size="small"
                    fullWidth
                    InputProps={{ sx: { fontWeight: 700, backgroundColor: '#f1f5f9' } }}
                  />
                </Grid>
              </Grid>

              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5, color: '#1e3c72' }}>
                  Raw Material Consumption (Edit Actual Quantity Used)
                </Typography>
                <Table size="small" sx={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                  <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Raw Material</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>BOM Quantity</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} width="250">Actual Quantity Used *</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {editItems.map((item, idx) => (
                      <TableRow key={item.product_id}>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.product_name}</Typography>
                          <Typography variant="caption" color="textSecondary">{item.sku}</Typography>
                        </TableCell>
                        <TableCell>{item.bom_qty} {item.uom}</TableCell>
                        <TableCell>
                          <TextField
                            type="number"
                            size="small"
                            value={item.actual_qty_used}
                            onChange={(e) => handleEditActualQtyChange(idx, e.target.value)}
                            InputProps={{
                              endAdornment: <Typography variant="caption" color="textSecondary">{item.uom}</Typography>
                            }}
                            fullWidth
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>

              <Divider />

              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1, color: '#1e3c72', display: 'flex', alignItems: 'center' }}>
                  <ExpenseIcon fontSize="small" sx={{ mr: 1 }} />
                  Process Expenses
                </Typography>
                <Grid container>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      type="number"
                      label="Total Expense Incurred (₹)"
                      value={editExpenses}
                      onChange={(e) => setEditExpenses(e.target.value)}
                      variant="outlined"
                      size="small"
                      fullWidth
                    />
                  </Grid>
                </Grid>
              </Box>
            </Box>
          </DialogContent>

          <DialogActions sx={{ p: 2, gap: 1 }}>
            <Button onClick={() => setOpenEditModal(false)} variant="outlined" disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={submitting}
              sx={{
                fontWeight: 700,
                background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
              }}
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* DIALOG 4: STEP 9 & 10 - FINISH MANUFACTURING */}
      <Dialog
        open={openFinishModal}
        onClose={() => !submitting && setOpenFinishModal(false)}
        fullWidth
        maxWidth="xs"
        PaperProps={{ sx: { borderRadius: '12px' } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <span style={{ fontWeight: 800 }}>Complete Manufacturing Run</span>
          <IconButton onClick={() => setOpenFinishModal(false)} disabled={submitting}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <form onSubmit={handleCompleteProcess}>
          <DialogContent dividers sx={{ pt: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {finishFormError && (
                <Alert severity="error" onClose={() => setFinishFormError(null)}>
                  {finishFormError}
                </Alert>
              )}

              <Typography variant="body2" color="textSecondary" sx={{ fontWeight: 600 }}>
                Please specify the finished output product, total weight yielded, and any optional remarks to close manufacturing run <strong>{selectedProcess?.manufacturing_no}</strong>.
              </Typography>

              <Autocomplete
                options={products.filter(p => p.product_type === 'FINISHED')}
                getOptionLabel={(option) => `${option.name} (${option.sku})`}
                value={finishOutputProduct}
                onChange={(e, val) => setFinishOutputProduct(val)}
                renderInput={(params) => <TextField {...params} label="Select Output Product *" variant="outlined" size="small" required />}
              />

              <TextField
                type="number"
                label="Output Weight (KG) *"
                value={finishOutputWeight}
                onChange={(e) => setFinishOutputWeight(e.target.value)}
                variant="outlined"
                size="small"
                fullWidth
                InputProps={{
                  startAdornment: <ScaleIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                }}
                required
              />

              <TextField
                label="Remarks (Optional)"
                value={finishRemarks}
                onChange={(e) => setFinishRemarks(e.target.value)}
                variant="outlined"
                size="small"
                multiline
                rows={2}
                fullWidth
                placeholder="e.g. Yielded good quality chips with standard loss."
              />
            </Box>
          </DialogContent>

          <DialogActions sx={{ p: 2, gap: 1 }}>
            <Button onClick={() => setOpenFinishModal(false)} variant="outlined" disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="success"
              disabled={submitting}
              sx={{
                fontWeight: 700,
                background: 'linear-gradient(135deg, #2e7d32 0%, #4caf50 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #1b5e20 0%, #2e7d32 100%)',
                }
              }}
            >
              {submitting ? 'Completing...' : 'Complete Manufacturing'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default RecyclingProcess;
