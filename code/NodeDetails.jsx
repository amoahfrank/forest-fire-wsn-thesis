// code/frontend/src/components/NodeDetails.jsx
import React from 'react';
import { Row, Col, Table, Badge, Card, ProgressBar } from 'react-bootstrap';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const NodeDetails = ({ node, realtimeData }) => {
  if (!node) return <div>No node selected</div>;
  
  // Format timestamp to local date and time
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };
  
  // Get status badge variant
  const getStatusVariant = (status) => {
    switch (status) {
      case 'normal': return 'success';
      case 'warning': return 'warning';
      case 'alert': return 'danger';
      case 'offline': return 'secondary';
      default: return 'info';
    }
  };
  
  // Get battery status and color
  const getBatteryStatus = () => {
    if (!realtimeData?.battery) return { level: 'N/A', variant: 'secondary' };
    
    const level = realtimeData.battery;
    let variant = 'success';
    
    if (level < 20) variant = 'danger';
    else if (level < 40) variant = 'warning';
    
    return { level: `${level}%`, variant };
  };
  
  // Calculate solar charging status
  const getSolarStatus = () => {
    if (!realtimeData?.solarVoltage) return 'N/A';
    
    const voltage = realtimeData.solarVoltage;
    if (voltage < 0.5) return 'Not charging';
    if (voltage < 3.0) return 'Low charging';
    if (voltage < 4.0) return 'Medium charging';
    return 'Optimal charging';
  };
  
  const batteryInfo = getBatteryStatus();
  
  // Prepare sensor data for display
  const sensorData = realtimeData ? [
    { name: 'Temperature', value: realtimeData.temperature, unit: '°C', threshold: node.config?.thresholds?.temperature },
    { name: 'Humidity', value: realtimeData.humidity, unit: '%', threshold: node.config?.thresholds?.humidity, compare: 'below' },
    { name: 'Smoke', value: realtimeData.smoke, unit: 'ppm', threshold: node.config?.thresholds?.smoke },
    { name: 'CO', value: realtimeData.co, unit: 'ppm', threshold: node.config?.thresholds?.co },
    { name: 'Flame Detected', value: realtimeData.flameDetected ? 'Yes' : 'No', unit: '', threshold: null }
  ] : [];
  
  // Prepare historical data for charts
  const historyData = node.history?.map(record => ({
    time: new Date(record.timestamp).toLocaleTimeString(),
    temperature: record.temperature,
    humidity: record.humidity,
    smoke: record.smoke,
    co: record.co
  })) || [];
  
  return (
    <Row>
      <Col md={6}>
        <Card className="mb-3">
          <Card.Header>Node Information</Card.Header>
          <Card.Body>
            <Table bordered>
              <tbody>
                <tr>
                  <td><strong>Node ID</strong></td>
                  <td>{node.nodeId}</td>
                </tr>
                <tr>
                  <td><strong>Name</strong></td>
                  <td>{node.name}</td>
                </tr>
                <tr>
                  <td><strong>Location</strong></td>
                  <td>{node.location.latitude}, {node.location.longitude}</td>
                </tr>
                <tr>
                  <td><strong>Status</strong></td>
                  <td>
                    <Badge bg={getStatusVariant(node.status)}>
                      {node.status}
                    </Badge>
                  </td>
                </tr>
                <tr>
                  <td><strong>Last Seen</strong></td>
                  <td>{formatTimestamp(realtimeData?.timestamp)}</td>
                </tr>
                <tr>
                  <td><strong>Firmware Version</strong></td>
                  <td>{node.firmwareVersion}</td>
                </tr>
                <tr>
                  <td><strong>Battery Level</strong></td>
                  <td>
                    <ProgressBar 
                      variant={batteryInfo.variant} 
                      now={parseInt(batteryInfo.level) || 0} 
                      label={batteryInfo.level} 
                    />
                  </td>
                </tr>
                <tr>
                  <td><strong>Solar Charging</strong></td>
                  <td>{getSolarStatus()}</td>
                </tr>
                <tr>
                  <td><strong>RSSI</strong></td>
                  <td>{realtimeData?.rssi || 'N/A'} dBm</td>
                </tr>
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      </Col>
      
      <Col md={6}>
        <Card className="mb-3">
          <Card.Header>Sensor Readings</Card.Header>
          <Card.Body>
            <Table bordered>
              <thead>
                <tr>
                  <th>Sensor</th>
                  <th>Reading</th>
                  <th>Threshold</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {sensorData.map((sensor, index) => {
                  let isAlert = false;
                  if (sensor.threshold !== null) {
                    if (sensor.compare === 'below') {
                      isAlert = sensor.value < sensor.threshold;
                    } else {
                      isAlert = sensor.value > sensor.threshold;
                    }
                  }
                  
                  return (
                    <tr key={index}>
                      <td>{sensor.name}</td>
                      <td>{sensor.value} {sensor.unit}</td>
                      <td>{sensor.threshold !== null ? `${sensor.compare === 'below' ? '<' : '>'} ${sensor.threshold} ${sensor.unit}` : 'N/A'}</td>
                      <td>
                        <Badge bg={isAlert ? 'danger' : 'success'}>
                          {isAlert ? 'Alert' : 'Normal'}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      </Col>
      
      <Col md={12}>
        <Card className="mb-3">
          <Card.Header>Historical Data</Card.Header>
          <Card.Body>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={historyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="temperature" stroke="#ff7300" name="Temperature (°C)" />
                <Line yAxisId="left" type="monotone" dataKey="humidity" stroke="#387908" name="Humidity (%)" />
                <Line yAxisId="right" type="monotone" dataKey="smoke" stroke="#999999" name="Smoke (ppm)" />
                <Line yAxisId="right" type="monotone" dataKey="co" stroke="#ff0000" name="CO (ppm)" />
              </LineChart>
            </ResponsiveContainer>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
};

export default NodeDetails;
