// code/frontend/src/components/NodeMap.js
import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import { Card, Badge, Button, Form } from 'react-bootstrap';
import L from 'leaflet';

// Custom marker icons
const createNodeIcon = (status, riskLevel) => {
  let color = '#28a745'; // green for normal
  
  if (status === 'offline') color = '#6c757d'; // gray
  else if (status === 'warning') color = '#ffc107'; // yellow
  else if (riskLevel >= 3) color = '#dc3545'; // red for high risk
  else if (riskLevel >= 2) color = '#fd7e14'; // orange for moderate risk
  
  return L.divIcon({
    className: 'custom-node-marker',
    html: `<div style="
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background-color: ${color};
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });
};

const NodeMap = ({ onNodeSelect, selectedNodeId }) => {
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showRiskAreas, setShowRiskAreas] = useState(true);
  const [center, setCenter] = useState([9.0579, -1.2921]); // Ghana coordinates
  const [zoom, setZoom] = useState(8);
  const mapRef = useRef(null);
  
  useEffect(() => {
    fetchNodes();
    const interval = setInterval(fetchNodes, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);
  
  useEffect(() => {
    // Auto-center map when nodes are loaded
    if (nodes.length > 0) {
      const validNodes = nodes.filter(node => 
        node.location && 
        node.location.latitude && 
        node.location.longitude
      );
      
      if (validNodes.length > 0) {
        const avgLat = validNodes.reduce((sum, node) => sum + node.location.latitude, 0) / validNodes.length;
        const avgLng = validNodes.reduce((sum, node) => sum + node.location.longitude, 0) / validNodes.length;
        setCenter([avgLat, avgLng]);
        setZoom(12);
      }
    }
  }, [nodes]);
  
  const fetchNodes = async () => {
    try {
      const response = await fetch('/api/nodes');
      if (!response.ok) {
        throw new Error('Failed to fetch nodes');
      }
      const data = await response.json();
      setNodes(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
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
  
  const getRiskAreaRadius = (riskLevel) => {
    const radiusMap = {
      0: 50,   // 50m for normal
      1: 75,   // 75m for low
      2: 100,  // 100m for moderate
      3: 150,  // 150m for high
      4: 200,  // 200m for critical
      5: 250   // 250m for extreme
    };
    return radiusMap[riskLevel] || 50;
  };
  
  const getRiskAreaColor = (riskLevel) => {
    const colorMap = {
      0: '#28a745', // green
      1: '#17a2b8', // cyan
      2: '#ffc107', // yellow
      3: '#fd7e14', // orange
      4: '#dc3545', // red
      5: '#6f42c1'  // purple
    };
    return colorMap[riskLevel] || '#28a745';
  };
  
  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };
  
  const validNodes = nodes.filter(node => 
    node.location && 
    node.location.latitude && 
    node.location.longitude
  );
  
  if (loading) {
    return <div className="text-center">Loading map...</div>;
  }
  
  if (error) {
    return <div className="alert alert-danger">Error: {error}</div>;
  }
  
  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4>Network Map ({validNodes.length} nodes)</h4>
        <div>
          <Form.Check
            type="switch"
            id="show-risk-areas"
            label="Show Risk Areas"
            checked={showRiskAreas}
            onChange={(e) => setShowRiskAreas(e.target.checked)}
            className="me-3 d-inline-block"
          />
          <Button variant="outline-primary" onClick={fetchNodes}>
            Refresh
          </Button>
        </div>
      </div>
      
      <Card>
        <Card.Body className="p-0">
          <div style={{ height: '600px' }}>
            <MapContainer
              ref={mapRef}
              center={center}
              zoom={zoom}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap contributors'
              />
              
              {validNodes.map(node => (
                <React.Fragment key={node.nodeId}>
                  {/* Risk area circle */}
                  {showRiskAreas && (
                    <Circle
                      center={[node.location.latitude, node.location.longitude]}
                      radius={getRiskAreaRadius(node.currentRiskLevel)}
                      pathOptions={{
                        fillColor: getRiskAreaColor(node.currentRiskLevel),
                        fillOpacity: 0.2,
                        color: getRiskAreaColor(node.currentRiskLevel),
                        weight: 2,
                        opacity: 0.6
                      }}
                    />
                  )}
                  
                  {/* Node marker */}
                  <Marker
                    position={[node.location.latitude, node.location.longitude]}
                    icon={createNodeIcon(node.status, node.currentRiskLevel)}
                    eventHandlers={{
                      click: () => onNodeSelect && onNodeSelect(node.nodeId)
                    }}
                  >
                    <Popup>
                      <div style={{ minWidth: '200px' }}>
                        <h6>{node.name}</h6>
                        <p><small><code>{node.nodeId}</code></small></p>
                        
                        <div className="mb-2">
                          <strong>Status:</strong> {getStatusBadge(node.status)}
                        </div>
                        
                        <div className="mb-2">
                          <strong>Risk Level:</strong> {getRiskBadge(node.currentRiskLevel)}
                        </div>
                        
                        {node.latestReading && (
                          <div className="mb-2">
                            <small>
                              <strong>Latest Reading:</strong><br/>
                              Temp: {node.latestReading.temperature}°C<br/>
                              Humidity: {node.latestReading.humidity}%<br/>
                              Smoke: {node.latestReading.smoke} ppm<br/>
                              CO: {node.latestReading.co} ppm
                            </small>
                          </div>
                        )}
                        
                        <div className="mb-2">
                          <small>
                            <strong>Battery:</strong> {node.batteryLevel}%<br/>
                            <strong>Last Seen:</strong> {formatTimestamp(node.lastSeen)}
                          </small>
                        </div>
                        
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => onNodeSelect && onNodeSelect(node.nodeId)}
                        >
                          View Details
                        </Button>
                      </div>
                    </Popup>
                  </Marker>
                </React.Fragment>
              ))}
            </MapContainer>
          </div>
        </Card.Body>
      </Card>
      
      {validNodes.length === 0 && (
        <div className="text-center text-muted py-4">
          No nodes with valid location data found.
        </div>
      )}
    </div>
  );
};

export default NodeMap;