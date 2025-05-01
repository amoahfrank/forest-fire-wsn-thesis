// code/frontend/src/components/NodeMap.jsx
import React, { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Alert } from 'react-bootstrap';

// Fix icon paths in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const NodeMap = ({ nodes, realtimeData, onNodeSelect, selectedNodeId }) => {
  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const markersRef = useRef({});
  
  // Initialize map
  useEffect(() => {
    if (!mapRef.current) return;
    
    // Create map if not already initialized
    if (!leafletMap.current) {
      leafletMap.current = L.map(mapRef.current).setView([-1.9441, 30.0619], 13); // Default to Rwanda coordinates
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(leafletMap.current);
    }
    
    // Clean up on unmount
    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, []);
  
  // Update map markers when nodes change
  useEffect(() => {
    if (!leafletMap.current || !nodes.length) return;
    
    // Clear existing markers
    Object.values(markersRef.current).forEach(marker => {
      leafletMap.current.removeLayer(marker);
    });
    markersRef.current = {};
    
    // Calculate map bounds to fit all nodes
    const bounds = L.latLngBounds(nodes.map(node => [node.location.latitude, node.location.longitude]));
    leafletMap.current.fitBounds(bounds, { padding: [50, 50] });
    
    // Add markers for each node
    nodes.forEach(node => {
      const nodeStatus = getNodeStatus(node);
      const markerIcon = createMarkerIcon(nodeStatus);
      
      const marker = L.marker([node.location.latitude, node.location.longitude], { icon: markerIcon })
        .addTo(leafletMap.current)
        .bindPopup(createPopupContent(node, realtimeData?.[node.nodeId]))
        .on('click', () => {
          onNodeSelect(node.nodeId);
        });
      
      markersRef.current[node.nodeId] = marker;
    });
  }, [nodes, onNodeSelect]);
  
  // Update markers when realtime data changes
  useEffect(() => {
    if (!leafletMap.current || !nodes.length) return;
    
    nodes.forEach(node => {
      const marker = markersRef.current[node.nodeId];
      if (marker) {
        const nodeStatus = getNodeStatus(node);
        const newIcon = createMarkerIcon(nodeStatus);
        marker.setIcon(newIcon);
        marker.setPopupContent(createPopupContent(node, realtimeData?.[node.nodeId]));
      }
    });
  }, [realtimeData, nodes]);
  
  // Highlight selected node
  useEffect(() => {
    if (!leafletMap.current || !selectedNodeId) return;
    
    const marker = markersRef.current[selectedNodeId];
    if (marker) {
      marker.openPopup();
      leafletMap.current.panTo(marker.getLatLng());
    }
  }, [selectedNodeId]);
  
  // Create marker icon based on node status
  const createMarkerIcon = (status) => {
    let iconUrl = '';
    
    switch (status) {
      case 'normal':
        iconUrl = '/icons/marker-green.png';
        break;
      case 'warning':
        iconUrl = '/icons/marker-yellow.png';
        break;
      case 'alert':
        iconUrl = '/icons/marker-red.png';
        break;
      case 'offline':
        iconUrl = '/icons/marker-gray.png';
        break;
      default:
        iconUrl = '/icons/marker-blue.png';
    }
    
    return L.icon({
      iconUrl,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34]
    });
  };
  
  // Create popup content
  const createPopupContent = (node, data) => {
    let content = `<div><strong>${node.name}</strong> (${node.nodeId})<br/>`;
    
    if (data) {
      content += `
        <table style="margin-top: 10px;">
          <tr><td>Temperature:</td><td>${data.temperature} °C</td></tr>
          <tr><td>Humidity:</td><td>${data.humidity} %</td></tr>
          <tr><td>Battery:</td><td>${data.battery} %</td></tr>
          <tr><td>Last update:</td><td>${new Date(data.timestamp).toLocaleTimeString()}</td></tr>
        </table>
        <button class="popup-details-btn" data-node-id="${node.nodeId}">View Details</button>
      `;
    } else {
      content += '<p>No data available</p>';
    }
    
    content += '</div>';
    return content;
  };
  
  // Determine node status based on realtime data
  const getNodeStatus = (node) => {
    const data = realtimeData?.[node.nodeId];
    
    if (!data) return 'unknown';
    
    const lastSeen = new Date(data.timestamp);
    const now = new Date();
    const diffMinutes = (now - lastSeen) / (1000 * 60);
    
    if (diffMinutes > 30) return 'offline';
    if (diffMinutes > 10) return 'warning';
    
    // Check if any sensor readings indicate fire risk
    const { temperature, humidity, smoke, co } = data;
    if (
      temperature > node.config?.thresholds?.temperature ||
      humidity < node.config?.thresholds?.humidity ||
      smoke > node.config?.thresholds?.smoke ||
      co > node.config?.thresholds?.co
    ) {
      return 'alert';
    }
    
    return 'normal';
  };
  
  // Handle popup button clicks
  useEffect(() => {
    if (!leafletMap.current) return;
    
    const handlePopupClick = (e) => {
      if (e.target && e.target.classList.contains('popup-details-btn')) {
        const nodeId = e.target.getAttribute('data-node-id');
        if (nodeId) {
          onNodeSelect(nodeId);
        }
      }
    };
    
    leafletMap.current.on('popupopen', (e) => {
      const popup = e.popup;
      if (popup && popup._contentNode) {
        popup._contentNode.addEventListener('click', handlePopupClick);
      }
    });
    
    leafletMap.current.on('popupclose', (e) => {
      const popup = e.popup;
      if (popup && popup._contentNode) {
        popup._contentNode.removeEventListener('click', handlePopupClick);
      }
    });
  }, [onNodeSelect]);
  
  if (!nodes || nodes.length === 0) {
    return <Alert variant="info">No nodes available to display on map</Alert>;
  }
  
  return (
    <div 
      ref={mapRef} 
      style={{ height: '500px', width: '100%', zIndex: 1 }}
      className="leaflet-container"
    />
  );
};

export default NodeMap;
