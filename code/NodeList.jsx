// code/frontend/src/components/NodeList.jsx
import React, { useState } from 'react';
import { ListGroup, Badge, Form, InputGroup } from 'react-bootstrap';
import { Search } from 'react-bootstrap-icons';

const NodeList = ({ nodes, getNodeStatus, onNodeSelect, selectedNodeId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  
  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };
  
  // Handle filter change
  const handleFilterChange = (e) => {
    setFilter(e.target.value);
  };
  
  // Filter and sort nodes
  const filteredNodes = nodes
    .filter(node => {
      // Apply search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          node.name.toLowerCase().includes(searchLower) ||
          node.nodeId.toLowerCase().includes(searchLower)
        );
      }
      return true;
    })
    .filter(node => {
      // Apply status filter
      if (filter === 'all') return true;
      return getNodeStatus(node) === filter;
    })
    .sort((a, b) => {
      // Sort by status priority then by name
      const statusA = getNodeStatus(a);
      const statusB = getNodeStatus(b);
      
      // Define status priority (alert highest, then warning, normal, offline, unknown)
      const priority = {
        'alert': 0,
        'warning': 1,
        'normal': 2,
        'offline': 3,
        'unknown': 4
      };
      
      if (priority[statusA] !== priority[statusB]) {
        return priority[statusA] - priority[statusB];
      }
      
      // If same status, sort alphabetically by name
      return a.name.localeCompare(b.name);
    });
  
  // Get badge variant for status
  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'alert': return 'danger';
      case 'warning': return 'warning';
      case 'normal': return 'success';
      case 'offline': return 'secondary';
      default: return 'info';
    }
  };
  
  return (
    <div>
      <InputGroup className="mb-3">
        <InputGroup.Text>
          <Search />
        </InputGroup.Text>
        <Form.Control
          placeholder="Search nodes..."
          value={searchTerm}
          onChange={handleSearchChange}
        />
      </InputGroup>
      
      <Form.Group className="mb-3">
        <Form.Label>Filter by Status</Form.Label>
        <Form.Select value={filter} onChange={handleFilterChange}>
          <option value="all">All Nodes</option>
          <option value="alert">Alert</option>
          <option value="warning">Warning</option>
          <option value="normal">Normal</option>
          <option value="offline">Offline</option>
        </Form.Select>
      </Form.Group>
      
      {filteredNodes.length === 0 ? (
        <div className="text-center my-3">No nodes match the current filters</div>
      ) : (
        <ListGroup className="node-list">
          {filteredNodes.map(node => {
            const status = getNodeStatus(node);
            
            return (
              <ListGroup.Item
                key={node.nodeId}
                active={node.nodeId === selectedNodeId}
                action
                onClick={() => onNodeSelect(node.nodeId)}
                className="d-flex justify-content-between align-items-center"
              >
                <div>
                  <div className="fw-bold">{node.name}</div>
                  <small className="text-muted">{node.nodeId}</small>
                </div>
                <Badge bg={getStatusBadgeVariant(status)} pill>
                  {status}
                </Badge>
              </ListGroup.Item>
            );
          })}
        </ListGroup>
      )}
      
      <div className="mt-2 text-muted">
        {filteredNodes.length} {filteredNodes.length === 1 ? 'node' : 'nodes'} displayed
      </div>
    </div>
  );
};

export default NodeList;
