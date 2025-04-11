import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  Button,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Typography,
  Divider,
  CircularProgress,
  Box,
  Paper,
  Container,
  Grid,
  Chip,
  Alert,
  IconButton,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ComputerIcon from '@mui/icons-material/Computer';
import NetworkCheckIcon from '@mui/icons-material/NetworkCheck';

const API_URL = 'http://192.168.4.4:5000';

const IPAMAdminPanel = () => {
  const [subnets, setSubnets] = useState([]);
  const [selectedSubnet, setSelectedSubnet] = useState('');
  const [usedIps, setUsedIps] = useState([]);
  const [freeIps, setFreeIps] = useState([]);
  const [newName, setNewName] = useState('');
  const [confirmRelease, setConfirmRelease] = useState({ open: false, ip: '', name: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/subnets`)
      .then(res => res.json())
      .then(data => setSubnets(data))
      .catch(err => {
        console.error('Fout bij ophalen subnets:', err);
        setError('Kon subnetdata niet ophalen.');
      });
  }, []);

  useEffect(() => {
    if (selectedSubnet) {
      setLoading(true);
      fetch(`${API_URL}/subnet/${encodeURIComponent(selectedSubnet)}`)
        .then(res => {
          if (!res.ok) throw new Error('Subnet niet gevonden');
          return res.json();
        })
        .then(data => {
          setUsedIps(data.used);
          setFreeIps(data.free);
        })
        .catch(err => {
          console.error('Fout bij ophalen IP data:', err);
          setUsedIps([]);
          setFreeIps([]);
          setError('Kon IP data niet ophalen.');
        })
        .finally(() => setLoading(false));
    }
  }, [selectedSubnet]);

  const reserveIp = () => {
    fetch(`${API_URL}/next-ip?name=${encodeURIComponent(newName)}&subnet=${encodeURIComponent(selectedSubnet)}`)
      .then(res => res.json())
      .then(() => {
        setNewName('');
        return fetch(`${API_URL}/subnet/${encodeURIComponent(selectedSubnet)}`);
      })
      .then(res => res.json())
      .then(data => {
        setUsedIps(data.used);
        setFreeIps(data.free);
      })
      .catch(err => {
        console.error('Fout bij reserveren IP:', err);
        setError('Er is een fout opgetreden bij het reserveren van het IP.');
      });
  };

  const releaseIp = (ip, name) => {
    fetch(`${API_URL}/ip?name=${encodeURIComponent(name)}&subnet=${encodeURIComponent(selectedSubnet)}`, {
      method: 'DELETE',
    })
      .then(() => fetch(`${API_URL}/subnet/${encodeURIComponent(selectedSubnet)}`))
      .then(res => res.json())
      .then(data => {
        setUsedIps(data.used);
        setFreeIps(data.free);
      })
      .catch(err => {
        console.error('Fout bij vrijgeven IP:', err);
        setError('Er is een fout opgetreden bij het vrijgeven van het IP.');
      });
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Paper 
          elevation={3} 
          sx={{ 
            borderRadius: 2, 
            overflow: 'hidden',
            border: '1px solid #e0e0e0',
          }}
        >
          <Box 
            sx={{ 
              p: 2, 
              backgroundColor: '#1976d2', 
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: 2
            }}
          >
            <NetworkCheckIcon />
            <Typography variant="h5" component="h1" fontWeight="500">
              IPAM Admin Panel
            </Typography>
          </Box>
          
          <Box sx={{ p: 3 }}>
            {/* Subnet select dropdown */}
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel id="subnet-select-label">Subnet</InputLabel>
              <Select
                labelId="subnet-select-label"
                value={selectedSubnet}
                label="Subnet"
                onChange={(e) => setSelectedSubnet(e.target.value)}
              >
                {subnets.map(subnet => (
                  <MenuItem key={subnet} value={subnet}>{subnet}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Display Error Message */}
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            {/* Loading indicator */}
            {loading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
                <CircularProgress />
              </Box>
            )}

            {/* Reserve IP Section */}
            {selectedSubnet && !loading && (
              <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Reserveer IP
                </Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    label="Naam"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    fullWidth
                    size="small"
                  />
                  <Button
                    variant="contained"
                    onClick={reserveIp}
                    disabled={!newName}
                    sx={{ whiteSpace: 'nowrap' }}
                  >
                    Reserveer
                  </Button>
                </Box>
              </Paper>
            )}

            {/* Displaying Used IPs */}
            {!loading && usedIps.length > 0 && (
              <Box sx={{ mb: 5 }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ComputerIcon fontSize="small" color="primary" />
                  Gebruikte IP-adressen ({usedIps.length})
                </Typography>
                <Grid container spacing={2}>
                  {usedIps.map((entry) => (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={entry.ip}>
                      <Paper 
                        variant="outlined" 
                        sx={{ 
                          p: 1.5,
                          display: 'flex', 
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          borderLeft: '4px solid #1976d2',
                          height: '100%',
                          minHeight: '60px',
                          maxHeight: '80px'
                        }}
                      >
                        <Box sx={{ maxWidth: '75%' }}>
                          <Typography variant="subtitle2" fontWeight="bold">{entry.ip}</Typography>
                          <Typography variant="body2" color="text.secondary" noWrap>{entry.name || '-'}</Typography>
                        </Box>
                        {entry.name && (
                          <IconButton 
                            color="error" 
                            size="small"
                            onClick={() => setConfirmRelease({ open: true, ip: entry.ip, name: entry.name })}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}

            {/* Divider between sections */}
            {!loading && usedIps.length > 0 && freeIps.length > 0 && (
              <Divider sx={{ my: 3 }} />
            )}

            {/* Displaying Free IPs */}
            {!loading && freeIps.length > 0 && (
              <Box>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <NetworkCheckIcon fontSize="small" color="success" />
                  Beschikbare IP-adressen ({freeIps.length})
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {freeIps.map((ip) => (
                    <Chip 
                      key={ip} 
                      label={ip} 
                      variant="outlined" 
                      size="small"
                      sx={{ borderColor: '#4caf50', color: '#2e7d32' }}
                    />
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        </Paper>
      </Box>

      {/* Confirmation Dialog */}
      <Dialog 
        open={confirmRelease.open} 
        onClose={() => setConfirmRelease({ open: false, ip: '', name: '' })}
      >
        <DialogTitle>Bevestig vrijgave</DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Weet je zeker dat je IP <strong>{confirmRelease.ip}</strong> met naam <strong>{confirmRelease.name}</strong> wilt vrijgeven?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmRelease({ open: false, ip: '', name: '' })}>
            Annuleren
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              releaseIp(confirmRelease.ip, confirmRelease.name);
              setConfirmRelease({ open: false, ip: '', name: '' });
            }}
          >
            Vrijgeven
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default IPAMAdminPanel;
