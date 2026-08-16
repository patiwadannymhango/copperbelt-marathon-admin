import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
      }}
    >
      <Paper component="form" onSubmit={handleSubmit} variant="outlined" sx={{ p: 4, width: '100%', maxWidth: 360 }}>
        <Typography variant="overline" color="primary" fontWeight={700}>
          Copperbelt Marathon 2026
        </Typography>
        <Typography variant="h6" fontWeight={800}>
          Registrations
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Admin sign in
        </Typography>

        <Stack spacing={2}>
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
            fullWidth
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            fullWidth
          />
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        <Button type="submit" variant="contained" fullWidth sx={{ mt: 3 }} disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
      </Paper>
    </Box>
  );
}
