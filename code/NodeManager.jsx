// code/frontend/src/components/NodeManager.jsx
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert, Spinner } from 'react-bootstrap';
import NodeMap from './NodeMap';
import NodeList from './NodeList';
import NodeDetails from './NodeDetails';
import NodeConfigModal from './NodeConfigModal';
import { fetchNodes, updateNodeConfig } from '../services/nodeService';
import { subscribeTopic, unsubscribeTopic } from '../services/mqttService';

const NodeManager = () => {
  const [nodes, setNodes] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [realtimeData, setRealtimeData] = useState({});

  // Fetch initial nodes data
  useEffect(() => {
    const loadNodes = async () => {
      try {
        setLoading(true);
        const nodesData = await fetchNodes();
        setNodes(nodesData);
        setLoading(false);
      } catch (err) {
        setError('Failed to load node data. Please try again later.');
        setLoading(false);
        console.error('Error loading nodes:', err);
      }
    };

    loadNodes();
  }, []);

  // Subscribe to MQTT topics for real-time updates when nodes change
  useEffect(() => {
    if (nodes.length === 0) return;

    // Subscribe to all nodes' data topics
    const topics = nodes.map(node => `wsn/nodes/${node.nodeId}/data`);
    
    const handleMessage = (topic, message) => {
      const nodeId = topic.split('/')[2];
      setRealtimeData(prev => ({
        ...prev,
        [nodeId]: JSON.parse(message)
      }));
    };

    topics.forEach(topic => subscribeTopic(topic, handleMessage));

    return () => {
      topics.forEach(topic => unsubscribeTopic(topic));
    };
  }, [nodes]);

  // Handle node selection
  const handleNodeSelect = (nodeId) => {
    const node = nodes.find(n => n.nodeId === nodeId);
    setSelectedNode(node);
  };

  // Handle node configuration updates
  const handleConfigUpdate = async (nodeId, config) => {
    try {
      await updateNodeConfig(nodeId, config);
      
      // Update local state
      setNodes(prevNodes => prevNodes.map(node => 
        node.nodeId === nodeId ? { ...node, config } : node
      ));
      
      setShowConfigModal(false);
    } catch (err) {
      setError('Failed to update node configuration. Please try again.');
      console.error('Error updating node config:', err);
    }
  };

  // Calculate node status based on last seen timestamp and sensor readings
  const getNodeStatus = (node) => {
    const realtimeNodeData = realtimeData[node.nodeId];
    
    if (!realtimeNodeData) return 'unknown';
    
    const lastSeen = new Date(realtimeNodeData.timestamp);
    const now = new Date();
    const diffMinutes = (now - lastSeen) / (1000 * 60);
    
    if (diffMinutes > 30) return 'offline';
    if (diffMinutes > 10) return 'warning';
    
    // Check if any sensor readings indicate fire risk
    const { temperature, humidity, smoke, co } = realtimeNodeData;
    if (
      temperature > node.config.thresholds.temperature ||
      humidity < node.config.thresholds.humidity ||
      smoke > node.config.thresholds.smoke ||
      co > node.config.thresholds.co
    ) {
      return 'alert';
    }
    
    return 'normal';
  };

  return (
    <Container fluid className="mt-3">
      {error && <Alert variant="danger">{error}</Alert>}
      
      <Row>
        <Col md={8}>
          <Card className="mb-3">
            <Card.Header>Node Deployment Map</Card.Header>
            <Card.Body>
              {loading ? (
                <div className="text-center">
                  <Spinner animation="border" />
                </div>
              ) : (
                <NodeMap 
                  nodes={nodes} 
                  realtimeData={realtimeData}
                  onNodeSelect={handleNodeSelect}
                  selectedNodeId={selectedNode?.nodeId}
                />
              )}
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={4}>
          <Card className="mb-3">
            <Card.Header>Node List</Card.Header>
            <Card.Body>
              {loading ? (
                <Spinner animation="border" />
              ) : (
                <NodeList 
                  nodes={nodes} 
                  getNodeStatus={getNodeStatus}
                  onNodeSelect={handleNodeSelect}
                  selectedNodeId={selectedNode?.nodeId}
                />
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      {selectedNode && (
        <Row>
          <Col md={12}>
            <Card>
              <Card.Header className="d-flex justify-content-between align-items-center">
                <span>Node Details: {selectedNode.name}</span>
                <Button 
                  variant="primary" 
                  size="sm"
                  onClick={() => setShowConfigModal(true)}
                >
                  Configure Node
                </Button>
              </Card.Header>
              <Card.Body>
                <NodeDetails 
                  node={selectedNode} 
                  realtimeData={realtimeData[selectedNode.nodeId]} 
                />
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
      
      {selectedNode && (
        <NodeConfigModal 
          show={showConfigModal}
          onHide={() => setShowConfigModal(false)}
          node={selectedNode}
          onSave={handleConfigUpdate}
        />
      )}
    </Container>
  );
};

export default NodeManager;
