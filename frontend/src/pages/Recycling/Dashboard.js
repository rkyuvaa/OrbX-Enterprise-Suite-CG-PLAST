import React, { useState, useEffect } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, TextField, MenuItem,
  Tabs, Tab, Paper, Table, TableHead, TableRow, TableCell, TableBody,
  Divider, Alert, useTheme, useMediaQuery, Autocomplete
} from '@mui/material';
import {
  Loop as RecyclingIcon,
  Warehouse as InventoryIcon,
  MonetizationOn as CostIcon,
  TrendingDown as LossIcon,
  ShoppingCart as SalesIcon,
  CompareArrows as FlowIcon,
  BusinessCenter as ProfitIcon,
  CalendarMonth as DateIcon
} from '@mui/icons-material';

import apiClient from '../../api/client';
import PageHeader from '../../components/PageHeader';

const RecyclingDashboard = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  // Tab State
  const [tabVal, setTabVal] = useState(0);

  // Filters State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterProduct, setFilterProduct] = useState(null);
  const [filterSupplier, setFilterSupplier] = useState(null);
  const [filterCustomer, setFilterCustomer] = useState(null);

  // Master Data
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [customers, setCustomers] = useState([]);

  // Data States
  const [stats, setStats] = useState(null);
  const [receipts, setReceipts] = useState([]);
  const [productions, setProductions] = useState([]);
  const [directSales, setDirectSales] = useState([]);
  const [currentStock, setCurrentStock] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Load Masters
  const loadMasters = async () => {
    try {
      const [prodRes, suppRes, custRes] = await Promise.all([
        apiClient.get('/products/'),
        apiClient.get('/suppliers/'),
        apiClient.get('/customers/')
      ]);
      setProducts(prodRes.data);
      setSuppliers(suppRes.data);
      setCustomers(custRes.data);
    } catch (err) {
      console.error('Failed to load filter option masters.', err);
    }
  };

  // Load KPI Stats and Report Logs
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, prodRes, stockRes] = await Promise.all([
        apiClient.get('/recycling/dashboard'),
        apiClient.get('/recycling/production'),
        apiClient.get('/inventory/stock') // pulls stock positions
      ]);

      setStats(statsRes.data);
      setProductions(prodRes.data);
      setCurrentStock(stockRes.data);
    } catch (err) {
      setError('Failed to fetch recycling metrics and logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMasters();
    loadData();
  }, []);

  // Filter utilities
  const matchDate = (dateStr) => {
    if (!dateStr) return false;
    const date = dateStr.substring(0, 10);
    if (startDate && date < startDate) return false;
    if (endDate && date > endDate) return false;
    return true;
  };

  const filteredProductions = productions.filter(p => {
    if (!matchDate(p.date)) return false;
    if (filterProduct && p.finished_product_id !== filterProduct.id) return false;
    return true;
  });

  // Filter raw material stock vs finished goods stock
  const rawStockItems = currentStock.filter(item => item && item.product && item.product.product_type === 'RAW');
  const finishedStockItems = currentStock.filter(item => item && item.product && item.product.product_type === 'FINISHED');

  // KPI display list
  const kpis = [
    {
      title: 'Raw Material Stock',
      value: stats ? `${stats.current_raw_material_stock.toLocaleString()} kg` : '0 kg',
      icon: <InventoryIcon fontSize="large" />,
      color: '#2a9d8f'
    },
    {
      title: 'Finished Goods Stock',
      value: stats ? `${stats.current_finished_goods_stock.toLocaleString()} kg` : '0 kg',
      icon: <RecyclingIcon fontSize="large" />,
      color: '#1b4332'
    },
    {
      title: 'Total Production',
      value: stats ? `${stats.total_production_completed.toLocaleString()} kg` : '0 kg',
      icon: <FlowIcon fontSize="large" />,
      color: '#43aa8b'
    },
    {
      title: 'Weight Loss Summary',
      value: stats ? `${stats.total_production_loss.toLocaleString()} kg (${stats.loss_percentage.toFixed(1)}%)` : '0 kg',
      icon: <LossIcon fontSize="large" />,
      color: '#e76f51'
    },
    {
      title: 'Average Production Cost',
      value: stats ? `₹${stats.average_cost_per_kg.toFixed(2)} / kg` : '₹0.00',
      icon: <CostIcon fontSize="large" />,
      color: '#ff8f00'
    }
  ];

  return (
    <Box>
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3, borderRadius: '8px' }}>
          {error}
        </Alert>
      )}

      {/* FILTER CONTROL CARD (Mobile-First Stacked Layout) */}
      <Card sx={{ mb: 4, borderRadius: '12px', boxShadow: '0 4px 18px rgba(0,0,0,0.04)' }}>
        <CardContent sx={{ p: isMobile ? 2 : 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, color: 'primary.main', display: 'flex', alignItems: 'center', gap: 1 }}>
            <DateIcon size="small" /> Global Filters
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={2.4}>
              <TextField
                type="date"
                label="Start Date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                size="small"
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <TextField
                type="date"
                label="End Date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                size="small"
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <Autocomplete
                size="small"
                options={products}
                getOptionLabel={(option) => `${option.name} (${option.sku})`}
                value={filterProduct}
                onChange={(e, val) => setFilterProduct(val)}
                renderInput={(params) => <TextField {...params} label="Select Product" />}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <Autocomplete
                size="small"
                options={suppliers}
                getOptionLabel={(option) => option.name}
                value={filterSupplier}
                onChange={(e, val) => setFilterSupplier(val)}
                renderInput={(params) => <TextField {...params} label="Select Supplier" />}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <Autocomplete
                size="small"
                options={customers}
                getOptionLabel={(option) => option.name}
                value={filterCustomer}
                onChange={(e, val) => setFilterCustomer(val)}
                renderInput={(params) => <TextField {...params} label="Select Customer" />}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* KPI SCROLLABLE/WRAPPED GRID (Mobile-First 2x2 or Stacked layout) */}
      <Grid container spacing={isMobile ? 1.5 : 3} sx={{ mb: 4 }}>
        {kpis.map((kpi, idx) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={idx}>
            <Card sx={{
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
              borderLeft: `5px solid ${kpi.color}`,
              background: '#ffffff',
              transition: 'transform 0.2s',
              '&:hover': { transform: 'translateY(-2px)' }
            }}>
              <CardContent sx={{ p: isMobile ? 1.5 : 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
                    {kpi.title}
                  </Typography>
                  <Typography variant={isMobile ? 'h6' : 'h5'} sx={{ fontWeight: 800, mt: 0.5, color: '#1e293b' }}>
                    {kpi.value}
                  </Typography>
                </Box>
                <Box sx={{ color: kpi.color, opacity: 0.85 }}>
                  {kpi.icon}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* TABBED REPORT SECTIONS (Mobile-First list layouts instead of tables where appropriate) */}
      <Paper sx={{ width: '100%', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
        <Tabs
          value={tabVal}
          onChange={(e, val) => setTabVal(val)}
          variant={isTablet ? "scrollable" : "standard"}
          scrollButtons="auto"
          textColor="primary"
          indicatorColor="primary"
          sx={{ borderBottom: '1px solid #e2e8f0', px: 2, py: 0.5 }}
        >
          <Tab label="Raw Stock" sx={{ fontWeight: 600 }} />
          <Tab label="Finished Stock" sx={{ fontWeight: 600 }} />
          <Tab label="Recycling History" sx={{ fontWeight: 600 }} />
        </Tabs>

        <Box sx={{ p: isMobile ? 1.5 : 3 }}>
          {/* TAB 0: RAW STOCK LEVEL REPORT */}
          {tabVal === 0 && (
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, fontSize: isMobile ? '1rem' : '1.25rem' }}>
                Raw Scrap Stock Levels
              </Typography>
              {rawStockItems.length === 0 ? (
                <Typography color="textSecondary">No raw material stock entries found.</Typography>
              ) : isMobile ? (
                // Mobile-first Stacked Card List
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {rawStockItems.map((item, idx) => (
                    <Card key={idx} variant="outlined" sx={{ borderRadius: '8px' }}>
                      <CardContent sx={{ p: 2 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: '0.95rem' }}>{item.product.name}</Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1, color: 'text.secondary', fontSize: '0.85rem' }}>
                          <span>SKU: {item.product.sku}</span>
                          <span>Unit Cost: ₹{item.product.purchase_price.toFixed(2)}</span>
                        </Box>
                        <Divider sx={{ my: 1 }} />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Stock Qty:</span>
                          <Typography variant="body1" color="primary" sx={{ fontWeight: 700 }}>
                            {item.qty.toLocaleString()} {item.product.uom}
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              ) : (
                // Desktop Table View
                <Table size="small">
                  <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Material Name</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>SKU</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">On-Hand Stock</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">UOM</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">Avg Cost / Unit</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rawStockItems.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell sx={{ fontWeight: 600 }}>{item.product.name}</TableCell>
                        <TableCell>{item.product.sku}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>{item.qty.toLocaleString()}</TableCell>
                        <TableCell align="right">{item.product.uom}</TableCell>
                        <TableCell align="right">₹{item.product.purchase_price.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Box>
          )}

          {/* TAB 1: FINISHED GOODS STOCK LEVEL REPORT */}
          {tabVal === 1 && (
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, fontSize: isMobile ? '1rem' : '1.25rem' }}>
                Finished Goods Stock Levels
              </Typography>
              {finishedStockItems.length === 0 ? (
                <Typography color="textSecondary">No finished goods stock entries found.</Typography>
              ) : isMobile ? (
                // Mobile-first Stacked Card List
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {finishedStockItems.map((item, idx) => (
                    <Card key={idx} variant="outlined" sx={{ borderRadius: '8px' }}>
                      <CardContent sx={{ p: 2 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: '0.95rem' }}>{item.product.name}</Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1, color: 'text.secondary', fontSize: '0.85rem' }}>
                          <span>SKU: {item.product.sku}</span>
                          <span>Unit Cost: ₹{item.product.purchase_price.toFixed(2)}</span>
                        </Box>
                        <Divider sx={{ my: 1 }} />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Stock Qty:</span>
                          <Typography variant="body1" color="primary" sx={{ fontWeight: 700 }}>
                            {item.qty.toLocaleString()} {item.product.uom}
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              ) : (
                // Desktop Table View
                <Table size="small">
                  <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Finished Product</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>SKU</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">On-Hand Stock</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">UOM</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">Unit Cost (Production Avg)</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {finishedStockItems.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell sx={{ fontWeight: 600 }}>{item.product.name}</TableCell>
                        <TableCell>{item.product.sku}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>{item.qty.toLocaleString()}</TableCell>
                        <TableCell align="right">{item.product.uom}</TableCell>
                        <TableCell align="right">₹{item.product.purchase_price.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Box>
          )}

          {/* TAB 2: RECYCLING HISTORY */}
          {tabVal === 2 && (
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, fontSize: isMobile ? '1rem' : '1.25rem' }}>
                Recycling Runs & Yield Reports
              </Typography>
              {filteredProductions.length === 0 ? (
                <Typography color="textSecondary">No production runs match the filters.</Typography>
              ) : isMobile ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {filteredProductions.map((log) => (
                    <Card key={log.id} variant="outlined" sx={{ borderRadius: '8px' }}>
                      <CardContent sx={{ p: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <Typography sx={{ fontWeight: 700, fontSize: '0.95rem' }}>{log.finished_product_name}</Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                            {new Date(log.date).toLocaleDateString()}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mt: 1.5, fontSize: '0.85rem' }}>
                          <div>Input Weight: <strong>{log.input_weight} kg</strong></div>
                          <div>Output Yield: <strong>{log.output_weight} kg</strong></div>
                          <div>Weight Loss: <strong>{log.weight_loss} kg ({log.loss_percentage.toFixed(1)}%)</strong></div>
                          <div>Unit Cost: <strong style={{ color: '#2d6a4f' }}>₹{log.cost_per_kg.toFixed(2)} / kg</strong></div>
                        </Box>
                        <Divider sx={{ my: 1 }} />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.85rem', color: 'text.secondary' }}>Total Cost:</span>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.main' }}>
                            ₹{log.total_production_cost.toLocaleString()}
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              ) : (
                <Table size="small">
                  <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Produced Finished Good</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">Input (kg)</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">Output (kg)</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">Loss (kg / %)</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">Expenses (₹)</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">Total Cost (₹)</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">Yield Cost / kg</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredProductions.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{new Date(log.date).toLocaleDateString()}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{log.finished_product_name}</TableCell>
                        <TableCell align="right">{log.input_weight.toLocaleString()}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>{log.output_weight.toLocaleString()}</TableCell>
                        <TableCell align="right" sx={{ color: 'error.main' }}>
                          {log.weight_loss.toFixed(1)} kg ({log.loss_percentage.toFixed(1)}%)
                        </TableCell>
                        <TableCell align="right">₹{log.production_expenses.toFixed(2)}</TableCell>
                        <TableCell align="right">₹{log.total_production_cost.toFixed(2)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: 'success.main' }}>
                          ₹{log.cost_per_kg.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Box>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default RecyclingDashboard;
