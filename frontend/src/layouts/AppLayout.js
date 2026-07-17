import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Outlet, useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import {
  Box, AppBar, Toolbar, Typography, IconButton, Menu, MenuItem,
  Select, FormControl, Drawer, List, ListItem,
  ListItemButton, ListItemIcon, ListItemText, Divider, Avatar, Tooltip,
  Collapse, useTheme, useMediaQuery
} from '@mui/material';
import {
  Menu as MenuIcon,
  Logout as LogoutIcon,
  Home as HomeIcon,
  Warehouse as InventoryIcon,
  ShoppingBag as PurchaseIcon,
  ShoppingCart as SalesIcon,
  Loop as RecyclingIcon,
  Payments as PaymentReceiptIcon,
  AccountBalance as AccountBalanceIcon,
  Dashboard as ReportDashboardIcon,
  Business as CompanyIcon,
  Settings as AdminIcon,
  Inventory2 as ProductsIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  StackedBarChart as StockIcon,
  PriceCheck as ReceiveIcon,
  Payment as PayIcon,
  History as HistoryIcon,
  Backup as BackupIcon,
  People as CustomerIcon,
  LocalShipping as VendorIcon
} from '@mui/icons-material';

import { logoutUser, fetchUserProfile } from '../app/slices/authSlice';
import { fetchBranches, setActiveBranch } from '../app/slices/branchSlice';

const AppLayout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  
  // Responsive check: sidebar turns temporary on screens smaller than medium (960px)
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const { branches, activeBranchId } = useSelector((state) => state.branch);

  const [anchorEl, setAnchorEl] = React.useState(null);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const [expandedMenus, setExpandedMenus] = useState({});

  useEffect(() => {
    const p = location.pathname.toLowerCase();
    let activeKey = null;
    if (p.startsWith('/transactions/purchase') || p.startsWith('/masters/suppliers')) {
      activeKey = 'purchase';
    } else if (p.startsWith('/transactions/sales') || p.startsWith('/masters/customers')) {
      activeKey = 'sales';
    } else if (p.startsWith('/transactions/inventory') || p.startsWith('/masters/products')) {
      activeKey = 'inventory';
    } else if (p.startsWith('/transactions/receipts') || p.startsWith('/transactions/payments') || p.startsWith('/transactions/vendor-payments')) {
      activeKey = 'payments';
    } else if (p.startsWith('/reports') || p.startsWith('/transactions/customer-ledger') || p.startsWith('/transactions/supplier-ledger')) {
      activeKey = 'reports';
    } else if (p.startsWith('/admin')) {
      activeKey = 'admin';
    }

    if (activeKey) {
      setExpandedMenus({ [activeKey]: true });
    } else {
      setExpandedMenus({});
    }
  }, [location]);

  useEffect(() => {
    if (isAuthenticated && !user) {
      dispatch(fetchUserProfile());
    }
  }, [dispatch, isAuthenticated, user]);

  useEffect(() => {
    dispatch(fetchBranches());
  }, [dispatch]);

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleClose();
    dispatch(logoutUser());
    navigate('/login');
  };

  const handleBranchChange = (e) => {
    const selected = branches.find((b) => b.id === e.target.value);
    if (selected) {
      dispatch(setActiveBranch(selected));
    }
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  // Determine active module from path
  const path = location.pathname;
  const isDashboard = path === '/';

  const getPageInfo = () => {
    const p = path.toLowerCase();
    if (p.startsWith('/accounts/chart-of-accounts')) {
      return { title: 'Chart of Accounts', breadcrumbs: 'Dashboard > Accounts > Chart of Accounts' };
    }
    if (p.startsWith('/accounts/voucher-types')) {
      return { title: 'Voucher Configurations', breadcrumbs: 'Dashboard > Accounts > Voucher Configurations' };
    }
    if (p.startsWith('/accounts/trial-balance')) {
      return { title: 'Trial Balance', breadcrumbs: 'Dashboard > Accounts > Trial Balance' };
    }
    if (p.startsWith('/accounts/general-ledger')) {
      return { title: 'General Ledger', breadcrumbs: 'Dashboard > Accounts > General Ledger' };
    }
    if (p.startsWith('/accounts/day-book')) {
      return { title: 'Day Book', breadcrumbs: 'Dashboard > Accounts > Day Book' };
    }
    if (p.startsWith('/accounts/purchase-register')) {
      return { title: 'Purchase Register', breadcrumbs: 'Dashboard > Accounts > Purchase Register' };
    }
    if (p.startsWith('/accounts/sales-register')) {
      return { title: 'Sales Register', breadcrumbs: 'Dashboard > Accounts > Sales Register' };
    }
    if (p.startsWith('/accounts/balance-sheet')) {
      return { title: 'Balance Sheet', breadcrumbs: 'Dashboard > Accounts > Balance Sheet' };
    }
    if (p.startsWith('/accounts/profit-loss')) {
      return { title: 'Profit & Loss', breadcrumbs: 'Dashboard > Accounts > Profit & Loss' };
    }
    if (p.startsWith('/accounts/cash-flow')) {
      return { title: 'Cash Flow Statement', breadcrumbs: 'Dashboard > Accounts > Cash Flow' };
    }
    if (p.startsWith('/accounts/gst-returns')) {
      return { title: 'GST Returns', breadcrumbs: 'Dashboard > Accounts > GST Returns' };
    }
    if (p.startsWith('/accounts/tds-payable')) {
      return { title: 'TDS Payable', breadcrumbs: 'Dashboard > Accounts > TDS Payable' };
    }
    if (p.startsWith('/accounts/audit-trail')) {
      return { title: 'Audit Trail', breadcrumbs: 'Dashboard > Accounts > Audit Trail' };
    }
    if (p.startsWith('/accounts/cash-bank-books')) {
      return { title: 'Cash & Bank Books', breadcrumbs: 'Dashboard > Accounts > Cash & Bank Books' };
    }
    if (p.startsWith('/accounts/journal-register')) {
      return { title: 'Journal Register', breadcrumbs: 'Dashboard > Accounts > Journal Register' };
    }
    if (p.startsWith('/masters/customers')) {
      return { title: 'Customer Master', breadcrumbs: 'Dashboard > Customer Master' };
    }
    if (p.startsWith('/masters/suppliers')) {
      return { title: 'Supplier Master', breadcrumbs: 'Dashboard > Supplier Master' };
    }
    if (p.startsWith('/masters/products')) {
      return { title: 'Product Master', breadcrumbs: 'Dashboard > Product Master' };
    }
    if (p.startsWith('/transactions/purchase')) {
      return { title: 'Purchase Module', breadcrumbs: 'Dashboard > Purchase Module' };
    }
    if (p.startsWith('/transactions/inventory')) {
      return { title: 'Inventory Module', breadcrumbs: 'Dashboard > Inventory Module' };
    }
    if (p.startsWith('/transactions/transfers')) {
      return { title: 'Stock Transfers / DC', breadcrumbs: 'Dashboard > Stock Transfers & Delivery Challans' };
    }
    if (p.startsWith('/transactions/sales')) {
      return { title: 'Sales Module', breadcrumbs: 'Dashboard > Sales Module' };
    }
    if (p.startsWith('/transactions/receipts')) {
      return { title: 'Payment Receipt', breadcrumbs: 'Dashboard > Payment Receipt' };
    }
    if (p.startsWith('/transactions/payments')) {
      return { title: 'Payment Update', breadcrumbs: 'Dashboard > Payment Update' };
    }
    if (p.startsWith('/transactions/vendor-payments')) {
      return { title: 'Vendor Payments', breadcrumbs: 'Dashboard > Vendor Payments' };
    }
    if (p.startsWith('/transactions/customer-ledger')) {
      return { title: 'Customer Ledger Report', breadcrumbs: 'Dashboard > Customer Ledger' };
    }
    if (p.startsWith('/transactions/supplier-ledger')) {
      return { title: 'Supplier Ledger Report', breadcrumbs: 'Dashboard > Supplier Ledger' };
    }
    if (p.startsWith('/reports/dashboard')) {
      return { title: 'Reports Dashboard', breadcrumbs: 'Dashboard > Reports Dashboard' };
    }
    if (p.startsWith('/reports/sales-summary')) {
      return { title: 'Excel Sales Summary', breadcrumbs: 'Dashboard > Excel Sales Summary' };
    }
    if (p.startsWith('/reports/sales')) {
      return { title: 'Sales Reports', breadcrumbs: 'Dashboard > Sales Reports' };
    }
    if (p.startsWith('/reports/inventory')) {
      return { title: 'Inventory Reports', breadcrumbs: 'Dashboard > Inventory Reports' };
    }
    if (p.startsWith('/reports/purchase')) {
      return { title: 'Purchase Reports', breadcrumbs: 'Dashboard > Purchase Reports' };
    }
    if (p.startsWith('/admin/company')) {
      return { title: 'Company Config', breadcrumbs: 'Dashboard > Company Config' };
    }
    if (p.startsWith('/admin/companies') || p.startsWith('/admin/branches')) {
      return { title: 'Companies', breadcrumbs: 'Dashboard > Companies' };
    }
    if (p.startsWith('/admin/users')) {
      return { title: 'Users & Roles', breadcrumbs: 'Dashboard > Users & Roles' };
    }
    if (p.startsWith('/admin/backup')) {
      return { title: 'Backup & Restore', breadcrumbs: 'Dashboard > Backup & Restore' };
    }
    if (p.startsWith('/recycling/bom')) {
      return { title: 'BOM Templates', breadcrumbs: 'Dashboard > Recycling > BOM Templates' };
    }
    if (p.startsWith('/recycling')) {
      return { title: 'Recycling Process', breadcrumbs: 'Dashboard > Recycling' };
    }
    return { title: 'App Dashboard', breadcrumbs: 'Dashboard' };
  };

  const menuConfig = [
    {
      label: 'Purchase',
      id: 'purchase',
      icon: <PurchaseIcon />,
      color: '#E76F51',
      subItems: [
        { label: 'Purchase Module', to: '/transactions/purchase', icon: <PurchaseIcon /> },
        { label: 'Vendor Master', to: '/masters/suppliers', icon: <VendorIcon /> },
      ]
    },
    {
      label: 'Inventory',
      id: 'inventory',
      icon: <InventoryIcon />,
      color: '#9B5DE5',
      subItems: [
        { label: 'Products', to: '/masters/products', icon: <ProductsIcon /> },
        { label: 'Stock & Transfers', to: '/transactions/inventory', icon: <StockIcon /> },
      ]
    },
    {
      label: 'Sales',
      id: 'sales',
      icon: <SalesIcon />,
      color: '#F15BB5',
      subItems: [
        { label: 'Sales Module', to: '/transactions/sales', icon: <SalesIcon /> },
        { label: 'Customer Master', to: '/masters/customers', icon: <CustomerIcon /> },
      ]
    },
    {
      label: 'Recycling',
      id: 'recycling',
      icon: <RecyclingIcon />,
      color: '#1B4332',
      to: '/recycling'
    },
    {
      label: 'Receipts & Payments',
      id: 'payments',
      icon: <PaymentReceiptIcon />,
      color: '#43AA8B',
      subItems: [
        { label: 'Customer Receipts', to: '/transactions/payments', icon: <ReceiveIcon /> },
        { label: 'Vendor Payments', to: '/transactions/vendor-payments', icon: <PayIcon /> },
        { label: 'Receipts History', to: '/transactions/receipts', icon: <HistoryIcon /> },
      ]
    },
    {
      label: 'Reports',
      id: 'reports',
      icon: <ReportDashboardIcon />,
      color: '#FFB703',
      subItems: [
        { label: 'Analytics Dashboard', to: '/reports/dashboard', icon: <ReportDashboardIcon /> },
        { label: 'Sales Reports', to: '/reports/sales', icon: <SalesIcon /> },
        { label: 'Purchase Reports', to: '/reports/purchase', icon: <PurchaseIcon /> },
        { label: 'Customer Ledger', to: '/transactions/customer-ledger', icon: <ReceiveIcon /> },
        { label: 'Vendor Ledger', to: '/transactions/supplier-ledger', icon: <PayIcon /> },
        { label: 'Excel Sales Summary', to: '/reports/sales-summary', icon: <HistoryIcon /> }
      ]
    },
    {
      label: 'Settings',
      id: 'admin',
      icon: <AdminIcon />,
      color: '#4A5759',
      subItems: [
        { label: 'Company Config', to: '/admin/company', icon: <CompanyIcon /> },
        { label: 'Users & Roles', to: '/admin/users', icon: <AdminIcon /> },
        { label: 'Backup & Restore', to: '/admin/backup', icon: <BackupIcon /> }
      ]
    }
  ];

  const isMenuCategoryActive = (item) => {
    const p = path.toLowerCase();
    if (item.id === 'accounts') return p.startsWith('/accounts');
    if (item.id === 'purchase') return p.startsWith('/transactions/purchase') || p.startsWith('/masters/suppliers');
    if (item.id === 'inventory') return p.startsWith('/transactions/inventory') || p.startsWith('/transactions/transfers') || p.startsWith('/masters/products');
    if (item.id === 'sales') return p.startsWith('/transactions/sales') || p.startsWith('/masters/customers');
    if (item.id === 'payments') {
      return p.startsWith('/transactions/receipts') ||
             p.startsWith('/transactions/payments') ||
             p.startsWith('/transactions/vendor-payments');
    }
    if (item.id === 'reports') {
      return p.startsWith('/reports') ||
             p.startsWith('/transactions/customer-ledger') ||
             p.startsWith('/transactions/supplier-ledger');
    }
    if (item.id === 'admin') return p.startsWith('/admin');
    if (item.id === 'recycling') return p.startsWith('/recycling');
    return false;
  };

  const showSidebar = true;
  const isCollapsed = !desktopSidebarOpen && !isMobile;
  const currentDrawerWidth = isCollapsed ? 70 : 260;

  // Render contents of sidebar list
  const drawerContent = (
    <Box sx={{
      height: 'calc(100% - 64px)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      p: 1.5,
      boxSizing: 'border-box',
      overflowY: 'auto',
      '&::-webkit-scrollbar': {
        width: '5px',
      },
      '&::-webkit-scrollbar-track': {
        background: 'transparent',
      },
      '&::-webkit-scrollbar-thumb': {
        background: 'rgba(27, 67, 50, 0.15)',
        borderRadius: '10px',
      },
      '&::-webkit-scrollbar-thumb:hover': {
        background: 'rgba(27, 67, 50, 0.3)',
      }
    }}>
      <Box>
        {/* Hamburger Toggle at Top-Left of Sidebar (Desktop Only) */}
        {!isMobile && (
          <>
            <List sx={{ pt: 0, pb: 0.5, display: 'flex', justifyContent: isCollapsed ? 'center' : 'flex-start' }}>
              <ListItem disablePadding sx={{ display: 'flex', justifyContent: 'center' }}>
                <ListItemButton
                  onClick={() => setDesktopSidebarOpen(!desktopSidebarOpen)}
                  sx={{
                    borderRadius: '8px',
                    py: isCollapsed ? 0 : 0.75,
                    px: isCollapsed ? 0 : 1.75,
                    width: isCollapsed ? '42px' : '100%',
                    height: isCollapsed ? '42px' : 'auto',
                    justifyContent: isCollapsed ? 'center' : 'flex-start',
                    color: '#1b4332',
                    '&:hover': {
                      backgroundColor: 'rgba(27, 67, 50, 0.04)',
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: isCollapsed ? 0 : 36, justifyContent: 'center', color: '#1b4332' }}>
                    <MenuIcon />
                  </ListItemIcon>
                </ListItemButton>
              </ListItem>
            </List>
            <Divider sx={{ mb: 1.5, mt: 0.5 }} />
          </>
        )}

        <List sx={{ pt: 0, flexGrow: 1 }}>
          {/* Module Navigation items */}
          {menuConfig.map((item) => {
            const isActive = isMenuCategoryActive(item);
            const hasSubItems = item.subItems && item.subItems.length > 0;

            // Items with sub-menus (e.g. Inventory)
            if (hasSubItems) {
              return (
                <Box key={item.id} sx={{ mb: 0.25 }}>
                  <ListItem disablePadding sx={{ display: 'flex', justifyContent: 'center' }}>
                    <ListItemButton
                      onClick={() => {
                        setExpandedMenus(prev => ({
                          [item.id]: !prev[item.id]
                        }));
                      }}
                      selected={isActive}
                      sx={{
                        borderRadius: '8px',
                        py: isCollapsed ? 0 : 1,
                        px: isCollapsed ? 0 : 1.75,
                        width: isCollapsed ? '42px' : '100%',
                        height: isCollapsed ? '42px' : 'auto',
                        justifyContent: isCollapsed ? 'center' : 'flex-start',
                        color: isActive ? '#ffffff' : '#1b4332',
                        backgroundColor: isActive ? '#1b4332' : 'transparent',
                        transition: 'all 0.15s ease',
                        mb: 0.75,
                        '& .MuiListItemText-root .MuiTypography-root': { color: isActive ? '#ffffff' : '#1b4332' },
                        '&:hover': {
                          backgroundColor: isActive ? '#1b4332' : 'rgba(27, 67, 50, 0.04)',
                          '& .MuiListItemIcon-root': { color: isActive ? '#ffffff' : '#1b4332' },
                          '& .MuiListItemText-root .MuiTypography-root': { color: isActive ? '#ffffff' : '#1b4332' },
                        },
                        '&.Mui-selected': {
                          backgroundColor: '#1b4332', color: '#ffffff',
                          '& .MuiListItemText-root .MuiTypography-root': { color: '#ffffff' },
                          '& .MuiListItemIcon-root': { color: '#ffffff' },
                          '&:hover': { backgroundColor: '#1b4332' },
                        },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: isCollapsed ? 0 : 36, justifyContent: 'center', color: isActive ? '#ffffff' : '#1b4332' }}>
                        {item.icon}
                      </ListItemIcon>
                      {!isCollapsed && (
                        <>
                          <ListItemText
                            primary={item.label}
                            primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: isActive ? 700 : 500 }}
                          />
                          {!!expandedMenus[item.id] ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                        </>
                      )}
                    </ListItemButton>
                  </ListItem>

                  {/* Sub-items */}
                  {!isCollapsed && (
                    <Collapse in={!!expandedMenus[item.id]} timeout="auto" unmountOnExit>
                      <List disablePadding sx={{ pl: 1.5, mb: 0.75 }}>
                        {item.subItems.map((sub) => {
                          const subActive = path.toLowerCase() === sub.to.toLowerCase() ||
                            path.toLowerCase().startsWith(sub.to.toLowerCase() + '/');
                          return (
                            <ListItem key={sub.to} disablePadding sx={{ mb: 0.5 }}>
                              <ListItemButton
                                component={RouterLink}
                                to={sub.to}
                                onClick={isMobile ? handleDrawerToggle : undefined}
                                sx={{
                                  borderRadius: '8px',
                                  py: 0.75,
                                  px: 1.5,
                                  color: subActive ? '#1b4332' : '#4a7c59',
                                  backgroundColor: subActive ? 'rgba(27,67,50,0.1)' : 'transparent',
                                  borderLeft: subActive ? '3px solid #1b4332' : '3px solid transparent',
                                  fontWeight: subActive ? 700 : 500,
                                  transition: 'all 0.15s ease',
                                  '&:hover': {
                                    backgroundColor: 'rgba(27,67,50,0.06)',
                                    borderLeft: '3px solid #1b4332',
                                  },
                                }}
                              >
                                <ListItemIcon sx={{ minWidth: 30, color: subActive ? '#1b4332' : '#4a7c59' }}>
                                  {React.cloneElement(sub.icon, { fontSize: 'small' })}
                                </ListItemIcon>
                                <ListItemText
                                  primary={sub.label}
                                  primaryTypographyProps={{ fontSize: '0.8rem', fontWeight: subActive ? 700 : 500 }}
                                />
                              </ListItemButton>
                            </ListItem>
                          );
                        })}
                      </List>
                    </Collapse>
                  )}
                </Box>
              );
            }

            // Regular flat items
            return (
              <ListItem key={item.id} disablePadding sx={{ mb: 0.75, display: 'flex', justifyContent: 'center' }}>
                <ListItemButton
                  component={RouterLink}
                  to={item.to}
                  selected={isActive}
                  onClick={isMobile ? handleDrawerToggle : undefined}
                  sx={{
                    borderRadius: '8px',
                    py: isCollapsed ? 0 : 1,
                    px: isCollapsed ? 0 : 1.75,
                    width: isCollapsed ? '42px' : '100%',
                    height: isCollapsed ? '42px' : 'auto',
                    justifyContent: isCollapsed ? 'center' : 'flex-start',
                    color: isActive ? '#ffffff' : '#1b4332',
                    backgroundColor: isActive ? '#1b4332' : 'transparent',
                    transition: 'all 0.15s ease',
                    '& .MuiListItemText-root .MuiTypography-root': {
                      color: isActive ? '#ffffff' : '#1b4332',
                    },
                    '&:hover': {
                      backgroundColor: isActive ? '#1b4332' : 'rgba(27, 67, 50, 0.04)',
                      color: isActive ? '#ffffff' : '#1b4332',
                      '& .MuiListItemText-root .MuiTypography-root': {
                        color: isActive ? '#ffffff' : '#1b4332',
                      },
                      '& .MuiListItemIcon-root': {
                        color: isActive ? '#ffffff' : '#1b4332',
                      }
                    },
                    '&.Mui-selected': {
                      backgroundColor: '#1b4332',
                      color: '#ffffff',
                      '& .MuiListItemText-root .MuiTypography-root': {
                        color: '#ffffff',
                      },
                      '& .MuiListItemIcon-root': {
                        color: '#ffffff',
                      },
                      '&:hover': {
                        backgroundColor: '#1b4332',
                        color: '#ffffff',
                        '& .MuiListItemText-root .MuiTypography-root': {
                          color: '#ffffff',
                        },
                      },
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: isCollapsed ? 0 : 36, justifyContent: 'center', color: isActive ? '#ffffff' : '#1b4332' }}>
                    {item.icon}
                  </ListItemIcon>
                  {!isCollapsed && (
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{
                        fontSize: '0.85rem',
                        fontWeight: isActive ? 700 : 500,
                      }}
                    />
                  )}
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, backgroundColor: '#ffffff', color: 'text.primary', borderBottom: '1px solid #e2e8f0', boxShadow: 'none' }}>
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between', px: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Show/Hide Sidebar Toggle for Mobile only */}
            {isMobile && (
              <IconButton
                color="inherit"
                aria-label="toggle sidebar"
                edge="start"
                onClick={handleDrawerToggle}
                sx={{ color: '#1b4332', mr: 1 }}
              >
                <MenuIcon />
              </IconButton>
            )}

            <Box
              component={RouterLink}
              to="/"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
                textDecoration: 'none',
                color: 'inherit',
                cursor: 'pointer'
              }}
            >
              <Box
                component="img"
                src="/logo.svg"
                alt="OrbX Logo"
                sx={{
                  height: 42,
                  width: 'auto',
                  transition: 'transform 0.3s ease',
                  '&:hover': {
                    transform: 'rotate(8deg) scale(1.1)',
                  }
                }}
              />
              <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 800, fontSize: isSmallMobile ? '0.95rem' : '1.1rem', letterSpacing: '-0.3px', color: '#1b4332', lineHeight: 1 }}>
                OrbX {!isSmallMobile && <span style={{ fontWeight: 400, opacity: 0.8, color: '#334155' }}>Enterprise Suite</span>}
              </Typography>
            </Box>

            {!isDashboard && (
              <Box sx={{ display: 'flex', alignItems: 'center', ml: isSmallMobile ? 1 : 2.5, gap: isSmallMobile ? 1 : 1.5 }}>
                <Typography sx={{ color: '#cbd5e1', fontWeight: 300, fontSize: '1.2rem' }}>|</Typography>
                <Box>
                  <Typography sx={{ fontWeight: 700, color: '#0f172a', fontSize: isSmallMobile ? '0.85rem' : '0.95rem', lineHeight: 1.2 }}>
                    {getPageInfo().title}
                  </Typography>
                  {!isSmallMobile && (
                    <Typography sx={{ color: '#64748b', fontSize: '0.725rem', display: 'block', lineHeight: 1 }}>
                      {getPageInfo().breadcrumbs}
                    </Typography>
                  )}
                </Box>
              </Box>
            )}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: isSmallMobile ? 1.5 : 3 }}>
            {/* Multi-Company Selector */}
            {branches.length > 0 && (
              <FormControl size="small" sx={{ minWidth: isSmallMobile ? 120 : 160 }}>
                <Select
                  value={activeBranchId || ''}
                  onChange={handleBranchChange}
                  displayEmpty
                  sx={{
                    borderRadius: '10px',
                    backgroundColor: '#f1f5f9',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: isSmallMobile ? '0.75rem' : '0.85rem',
                    height: '36px',
                    '& .MuiOutlinedInput-notchedOutline': {
                      border: 'none',
                    }
                  }}
                >
                  {branches.map((b) => (
                    <MenuItem key={b.id} value={b.id}>
                      {isSmallMobile ? b.code : `${b.name} (${b.code})`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {/* User Profile Avatar and Dropdown */}
            {user && (
              <Box>
                <Tooltip title="Account settings">
                  <IconButton onClick={handleMenu} sx={{ p: 0 }}>
                    <Avatar sx={{ bgcolor: 'primary.main', width: 34, height: 34, fontSize: '0.85rem', fontWeight: 600 }}>
                      {user.full_name.charAt(0).toUpperCase()}
                    </Avatar>
                  </IconButton>
                </Tooltip>
                <Menu
                  id="menu-appbar"
                  anchorEl={anchorEl}
                  anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                  }}
                  keepMounted
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                  }}
                  open={Boolean(anchorEl)}
                  onClose={handleClose}
                  PaperProps={{
                    sx: {
                      mt: 1.5,
                      boxShadow: '0px 12px 30px rgba(0, 0, 0, 0.08)',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      minWidth: 180
                    }
                  }}
                >
                  <MenuItem onClick={handleClose} disabled sx={{ borderBottom: '1px solid #f1f5f9', py: 1.5 }}>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>{user.full_name}</Typography>
                      <Typography variant="caption" color="text.secondary">{user.email}</Typography>
                    </Box>
                  </MenuItem>
                  <MenuItem onClick={handleLogout} sx={{ py: 1.5, color: 'error.main', fontWeight: 600, fontSize: '0.875rem' }}>
                    <LogoutIcon fontSize="small" sx={{ mr: 1.5 }} />
                    Logout
                  </MenuItem>
                </Menu>
              </Box>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      {/* Sub-navigation Drawer Layout */}
      {showSidebar && (
        <Box component="nav">
          {/* Temporary Drawer for Mobile Screens */}
          {isMobile ? (
            <Drawer
              variant="temporary"
              open={mobileOpen}
              onClose={handleDrawerToggle}
              ModalProps={{
                keepMounted: true, // Better open performance on mobile
              }}
              sx={{
                display: { xs: 'block', md: 'none' },
                '& .MuiDrawer-paper': {
                  boxSizing: 'border-box',
                  width: 260,
                  borderRight: '1px solid #e2e8f0',
                  backgroundColor: '#ffffff',
                  color: 'text.primary',
                  boxShadow: '4px 0 24px rgba(0,0,0,0.05)'
                },
              }}
            >
              <Toolbar />
              {drawerContent}
            </Drawer>
          ) : (
            /* Permanent Drawer for Desktop Screens */
            <Drawer
              variant="permanent"
              sx={{
                display: { xs: 'none', md: 'block' },
                width: currentDrawerWidth,
                flexShrink: 0,
                transition: 'width 0.2s ease-in-out',
                [`& .MuiDrawer-paper`]: {
                  width: currentDrawerWidth,
                  boxSizing: 'border-box',
                  borderRight: '1px solid #e2e8f0',
                  backgroundColor: '#ffffff',
                  color: 'text.primary',
                  transition: 'width 0.2s ease-in-out',
                  overflow: 'hidden'
                },
              }}
            >
              <Toolbar />
              {drawerContent}
            </Drawer>
          )}
        </Box>
      )}

      {/* Core Workspace outlet container */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: isSmallMobile ? 2 : 3,
          pt: isDashboard ? (isSmallMobile ? 2 : 3) : 1,
          mt: 8,
          width: !isMobile ? `calc(100% - ${currentDrawerWidth}px)` : '100%',
          boxSizing: 'border-box',
          transition: 'all 0.2s ease-in-out',
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};

export default AppLayout;
