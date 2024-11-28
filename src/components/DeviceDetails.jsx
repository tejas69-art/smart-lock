import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { useAuth } from '../contexts/AuthContext';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, off, set, remove } from 'firebase/database';
import Swal from 'sweetalert2'; // For alert pop-up

// Firebase configuration
const firebaseConfig = {
  databaseURL: "https://craft-f3af3-default-rtdb.asia-southeast1.firebasedatabase.app/",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const DeviceDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [device, setDevice] = useState(null);
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [damageCount, setDamageCount] = useState(0);

  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else {
      const deviceRef = ref(db, `devices/${id}`);

      const handleData = (snapshot) => {
        const deviceData = snapshot.val();
        if (deviceData) {
          const vibrationValue = deviceData.vibration?.value || 0;

          // Check for vibration damage alert
          if (vibrationValue === 10) {
            Swal.fire({
              title: 'Damage Alert!',
              text: `High vibration detected for Device ${id}.`,
              icon: 'warning',
              confirmButtonText: 'OK',
            });

            setDamageCount((prevCount) => prevCount + 1);
          }

          setDevice({
            id,
            batteryPercentage: deviceData.heartbeat?.batteryPercentage || 'N/A',
            status: deviceData.heartbeat?.status || 'Unknown',
            location: deviceData.location?.value
              ? deviceData.location.value.split(',').map(Number)
              : [0, 0],
            payment: deviceData.payment?.value || null,
            vibration: deviceData.vibration?.value || 'No data',
            vehicleNumber: deviceData.vehicleNumber || '',
            open: deviceData.open?.value || 0, // Add open status
          });
          setVehicleNumber(deviceData.vehicleNumber || '');
        } else {
          setDevice(null);
        }
      };

      onValue(deviceRef, handleData);
      return () => off(deviceRef);
    }
  }, [id, user, navigate]);

  if (!device) {
    return <div className="container">Loading...</div>;
  }

  const handleToggleLock = () => {
    const openRef = ref(db, `devices/${id}/open`);
    
    if (device.open === 1) {
      // If already open, remove the open status
      remove(openRef)
        .then(() => {
          setDevice((prevDevice) => ({
            ...prevDevice,
            open: 0,
            status: 'Closed'
          }));
          Swal.fire('Device Closed', '', 'success');
        })
        .catch((error) => {
          console.error("Error closing device:", error);
          Swal.fire('Error', 'Failed to close device', 'error');
        });
    } else {
      // Set open status to 1
      set(openRef, { value: 1 })
        .then(() => {
          setDevice((prevDevice) => ({
            ...prevDevice,
            open: 1,
            status: 'Open'
          }));
          Swal.fire('Device Opened', '', 'success');
        })
        .catch((error) => {
          console.error("Error opening device:", error);
          Swal.fire('Error', 'Failed to open device', 'error');
        });
    }
  };

  const handleVehicleNumberSave = () => {
    const deviceRef = ref(db, `devices/${id}/vehicleNumber`);
    set(deviceRef, vehicleNumber).then(() => {
      setDevice((prevDevice) => ({
        ...prevDevice,
        vehicleNumber,
      }));
    });
  };

  const handleVehicleNumberDelete = () => {
    Swal.fire({
      title: 'Are you sure?',
      text: "Please verify the payment before returning!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Continue',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (result.isConfirmed) {
        const deviceRef = ref(db, `devices/${id}/vehicleNumber`);
        remove(deviceRef).then(() => {
          setDevice((prevDevice) => ({
            ...prevDevice,
            vehicleNumber: '',
          }));
          Swal.fire('Vehicle number removed!', '', 'success');
        });
      }
    });
  };

  return (
    <div className="device-list-container">
      <h2>Device {device.id}</h2>
      <div className="device-item">
        <div className="device-icon">📱</div>
        <div className="device-info">
          <span className="device-name">Device {device.id}</span>
          <span className="device-status">
            <span className="battery-icon">🔋</span> {device.batteryPercentage}% • {device.status}
          </span>
        </div>
      </div>
      <div className="map-container">
        <MapContainer center={device.location} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Marker position={device.location}>
            <Popup>Device {device.id} is here</Popup>
          </Marker>
        </MapContainer>
      </div>
      {device.payment && (
        <div className="payment-card">
          <h3>Payment Details</h3>
          <p>Amount: {device.payment} Rs</p>
        </div>
      )}
      <div>
        <h3>Vibration</h3>
        <p>Value: {device.vibration}</p>
        <p>Damage Alerts: {damageCount}</p>
      </div>
      <input
        type="text"
        placeholder="Enter Vehicle Number"
        value={vehicleNumber}
        onChange={(e) => setVehicleNumber(e.target.value)}
      />
      <button
        onClick={handleVehicleNumberSave}
        className="blue-button"
        disabled={device.vehicleNumber !== ''}
      >
        Save Vehicle Number
      </button>
      <button onClick={handleToggleLock} className="blue-button">
        {device.open === 1 ? 'Close Device' : 'Open Device'}
      </button>
      <button onClick={handleVehicleNumberDelete} className="secondary-button">
        Returned
      </button>
      <button onClick={() => navigate('/devices')} className="secondary-button">
        Back to List
      </button>
    </div>
  );
};

export default DeviceDetails;