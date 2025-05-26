// code/frontend/src/components/NodeDetails.jsx
import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Badge, Button, Alert, Table } from 'react-bootstrap';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';

const NodeDetails = ({ nodeId, onEdit, onRefresh }) => {
  const [node, setNode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sensorData, setSensorData] = useState([]);
  
  useEffect(() => {
    if (nodeId) {
      fetchNodeDetails();
      fetchSensorData();
    }
  }, [nodeId]);
  
  const fetchNodeDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/nodes/${nodeId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch node details');
      }
      const data = await response.json();
      setNode(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchSensorData = async () => {
    try {
      const response = await fetch(`/api/nodes/${nodeId}/data?limit=10`);
      if (response.ok) {
        const data = await response.json();
        setSensorData(data);
      }
    } catch (err) {
      console.error('Failed to fetch sensor data:', err);
    }
  };
  
  const getStatusBadge = (status) => {
    const variants = {
      'online': 'success',
      'offline': 'danger',
      'warning': 'warning',
      'maintenance': 'secondary'
    };
    return <Badge bg={variants[status] || 'secondary'}>{status.toUpperCase()}</Badge>;
  };
  
  const getRiskBadge = (riskLevel) => {
    const variants = {
      0: { variant: 'success', text: 'NORMAL' },
      1: { variant: 'info', text: 'LOW' },
      2: { variant: 'warning', text: 'MODERATE' },
      3: { variant: 'warning', text: 'HIGH' },
      4: { variant: 'danger', text: 'CRITICAL' },
      5: { variant: 'danger', text: 'EXTREME' }
    };
    const risk = variants[riskLevel] || { variant: 'secondary', text: 'UNKNOWN' };
    return <Badge bg={risk.variant}>{risk.text}</Badge>;
  };
  
  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };
  
  if (loading) {
    return <div className="text-center">Loading node details...</div>;
  }
  
  if (error) {
    return <Alert variant="danger">Error: {error}</Alert>;
  }
  
  if (!node) {
    return <Alert variant="warning">Node not found</Alert>;
  }
  
  return (
    <div>
      <Row className="mb-4">
        <Col>
          <h2>{node.name} ({node.nodeId})</h2>
          <p className="text-muted">{node.description}</p>
        </Col>
        <Col xs="auto">
          <Button variant="outline-primary" onClick={() => onEdit(node)} className="me-2">
            Configure
          </Button>
          <Button variant="outline-secondary" onClick={onRefresh}>
            Refresh
          </Button>
        </Col>
      </Row>
      
      <Row>
        <Col md={6}>
          <Card className="mb-4">
            <Card.Header>
              <h5>Node Status</h5>
            </Card.Header>
            <Card.Body>
              <Table borderless>
                <tbody>
                  <tr>
                    <td><strong>Status:</strong></td>
                    <td>{getStatusBadge(node.status)}</td>
                  </tr>
                  <tr>
                    <td><strong>Risk Level:</strong></td>
                    <td>{getRiskBadge(node.currentRiskLevel)}</td>
                  </tr>
                  <tr>
                    <td><strong>Last Seen:</strong></td>
                    <td>{formatTimestamp(node.lastSeen)}</td>
                  </tr>
                  <tr>
                    <td><strong>Battery:</strong></td>
                    <td>{node.batteryLevel}%</td>
                  </tr>
                  <tr>
                    <td><strong>Solar:</strong></td>
                    <td>{node.solarVoltage}V</td>
                  </tr>
                  <tr>
                    <td><strong>Signal:</strong></td>
                    <td>{node.signalStrength} dBm</td>
                  </tr>
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={6}>
          <Card className="mb-4">
            <Card.Header>
              <h5>Current Readings</h5>
            </Card.Header>
            <Card.Body>
              {node.latestReading ? (
                <Table borderless>
                  <tbody>
                    <tr>
                      <td><strong>Temperature:</strong></td>
                      <td>{node.latestReading.temperature}°C</td>
                    </tr>
                    <tr>
                      <td><strong>Humidity:</strong></td>
                      <td>{node.latestReading.humidity}%</td>
                    </tr>
                    <tr>
                      <td><strong>Smoke:</strong></td>
                      <td>{node.latestReading.smoke} ppm</td>
                    </tr>
                    <tr>
                      <td><strong>CO:</strong></td>
                      <td>{node.latestReading.co} ppm</td>
                    </tr>
                    <tr>
                      <td><strong>Flame:</strong></td>
                      <td>{node.latestReading.flame ? 'DETECTED' : 'NONE'}</td>
                    </tr>
                    <tr>
                      <td><strong>Reading Time:</strong></td>
                      <td>{formatTimestamp(node.latestReading.timestamp)}</td>
                    </tr>
                  </tbody>
                </Table>
              ) : (
                <p className="text-muted">No recent readings available</p>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      <Row>
        <Col md={6}>
          <Card className="mb-4">
            <Card.Header>
              <h5>Location</h5>
            </Card.Header>
            <Card.Body>
              {node.location && node.location.latitude && node.location.longitude ? (
                <div>
                  <p><strong>Coordinates:</strong> {node.location.latitude}, {node.location.longitude}</p>
                  <p><strong>Altitude:</strong> {node.location.altitude}m</p>
                  <div style={{ height: '200px' }}>
                    <MapContainer
                      center={[node.location.latitude, node.location.longitude]}
                      zoom={15}
                      style={{ height: '100%', width: '100%' }}
                    >
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; OpenStreetMap contributors'
                      />
                      <Marker position={[node.location.latitude, node.location.longitude]}>
                        <Popup>{node.name}</Popup>
                      </Marker>
                    </MapContainer>
                  </div>
                </div>
              ) : (
                <p className="text-muted">Location data not available</p>
              )}
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={6}>
          <Card className="mb-4">
            <Card.Header>
              <h5>Configuration</h5>
            </Card.Header>
            <Card.Body>
              {node.config ? (
                <Table borderless>
                  <tbody>
                    <tr>
                      <td><strong>Sample Interval:</strong></td>
                      <td>{node.config.sampleInterval}s</td>
                    </tr>
                    <tr>
                      <td><strong>Transmit Interval:</strong></td>
                      <td>{node.config.transmitInterval}s</td>
                    </tr>
                    <tr>
                      <td><strong>Low Power Mode:</strong></td>
                      <td>{node.config.lowPowerMode ? 'Enabled' : 'Disabled'}</td>
                    </tr>
                    <tr>
                      <td><strong>Alerts:</strong></td>
                      <td>{node.config.alertEnabled ? 'Enabled' : 'Disabled'}</td>
                    </tr>
                  </tbody>
                </Table>
              ) : (
                <p className="text-muted">Configuration not available</p>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      <Row>
        <Col>
          <Card>
            <Card.Header>
              <h5>Recent Sensor Data</h5>
            </Card.Header>
            <Card.Body>
              {sensorData.length > 0 ? (
                <Table striped bordered hover>
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Temp (°C)</th>
                      <th>Humidity (%)</th>
                      <th>Smoke (ppm)</th>
                      <th>CO (ppm)</th>
                      <th>Flame</th>
                      <th>Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sensorData.map((reading, index) => (
                      <tr key={index}>
                        <td>{formatTimestamp(reading.timestamp)}</td>
                        <td>{reading.temperature}</td>
                        <td>{reading.humidity}</td>
                        <td>{reading.smoke}</td>
                        <td>{reading.co}</td>
                        <td>{reading.flame ? 'YES' : 'NO'}</td>
                        <td>{getRiskBadge(reading.riskLevel)}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <p className="text-muted">No recent sensor data available</p>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default NodeDetails;