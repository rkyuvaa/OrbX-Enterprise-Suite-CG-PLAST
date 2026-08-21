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
          bottom: '-15mm', // Position inside the 22mm bottom page margin area
          left: '15mm', // Align with the 15mm left page margin
          alignItems: 'center',
          gap: 0.5,
          color: '#64748b',
          zIndex: 99999,
          backgroundColor: 'transparent',
          height: '10mm',
        }
      }}
    >
      <Typography
        sx={{
          color: '#94a3b8',
          fontSize: '10px',
          fontWeight: 500,
          fontFamily: 'Inter, -apple-system, sans-serif',
          lineHeight: 1,
        }}
      >
        Powered by
      </Typography>
      <Box
        component="img"
        src="/logo_light.png"
        alt="OrbX Logo"
        sx={{
          height: '10px', // Exact height requested by user (10px)
          width: 'auto',
          objectFit: 'contain',
          display: 'block',
          mx: 0.25,
        }}
      />
      <Typography
        sx={{
          color: '#94a3b8',
          fontSize: '10px',
          fontWeight: 500,
          fontFamily: 'Inter, -apple-system, sans-serif',
          lineHeight: 1,
        }}
      >
        -
      </Typography>
      <Link
        href={ORBX_WEBSITE_URL}
        target="_blank"
        rel="noopener noreferrer"
        sx={{
          color: '#64748b',
          textDecoration: 'none',
          fontWeight: 600,
          fontSize: '10px',
          fontFamily: 'Inter, -apple-system, sans-serif',
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
