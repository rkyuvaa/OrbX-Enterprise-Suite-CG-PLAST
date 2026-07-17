import React, { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box, Button, Card, CardContent, Typography, Grid, TextField,
  Dialog, DialogTitle, DialogContent, DialogActions, Alert, Divider,
  IconButton, useTheme, useMediaQuery, Autocomplete, Paper
} from '@mui/material';
import {
  Add as AddIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  ReceiptLong as RecipeIcon,
  ArrowBack as BackIcon
} from '@mui/icons-material';

import apiClient from '../../api/client';
import PageHeader from '../../components/PageHeader';

const RecyclingBOM = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Modal State
  const [openRecipeModal, setOpenRecipeModal] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);

  // Loading & Error States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Master Data
  const [products, setProducts] = useState([]);
  const [recipes, setRecipes] = useState([]);

  // Recipe Template Form State
  const [recipeName, setRecipeName] = useState('');
  const [recipeFG, setRecipeFG] = useState(null);
  const [recipeLoss, setRecipeLoss] = useState('0');
  const [recipeItems, setRecipeItems] = useState([{ product: null, qty: '' }]);
  const [recipeFormError, setRecipeFormError] = useState(null);

  // Load All Initial Data
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [prodRes, recRes] = await Promise.all([
        apiClient.get('/products/'),
        apiClient.get('/recycling/recipes')
      ]);
      setProducts(prodRes.data.filter(p => p.is_active !== false));
      setRecipes(recRes.data);
    } catch (err) {
      setError('Failed to fetch BOM recipes or products.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Show all active products for yield and ingredients
  const finishedProducts = products;
  const rawAndComponents = products;

  // ==========================================
  // RECIPE ACTIONS
  // ==========================================
  const handleOpenRecipeModal = () => {
    setEditingRecipe(null);
    setRecipeName('');
    setRecipeFG(null);
    setRecipeLoss('0');
    setRecipeItems([{ product: null, qty: '' }]);
    setRecipeFormError(null);
    setOpenRecipeModal(true);
  };

  const handleEditRecipe = (rec) => {
    setEditingRecipe(rec);
    setRecipeName(rec.name);
    
    // Lookup the finished product item
    const foundFG = products.find(p => p.id === rec.finished_product_id) || null;
    setRecipeFG(foundFG);
    
    setRecipeLoss(String(rec.expected_loss_percentage));
    
    // Map items
    const mappedItems = rec.items.map(item => {
      const foundItemProduct = products.find(p => p.id === item.product_id) || null;
      return {
        product: foundItemProduct,
        qty: String(item.qty)
      };
    });
    setRecipeItems(mappedItems.length > 0 ? mappedItems : [{ product: null, qty: '' }]);
    
    setRecipeFormError(null);
    setOpenRecipeModal(true);
  };

  const handleAddRecipeItem = () => {
    setRecipeItems([...recipeItems, { product: null, qty: '' }]);
  };

  const handleRemoveRecipeItem = (index) => {
    const updated = [...recipeItems];
    updated.splice(index, 1);
    setRecipeItems(updated);
  };

  const handleRecipeProductChange = (index, productVal) => {
    const updated = [...recipeItems];
    updated[index].product = productVal;
    setRecipeItems(updated);
  };

  const handleRecipeQtyChange = (index, qtyVal) => {
    const updated = [...recipeItems];
    updated[index].qty = qtyVal;
    setRecipeItems(updated);
  };

  const handleSaveRecipe = async (e) => {
    e.preventDefault();
    setRecipeFormError(null);

    if (!recipeName) {
      setRecipeFormError('Recipe name is required.');
      return;
    }
    if (!recipeFG) {
      setRecipeFormError('Please select a finished product.');
      return;
    }
    if (recipeItems.length === 0 || recipeItems.some(i => !i.product || !i.qty || parseFloat(i.qty) <= 0)) {
      setRecipeFormError('Please enter valid quantities/multipliers for ingredients.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        finished_product_id: recipeFG.id,
        name: recipeName,
        expected_loss_percentage: parseFloat(recipeLoss) || 0.0,
        items: recipeItems.map(i => ({
          product_id: i.product.id,
          qty: parseFloat(i.qty)
        }))
      };

      if (editingRecipe) {
        await apiClient.put(`/recycling/recipes/${editingRecipe.id}`, payload);
      } else {
        await apiClient.post('/recycling/recipes', payload);
      }
      setOpenRecipeModal(false);
      loadData();
    } catch (err) {
      setRecipeFormError(err.response?.data?.detail || 'Failed to save recipe BOM template.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRecipe = async (recipeId) => {
    if (!window.confirm('Are you sure you want to delete this recipe template?')) return;
    try {
      await apiClient.delete(`/recycling/recipes/${recipeId}`);
      loadData();
    } catch (err) {
      alert('Failed to delete recipe template.');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Button
          variant="outlined"
          startIcon={<BackIcon />}
          component={RouterLink}
          to="/recycling"
          sx={{ height: 40, borderRadius: '8px', fontWeight: 700 }}
        >
          Back to Process
        </Button>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleOpenRecipeModal}
          sx={{ height: 40, borderRadius: '8px', fontWeight: 700 }}
        >
          Add Recipe Template
        </Button>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3, borderRadius: '8px' }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Typography color="textSecondary">Loading recipe templates...</Typography>
      ) : recipes.length === 0 ? (
        <Card sx={{ p: 4, textAlign: 'center', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
          <Typography color="textSecondary">No BOM recipes defined yet.</Typography>
          <Button variant="outlined" sx={{ mt: 2 }} onClick={handleOpenRecipeModal}>Define First Recipe</Button>
        </Card>
      ) : (
        <Grid container spacing={isMobile ? 1.5 : 3}>
          {recipes.map((rec) => (
            <Grid item xs={12} sm={6} md={4} key={rec.id}>
              <Card sx={{ borderRadius: '12px', height: '100%', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                <CardContent sx={{ flexGrow: 1, p: 2.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: '#1e293b' }}>
                      {rec.name}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <IconButton size="small" onClick={() => handleEditRecipe(rec)} color="primary">
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDeleteRecipe(rec.id)} color="error">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                    Produces: <strong>{rec.finished_product_name}</strong>
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'error.main', fontWeight: 600 }}>
                    Expected weight loss: {rec.expected_loss_percentage}%
                  </Typography>

                  <Divider sx={{ my: 1.5 }} />

                  <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary' }}>
                    Recipe Items (Multiplier qty / kg yield)
                  </Typography>
                  <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {rec.items.map((item, idx) => (
                      <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span>{item.product_name}</span>
                        <strong>{item.qty} kg</strong>
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* DIALOG: DEFINE RECIPE BOM TEMPLATE */}
      <Dialog
        open={openRecipeModal}
        onClose={() => !submitting && setOpenRecipeModal(false)}
        fullScreen={isMobile}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: isMobile ? 0 : '12px' } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <span style={{ fontWeight: 800 }}>{editingRecipe ? 'Edit Recipe Template' : 'Add Recipe Template'}</span>
          <IconButton onClick={() => setOpenRecipeModal(false)} disabled={submitting}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <form onSubmit={handleSaveRecipe}>
          <DialogContent sx={{ pt: 1 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {recipeFormError && (
                <Alert severity="warning" onClose={() => setRecipeFormError(null)}>
                  {recipeFormError}
                </Alert>
              )}

              <TextField
                label="Recipe Name *"
                value={recipeName}
                onChange={(e) => setRecipeName(e.target.value)}
                variant="outlined"
                size="small"
                fullWidth
                placeholder="e.g. Standard HDPE Blue Chips"
              />

              <Autocomplete
                options={finishedProducts}
                getOptionLabel={(option) => `${option.name} (${option.sku})`}
                value={recipeFG}
                onChange={(e, val) => setRecipeFG(val)}
                renderInput={(params) => <TextField {...params} label="Finished Product Yield *" variant="outlined" size="small" />}
              />

              <TextField
                type="number"
                label="Expected Weight Loss (%)"
                value={recipeLoss}
                onChange={(e) => setRecipeLoss(e.target.value)}
                variant="outlined"
                size="small"
                fullWidth
              />

              <Divider sx={{ my: 1 }} />

              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Recipe Ingredients (Multipliers for 1 kg Yield)
              </Typography>

              {recipeItems.map((item, idx) => (
                <Grid container spacing={1} alignItems="center" key={idx}>
                  <Grid item xs={7}>
                    <Autocomplete
                      options={rawAndComponents}
                      getOptionLabel={(option) => `${option.name} (${option.sku})`}
                      value={item.product}
                      onChange={(e, val) => handleRecipeProductChange(idx, val)}
                      renderInput={(params) => <TextField {...params} label="Select Material" variant="outlined" size="small" />}
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      type="number"
                      label="Qty (KG)"
                      value={item.qty}
                      onChange={(e) => handleRecipeQtyChange(idx, e.target.value)}
                      variant="outlined"
                      size="small"
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={1}>
                    <IconButton onClick={() => handleRemoveRecipeItem(idx)} color="error" size="small">
                      <CloseIcon />
                    </IconButton>
                  </Grid>
                </Grid>
              ))}

              <Button
                variant="outlined"
                size="small"
                startIcon={<AddIcon />}
                onClick={handleAddRecipeItem}
                sx={{ alignSelf: 'flex-start' }}
              >
                Add Ingredient
              </Button>
            </Box>
          </DialogContent>

          <DialogActions sx={{ p: 2, pt: 0, gap: 1 }}>
            <Button onClick={() => setOpenRecipeModal(false)} variant="outlined" disabled={submitting} fullWidth={isMobile}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" color="primary" disabled={submitting} fullWidth={isMobile}>
              {submitting ? 'Saving...' : 'Save Recipe'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default RecyclingBOM;
