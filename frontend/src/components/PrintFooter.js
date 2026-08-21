import React from 'react';
import { Box, Link, Typography } from '@mui/material';
import { ORBX_WEBSITE_URL } from '../config';

const PrintFooter = () => {
  return (
    <Box
      className="orbx-print-footer"
      sx={{
        display: 'none', // Hidden on screen preview
        '@media print': {
          display: 'flex',
          position: 'fixed',
          bottom: '-15mm', // Position inside the page margin area
          left: 0,
          right: 0,
          justifyContent: 'center',
          alignItems: 'center',
          gap: 1.5,
          color: '#64748b',
          zIndex: 99999,
          backgroundColor: 'transparent',
          height: '10mm',
        }
      }}
    >
      <Box
        component="img"
        src="/logo_light.png"
        alt="OrbX Logo"
        sx={{
          height: '14px',
          width: 'auto',
          objectFit: 'contain',
          display: 'block',
        }}
      />
      <Typography
        variant="caption"
        sx={{
          color: '#94a3b8',
          fontWeight: 700,
          fontSize: '0.8rem',
          lineHeight: 1,
        }}
      >
        ·
      </Typography>
      <Link
        href={ORBX_WEBSITE_URL}
        target="_blank"
        rel="noopener noreferrer"
        sx={{
          color: '#64748b', // Muted gray text
          textDecoration: 'none',
          fontWeight: 600,
          fontSize: '0.75rem',
          lineHeight: 1,
          '&:hover': {
            textDecoration: 'underline',
          }
        }}
      >
        orbx.in
      </Link>
    </Box>
  );
};

export default PrintFooter;
