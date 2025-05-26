// code/frontend/src/components/NodeList.jsx
import React, { useState, useEffect } from 'react';
import { Table, Button, Badge, Form, InputGroup } from 'react-bootstrap';
import { Search, Settings, MapPin } from 'react-bootstrap-icons';

const NodeList = ({ onNodeSelect, onNodeConfigure, selectedNodeId }) => {
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  useEffect(() => {
    fetchNodes();
    const interval = setInterval(fetchNodes, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);
  
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
  
  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };
  
  const filteredNodes = nodes.filter(node => {
    const matchesSearch = node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         node.nodeId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || node.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
  
  if (loading) {
    return <div className="text-center">Loading nodes...</div>;
  }
  
  if (error) {
    return <div className="alert alert-danger">Error: {error}</div>;
  }
  
  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4>Sensor Nodes ({filteredNodes.length})</h4>
        <Button variant="outline-primary" onClick={fetchNodes}>
          Refresh
        </Button>
      </div>
      
      <div className="row mb-3">
        <div className="col-md-6">
          <InputGroup>
            <InputGroup.Text><Search /></InputGroup.Text>
            <Form.Control
              type="text"
              placeholder="Search by name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>
        </div>
        <div className="col-md-3">
          <Form.Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="online">Online</option>
            <option value="offline">Offline</option>
            <option value="warning">Warning</option>
            <option value="maintenance">Maintenance</option>
          </Form.Select>
        </div>
      </div>
      
      <Table striped bordered hover>
        <thead>
          <tr>
            <th>Node ID</th>
            <th>Name</th>
            <th>Status</th>
            <th>Risk Level</th>
            <th>Battery</th>
            <th>Last Seen</th>
            <th>Location</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredNodes.map(node => (
            <tr 
              key={node.nodeId} 
              className={selectedNodeId === node.nodeId ? 'table-active' : ''}
              style={{ cursor: 'pointer' }}
              onClick={() => onNodeSelect(node.nodeId)}
            >
              <td><code>{node.nodeId}</code></td>
              <td>{node.name}</td>
              <td>{getStatusBadge(node.status)}</td>
              <td>{getRiskBadge(node.currentRiskLevel)}</td>
              <td>
                <div className="d-flex align-items-center">
                  <div className="progress" style={{ width: '60px', height: '8px', marginRight: '8px' }}>
                    <div 
                      className="progress-bar" 
                      style={{ width: `${node.batteryLevel}%` }}
                    ></div>
                  </div>
                  {node.batteryLevel}%
                </div>
              </td>
              <td>{formatTimestamp(node.lastSeen)}</td>
              <td>
                {node.location && node.location.latitude ? (
                  <span>
                    <MapPin size={14} />
                    {node.location.latitude.toFixed(4)}, {node.location.longitude.toFixed(4)}
                  </span>
                ) : (
                  <span className="text-muted">No location</span>
                )}
              </td>
              <td>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onNodeConfigure(node);
                  }}
                >
                  <Settings size={14} />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      
      {filteredNodes.length === 0 && (
        <div className="text-center text-muted py-4">
          No nodes found matching the current filters.
        </div>
      )}
    </div>
  );
};

export default NodeList;