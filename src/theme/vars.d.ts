// MUI v6's `createTheme({ cssVariables: {...} })` populates `theme.vars` at
// runtime, but the base `Theme` type doesn't declare it — these theme
// customization files (vendored from MUI's own dashboard template) use the
// `theme.vars || theme` fallback pattern throughout, so this augmentation
// adds the missing (optional) property rather than editing every call site.
import '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Theme {
    vars?: Theme;
  }
}
