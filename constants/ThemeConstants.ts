export const Theme = {
  colors: {
    // Primary (background/main accent)
    primary: '#16325b',

    // Highlight/Primary Action (e.g., buttons, active states)
    highlight: '#8850ef',

    // Secondary/Hover/Pressed state (e.g., button hover, selected items)
    secondary: '#631976',

    // Semantic Colors (Mapped or preserved)
    textPrimary: '#333333', // Preserved for text readability (was old secondary)
    textSecondary: '#666666',
    
    background: '#f8f9fa',
    white: '#FFFFFF',
    
    // Status Colors
    error: '#ff0000',
    success: '#41D094',
    warning: '#FFA500',
    
    // UI Specific
    tableHeader: '#E9E3D5',
    inputBorder: '#ddd',
    inputBackground: '#f9f9f9',
  },
  
  // Helper to get hex with opacity if needed later
  // alpha: (color: string, opacity: number) => ...
};
