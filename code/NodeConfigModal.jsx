// code/frontend/src/components/NodeConfigModal.jsx
import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col, Alert } from 'react-bootstrap';

const NodeConfigModal = ({ show, onHide, node, onSave }) => {
  const [config, setConfig] = useState({
    name: '',
    sampleInterval: 300,
    transmitInterval: 900,
    thresholds: {
      temperature: 50,
      humidity: 30,
      smoke: 100,
      co: 70
    },
    lowPowerMode: false,
    alertEnabled: true
  });
  
  const [validated, setValidated] = useState(false);
  const [error, setError] = useState(null);
  
  // Initialize form with node config when node changes
  useEffect(() => {
    if (node && node.config) {
      setConfig({
        ...node.config,
        // Make sure all required fields exist
        thresholds: {
          temperature: node.config.thresholds?.temperature || 50,
          humidity: node.config.thresholds?.humidity || 30,
          smoke: node.config.thresholds?.smoke || 100,
          co: node.config.thresholds?.co || 70
        }
      });
    }
  }, [node]);
  
  const handleSubmit = (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    
    if (form.checkValidity() === false) {
      event.stopPropagation();
      setValidated(true);
      return;
    }
    
    // Validate threshold values
    if (config.thresholds.temperature < 30 || config.thresholds.temperature > 100) {
      setError('Temperature threshold must be between 30°C and 100°C');
      return;
    }
    
    if (config.thresholds.humidity < 0 || config.thresholds.humidity > 100) {
      setError('Humidity threshold must be between 0% and 100%');
      return;
    }
    
    if (config.thresholds.smoke < 0) {
      setError('Smoke threshold must be a positive value');
      return;
    }
    
    if (config.thresholds.co < 0) {
      setError('CO threshold must be a positive value');
      return;
    }
    
    // Clear any errors
    setError(null);
    
    // Save changes
    onSave(node.nodeId, config);
  };
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Handle checkboxes
    if (type === 'checkbox') {
      setConfig(prev => ({
        ...prev,
        [name]: checked
      }));
      return;
    }
    
    // Handle numeric fields
    if (type === 'number') {
      setConfig(prev => ({
        ...prev,
        [name]: parseInt(value, 10)
      }));
      return;
    }
    
    // Handle regular text fields
    setConfig(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleThresholdChange = (e) => {
    const { name, value } = e.target;
    
    setConfig(prev => ({
      ...prev,
      thresholds: {
        ...prev.thresholds,
        [name]: parseInt(value, 10)
      }
    }));
  };
  
  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Configure Node: {node?.name}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        
        <Form noValidate validated={validated} onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Node Name</Form.Label>
            <Form.Control
              type="text"
              name="name"
              value={config.name}
              onChange={handleChange}
              required
            />
            <Form.Control.Feedback type="invalid">
              Please provide a node name.
            </Form.Control.Feedback>
          </Form.Group>
          
          <Row className="mb-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label>Sample Interval (seconds)</Form.Label>
                <Form.Control
                  type="number"
                  name="sampleInterval"
                  value={config.sampleInterval}
                  onChange={handleChange}
                  min={10}
                  max={3600}
                  required
                />
                <Form.Text className="text-muted">
                  How often the node collects sensor data (10s - 3600s)
                </Form.Text>
                <Form.Control.Feedback type="invalid">
                  Please provide a valid sample interval between 10s and 3600s.
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
            
            <Col md={6}>
              <Form.Group>
                <Form.Label>Transmit Interval (seconds)</Form.Label>
                <Form.Control
                  type="number"
                  name="transmitInterval"
                  value={config.transmitInterval}
                  onChange={handleChange}
                  min={60}
                  max={86400}
                  required
                />
                <Form.Text className="text-muted">
                  How often the node transmits data (60s - 86400s)
                </Form.Text>
                <Form.Control.Feedback type="invalid">
                  Please provide a valid transmit interval between 60s and 86400s.
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
          </Row>
          
          <h5>Alert Thresholds</h5>
          <Row className="mb-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label>Temperature Threshold (°C)</Form.Label>
                <Form.Control
                  type="number"
                  name="temperature"
                  value={config.thresholds.temperature}
                  onChange={handleThresholdChange}
                  min={30}
                  max={100}
                  required
                />
                <Form.Text className="text-muted">
                  Alert when temperature exceeds this value
                </Form.Text>
              </Form.Group>
            </Col>
            
            <Col md={6}>
              <Form.Group>
                <Form.Label>Humidity Threshold (%)</Form.Label>
                <Form.Control
                  type="number"
                  name="humidity"
                  value={config.thresholds.humidity}
                  onChange={handleThresholdChange}
                  min={0}
                  max={100}
                  required
                />
                <Form.Text className="text-muted">
                  Alert when humidity falls below this value
                </Form.Text>
              </Form.Group>
            </Col>
          </Row>
          
          <Row className="mb-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label>Smoke Threshold (ppm)</Form.Label>
                <Form.Control
                  type="number"
                  name="smoke"
                  value={config.thresholds.smoke}
                  onChange={handleThresholdChange}
                  min={0}
                  required
                />
                <Form.Text className="text-muted">
                  Alert when smoke exceeds this value
                </Form.Text>
              </Form.Group>
            </Col>
            
            <Col md={6}>
              <Form.Group>
                <Form.Label>CO Threshold (ppm)</Form.Label>
                <Form.Control
                  type="number"
                  name="co"
                  value={config.thresholds.co}
                  onChange={handleThresholdChange}
                  min={0}
                  required
                />
                <Form.Text className="text-muted">
                  Alert when CO exceeds this value
                </Form.Text>
              </Form.Group>
            </Col>
          </Row>
          
          <Row className="mb-3">
            <Col md={6}>
              <Form.Group>
                <Form.Check
                  type="switch"
                  id="lowPowerMode"
                  label="Low Power Mode"
                  name="lowPowerMode"
                  checked={config.lowPowerMode}
                  onChange={handleChange}
                />
                <Form.Text className="text-muted">
                  Reduces power consumption by disabling non-essential sensors
                </Form.Text>
              </Form.Group>
            </Col>
            
            <Col md={6}>
              <Form.Group>
                <Form.Check
                  type="switch"
                  id="alertEnabled"
                  label="Enable Alerts"
                  name="alertEnabled"
                  checked={config.alertEnabled}
                  onChange={handleChange}
                />
                <Form.Text className="text-muted">
                  Enables sending of alert notifications
                </Form.Text>
              </Form.Group>
            </Col>
          </Row>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSubmit}>
          Save Changes
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default NodeConfigModal;
