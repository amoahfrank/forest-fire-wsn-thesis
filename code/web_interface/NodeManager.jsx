// code/frontend/src/components/NodeManager.jsx
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert } from 'react-bootstrap';
import NodeList from './NodeList';
import NodeDetails from './NodeDetails';
import NodeConfigModal from './NodeConfigModal';

const NodeManager = () => {
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configNode, setConfigNode] = useState(null);
  const [alert, setAlert] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const handleNodeSelect = (nodeId) => {
    setSelectedNodeId(nodeId);
  };
  
  const handleNodeConfigure = (node) => {
    setConfigNode(node);
    setShowConfigModal(true);
  };
  
  const handleConfigSave = async (nodeId, config) => {
    try {
      const response = await fetch(`/api/nodes/${nodeId}/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update node configuration');
      }
      
      setAlert({
        type: 'success',
        message: 'Node configuration updated successfully'
      });
      
      setShowConfigModal(false);
      setRefreshTrigger(prev => prev + 1);
      
      // Clear alert after 5 seconds
      setTimeout(() => setAlert(null), 5000);
      
    } catch (error) {
      setAlert({
        type: 'danger',
        message: `Error updating configuration: ${error.message}`
      });
    }
  };
  
  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };
  
  return (
    <Container fluid>
      {alert && (
        <Alert variant={alert.type} dismissible onClose={() => setAlert(null)}>
          {alert.message}
        </Alert>
      )}
      
      <Row>
        <Col md={selectedNodeId ? 5 : 12}>
          <Card>
            <Card.Body>
              <NodeList
                onNodeSelect={handleNodeSelect}
                onNodeConfigure={handleNodeConfigure}
                selectedNodeId={selectedNodeId}
                refreshTrigger={refreshTrigger}
              />
            </Card.Body>
          </Card>
        </Col>
        
        {selectedNodeId && (
          <Col md={7}>
            <Card>
              <Card.Body>
                <NodeDetails
                  nodeId={selectedNodeId}
                  onEdit={handleNodeConfigure}
                  onRefresh={handleRefresh}
                  refreshTrigger={refreshTrigger}
                />
              </Card.Body>
            </Card>
          </Col>
        )}
      </Row>
      
      <NodeConfigModal
        show={showConfigModal}
        onHide={() => setShowConfigModal(false)}
        node={configNode}
        onSave={handleConfigSave}
      />
    </Container>
  );
};

export default NodeManager;