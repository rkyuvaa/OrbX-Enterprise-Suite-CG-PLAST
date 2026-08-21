/**
 * Formats a FastAPI validation error or detail object/array into a readable string.
 * Prevents React from crashing when rendering object errors in JSX.
 */
export const getErrorMessage = (detail) => {
  if (typeof detail === 'string') return detail;
  
  if (Array.isArray(detail)) {
    return detail
      .map((err) => {
        const fieldName = err.loc ? err.loc[err.loc.length - 1] : '';
        return fieldName && fieldName !== 'body' ? `${fieldName}: ${err.msg}` : err.msg;
      })
      .join(', ');
  }
  
  if (typeof detail === 'object' && detail !== null) {
    return detail.msg || detail.message || JSON.stringify(detail);
  }
  
  return null;
};
