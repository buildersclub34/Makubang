
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, Clock, Phone, MessageCircle } from "lucide-react";

interface DeliveryLocation {
  lat: number;
  lng: number;
  timestamp: Date;
}

interface LiveTrackingMapProps {
  orderId: string;
  deliveryPartnerId: string;
  pickupLocation: { lat: number; lng: number; address: string };
  deliveryLocation: { lat: number; lng: number; address: string };
  currentLocation: DeliveryLocation;
  estimatedTime: number;
  status: string;
  partnerInfo: {
    name: string;
    phone: string;
    vehicleType: string;
    vehicleNumber: string;
    rating: number;
  };
}

export default function LiveTrackingMap({
  orderId,
  deliveryPartnerId,
  pickupLocation,
  deliveryLocation,
  currentLocation,
  estimatedTime,
  status,
  partnerInfo
}: LiveTrackingMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [deliveryMarker, setDeliveryMarker] = useState<any>(null);
  const [route, setRoute] = useState<any>(null);

  // Initialize Google Maps
  useEffect(() => {
    if (mapRef.current && !map) {
      const googleMap = new (window as any).google.maps.Map(mapRef.current, {
        center: currentLocation,
        zoom: 14,
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }]
          }
        ]
      });

      // Add pickup marker
      new (window as any).google.maps.Marker({
        position: pickupLocation,
        map: googleMap,
        title: "Pickup Location",
        icon: {
          url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 24 24' fill='%234CAF50'%3E%3Cpath d='M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5'/%3E%3C/svg%3E",
          scaledSize: new (window as any).google.maps.Size(32, 32)
        }
      });

      // Add delivery marker
      new (window as any).google.maps.Marker({
        position: deliveryLocation,
        map: googleMap,
        title: "Delivery Location",
        icon: {
          url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 24 24' fill='%23FF6B35'%3E%3Cpath d='M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z'/%3E%3C/svg%3E",
          scaledSize: new (window as any).google.maps.Size(32, 32)
        }
      });

      // Add delivery partner marker
      const partnerMarker = new (window as any).google.maps.Marker({
        position: currentLocation,
        map: googleMap,
        title: `${partnerInfo.name} - ${partnerInfo.vehicleType}`,
        icon: {
          url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 24 24' fill='%232196F3'%3E%3Cpath d='M19 7c0-1.1-.9-2-2-2h-3v2h3v2.65L13.52 14H10V9H6c-2.21 0-4 1.79-4 4v3h2c0 1.66 1.34 3 3 3s3-1.34 3-3h4.48L19 10.35V7zM7 17c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z'/%3E%3Cpath d='M5 6h5v2H5zm14 7c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zm0 4c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z'/%3E%3C/svg%3E",
          scaledSize: new (window as any).google.maps.Size(32, 32)
        }
      });

      setMap(googleMap);
      setDeliveryMarker(partnerMarker);

      // Draw route
      const directionsService = new (window as any).google.maps.DirectionsService();
      const directionsRenderer = new (window as any).google.maps.DirectionsRenderer({
        polylineOptions: {
          strokeColor: "#2196F3",
          strokeWeight: 4
        },
        suppressMarkers: true
      });

      directionsRenderer.setMap(googleMap);

      const destination = status === 'picked_up' || status === 'in_transit' 
        ? deliveryLocation 
        : pickupLocation;

      directionsService.route({
        origin: currentLocation,
        destination: destination,
        travelMode: (window as any).google.maps.TravelMode.DRIVING,
      }, (result: any, status: any) => {
        if (status === 'OK') {
          directionsRenderer.setDirections(result);
          setRoute(result);
        }
      });
    }
  }, [mapRef.current]);

  // Update delivery partner location in real-time
  useEffect(() => {
    if (deliveryMarker && currentLocation) {
      deliveryMarker.setPosition(currentLocation);
      if (map) {
        map.panTo(currentLocation);
      }
    }
  }, [currentLocation, deliveryMarker, map]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned': return 'bg-yellow-500';
      case 'picked_up': return 'bg-blue-500';
      case 'in_transit': return 'bg-purple-500';
      case 'delivered': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'assigned': return 'Order Assigned';
      case 'picked_up': return 'Order Picked Up';
      case 'in_transit': return 'On the Way';
      case 'delivered': return 'Delivered';
      default: return 'Unknown';
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center space-x-2">
            <Navigation className="w-5 h-5" />
            <span>Live Tracking</span>
          </CardTitle>
          <Badge className={getStatusColor(status)}>
            {getStatusText(status)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Map Container */}
        <div ref={mapRef} className="w-full h-80 rounded-lg mb-6 bg-gray-200" />

        {/* Delivery Partner Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Delivery Partner</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Name:</span>
                  <span className="font-medium">{partnerInfo.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Vehicle:</span>
                  <span className="font-medium">{partnerInfo.vehicleType} - {partnerInfo.vehicleNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Rating:</span>
                  <div className="flex items-center space-x-1">
                    <span className="font-medium">{partnerInfo.rating}</span>
                    <span className="text-yellow-500">★</span>
                  </div>
                </div>
                <div className="flex space-x-2 mt-4">
                  <Button size="sm" className="flex-1">
                    <Phone className="w-4 h-4 mr-1" />
                    Call
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1">
                    <MessageCircle className="w-4 h-4 mr-1" />
                    Message
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Delivery Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${status === 'assigned' || status === 'picked_up' || status === 'in_transit' || status === 'delivered' ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className="text-sm">Order Assigned</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${status === 'picked_up' || status === 'in_transit' || status === 'delivered' ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className="text-sm">Picked Up from Restaurant</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${status === 'in_transit' || status === 'delivered' ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className="text-sm">On the Way</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${status === 'delivered' ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className="text-sm">Delivered</span>
                </div>
                
                {status !== 'delivered' && (
                  <div className="flex items-center space-x-2 mt-4 p-3 bg-blue-50 rounded-lg">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-blue-600">
                      Estimated arrival: {estimatedTime} minutes
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Location Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div className="space-y-2">
            <h4 className="font-semibold flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-green-600" />
              <span>Pickup Location</span>
            </h4>
            <p className="text-sm text-muted-foreground">{pickupLocation.address}</p>
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-red-600" />
              <span>Delivery Location</span>
            </h4>
            <p className="text-sm text-muted-foreground">{deliveryLocation.address}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
