import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { KeyRound, ChevronRight, Battery } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, off, remove } from 'firebase/database';
import { Button, CircularProgress, Typography, Box } from '@mui/material';

const firebaseConfig = {
  databaseURL:"https://craft-f3af3-default-rtdb.asia-southeast1.firebasedatabase.app/",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const DeviceList = () => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const heartbeatTracker = useState({}); // Tracks the last known heartbeat for each device

  const HEARTBEAT_TIMEOUT = 30000; 

  useEffect(() => {
    const heartbeatRef = ref(db, 'devices');

    const handleData = (snapshot) => {
      try {
        const data = snapshot.val();
        if (data) {
          const devicesArray = Object.entries(data).map(([id, deviceInfo]) => ({
            id,
            heartbeat: deviceInfo.heartbeat.heartbeatCount,
            batteryPercentage: deviceInfo.heartbeat.batteryPercentage,
            status: deviceInfo.heartbeat.status,
          }));

          setDevices(devicesArray);
          setLoading(false);

          // Update heartbeat tracker
          devicesArray.forEach((device) => {
            heartbeatTracker[device.id] = device.heartbeat;
          });
        } else {
          setDevices([]);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error processing data:', err);
        setError('Error processing data');
        setLoading(false);
      }
    };

    const handleError = (err) => {
      console.error('Firebase error:', err);
      setError(err.message);
      setLoading(false);
    };

    onValue(heartbeatRef, handleData, handleError);
    return () => off(heartbeatRef);
  }, []);

  useEffect(() => {
    const intervalId = setInterval(() => {
      devices.forEach((device) => {
        const lastHeartbeat = heartbeatTracker[device.id];

        // Check if heartbeat has not changed
        if (lastHeartbeat !== undefined && lastHeartbeat === device.heartbeat) {
          console.warn(`Removing device ${device.id} due to inactive heartbeat.`);
          const deviceRef = ref(db, `devices/${device.id}`);
          remove(deviceRef).then(() => {
            setDevices((prevDevices) =>
              prevDevices.filter((d) => d.id !== device.id)
            );
          });
        } else {
          // Update the heartbeat tracker with the current value
          heartbeatTracker[device.id] = device.heartbeat;
        }
      });
    }, HEARTBEAT_TIMEOUT);

    return () => clearInterval(intervalId); // Cleanup on component unmount
  }, [devices, heartbeatTracker]);

  const getBatteryColor = (percentage) => {
    if (percentage === null || percentage === undefined) return 'text-gray-400';
    if (percentage >= 60) return 'text-green-500';
    if (percentage >= 30) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getStatusColor = (status) => {
    if (!status) return 'text-gray-500';
    const lowercaseStatus = status.toLowerCase();
    if (lowercaseStatus === 'offline') return 'text-gray-500';
    if (lowercaseStatus.includes('locked')) return 'text-red-500';
    if (lowercaseStatus === 'unlocked') return 'text-green-500';
    return 'text-blue-500';
  };

  const handleLogout = () => {
    // Handle logout logic here, such as clearing authentication tokens
    console.log("User logged out");
    // You could redirect to a login page or a public page after logging out
    navigate('/login'); // Example, redirecting to the login page
  };

  if (loading) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" minHeight="100vh">
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" minHeight="100vh">
        <Typography variant="h6" color="error">
          Error: {error}
        </Typography>
      </Box>
    );
  }

  const handleDeviceClick = (deviceId) => {
    navigate(`/devices/${deviceId}`);
  };

  return (
    <Box minHeight="100vh" bgcolor="white" p={4}>
      <Card className="w-full max-w-4xl mx-auto shadow-none">
        <CardHeader className="px-4 py-6">
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <CardTitle>Active Devices</CardTitle>
          </Box>
        </CardHeader>
        <CardContent className="p-0">
          <Box display="flex" flexDirection="column" gap={2}>
            {devices.map((device) => (
              <Box
                key={device.id}
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                p={2}
                border={1}
                borderColor="grey.300"
                borderRadius="5px"
                sx={{ '&:hover': { backgroundColor: '#f9f9f9', cursor: 'pointer' } }}
                onClick={() => handleDeviceClick(device.id)}
              >
                <Box display="flex" alignItems="center" gap={1.5}>
                  <KeyRound className="h-6 w-6 text-gray-500" />
                  <Box>
                    <Typography variant="body1">Device: {device.id}</Typography>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Battery className={`h-4 w-4 ${getBatteryColor(device.batteryPercentage)}`} />
                      <Typography
                        variant="body2"
                        className={getBatteryColor(device.batteryPercentage)}
                      >
                        {device.batteryPercentage !== null
                          ? `${device.batteryPercentage}%`
                          : 'N/A'}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        •
                      </Typography>
                      <Typography
                        variant="body2"
                        className={getStatusColor(device.status)}
                      >
                        {device.status || 'Unknown'}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>

      {/* Logout Button */}
      <Box mt={4} display="flex" justifyContent="center">
        <Button
          variant="contained"
          color="secondary"
          size="large"
          onClick={handleLogout}
          sx={{
            width: '200px',
            boxShadow: 3,
            '&:hover': { boxShadow: 6 },
          }}
        >
          Logout
        </Button>
      </Box>
    </Box>
  );
};

export default DeviceList;
