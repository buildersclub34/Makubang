import { getDB } from '../lib/mongodb';
import { ObjectId } from 'mongodb';

export class DeliveryPartnerService {
  private static instance: DeliveryPartnerService;

  static getInstance(): DeliveryPartnerService {
    if (!DeliveryPartnerService.instance) {
      DeliveryPartnerService.instance = new DeliveryPartnerService();
    }
    return DeliveryPartnerService.instance;
  }

  async registerPartner(partnerData: {
    userId: string;
    name: string;
    phone: string;
    email: string;
    aadhar: string;
    pan: string;
    bankAccount: {
      accountNumber: string;
      ifsc: string;
      holderName: string;
    };
    vehicleType: string;
    vehicleNumber: string;
    drivingLicense: string;
    operatingAreas: string[];
  }) {
    const db = getDB();

    const partner = {
      _id: new ObjectId(),
      userId: new ObjectId(partnerData.userId),
      ...partnerData,
      status: 'pending_verification', // pending_verification, verified, suspended
      isOnline: false,
      currentLocation: null,
      earnings: {
        total: 0,
        thisMonth: 0,
        lastPayout: null
      },
      rating: 0,
      completedDeliveries: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await db.collection('delivery_partners').insertOne(partner);
    return partner;
  }

  async verifyPartner(partnerId: string, verificationData: {
    aadharVerified: boolean;
    panVerified: boolean;
    licenseVerified: boolean;
    bankVerified: boolean;
    notes?: string;
  }) {
    const db = getDB();

    const allVerified = Object.values(verificationData).slice(0, 4).every(v => v === true);
    
    await db.collection('delivery_partners').updateOne(
      { _id: new ObjectId(partnerId) },
      {
        $set: {
          verification: verificationData,
          status: allVerified ? 'verified' : 'pending_verification',
          updatedAt: new Date()
        }
      }
    );

    return allVerified;
  }

  async updateOnlineStatus(partnerId: string, isOnline: boolean, location?: { lat: number; lng: number }) {
    const db = getDB();

    const updateData: any = {
      isOnline,
      updatedAt: new Date()
    };

    if (location) {
      updateData.currentLocation = {
        type: 'Point',
        coordinates: [location.lng, location.lat]
      };
    }

    await db.collection('delivery_partners').updateOne(
      { _id: new ObjectId(partnerId) },
      { $set: updateData }
    );
  }

  async findNearbyPartners(location: { lat: number; lng: number }, radiusKm: number = 5) {
    const db = getDB();

    // Convert km to meters for MongoDB
    const radiusMeters = radiusKm * 1000;

    const partners = await db.collection('delivery_partners').find({
      status: 'verified',
      isOnline: true,
      currentLocation: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [location.lng, location.lat]
          },
          $maxDistance: radiusMeters
        }
      }
    }).limit(10).toArray();

    return partners;
  }

  async assignOrder(orderId: string, restaurantLocation: { lat: number; lng: number }) {
    const db = getDB();

    // Find nearby partners
    const availablePartners = await this.findNearbyPartners(restaurantLocation);

    if (availablePartners.length === 0) {
      throw new Error('No delivery partners available');
    }

    // Sort by rating and distance, pick the best one
    const selectedPartner = availablePartners.sort((a, b) => b.rating - a.rating)[0];

    // Create delivery assignment
    const assignment = {
      _id: new ObjectId(),
      orderId: new ObjectId(orderId),
      partnerId: selectedPartner._id,
      status: 'assigned', // assigned, accepted, picked_up, delivered, cancelled
      assignedAt: new Date(),
      estimatedTime: 30, // minutes
      pickupOTP: Math.floor(1000 + Math.random() * 9000).toString(),
      deliveryOTP: Math.floor(1000 + Math.random() * 9000).toString(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await db.collection('delivery_assignments').insertOne(assignment);

    // Update order with assignment
    await db.collection('orders').updateOne(
      { _id: new ObjectId(orderId) },
      {
        $set: {
          deliveryPartnerId: selectedPartner._id,
          deliveryAssignmentId: assignment._id,
          status: 'assigned_to_delivery',
          updatedAt: new Date()
        }
      }
    );

    return assignment;
  }

  async acceptOrder(assignmentId: string, partnerId: string) {
    const db = getDB();

    const result = await db.collection('delivery_assignments').updateOne(
      { 
        _id: new ObjectId(assignmentId),
        partnerId: new ObjectId(partnerId),
        status: 'assigned'
      },
      {
        $set: {
          status: 'accepted',
          acceptedAt: new Date(),
          updatedAt: new Date()
        }
      }
    );

    if (result.modifiedCount === 0) {
      throw new Error('Assignment not found or already processed');
    }

    // Update order status
    const assignment = await db.collection('delivery_assignments').findOne({
      _id: new ObjectId(assignmentId)
    });

    if (assignment) {
      await db.collection('orders').updateOne(
        { _id: assignment.orderId },
        {
          $set: {
            status: 'accepted_by_delivery',
            updatedAt: new Date()
          }
        }
      );
    }

    return true;
  }

  async rejectOrder(assignmentId: string, partnerId: string, reason: string) {
    const db = getDB();

    await db.collection('delivery_assignments').updateOne(
      { 
        _id: new ObjectId(assignmentId),
        partnerId: new ObjectId(partnerId)
      },
      {
        $set: {
          status: 'rejected',
          rejectedAt: new Date(),
          rejectionReason: reason,
          updatedAt: new Date()
        }
      }
    );

    // Reassign to another partner
    const assignment = await db.collection('delivery_assignments').findOne({
      _id: new ObjectId(assignmentId)
    });

    if (assignment) {
      const order = await db.collection('orders').findOne({ _id: assignment.orderId });
      if (order && order.restaurantLocation) {
        await this.assignOrder(assignment.orderId.toString(), order.restaurantLocation);
      }
    }

    return true;
  }

  async updateDeliveryStatus(assignmentId: string, status: string, location?: { lat: number; lng: number }, proofImage?: string) {
    const db = getDB();

    const updateData: any = {
      status,
      updatedAt: new Date()
    };

    if (location) {
      updateData.currentLocation = location;
    }

    if (status === 'picked_up') {
      updateData.pickedUpAt = new Date();
    } else if (status === 'delivered') {
      updateData.deliveredAt = new Date();
      if (proofImage) {
        updateData.proofOfDelivery = proofImage;
      }
    }

    await db.collection('delivery_assignments').updateOne(
      { _id: new ObjectId(assignmentId) },
      { $set: updateData }
    );

    // Update order status
    const assignment = await db.collection('delivery_assignments').findOne({
      _id: new ObjectId(assignmentId)
    });

    if (assignment) {
      let orderStatus = status;
      if (status === 'delivered') {
        orderStatus = 'delivered';
        // Calculate earnings
        await this.calculateEarnings(assignment.partnerId.toString(), assignment.orderId.toString());
      }

      await db.collection('orders').updateOne(
        { _id: assignment.orderId },
        {
          $set: {
            status: orderStatus,
            updatedAt: new Date()
          }
        }
      );
    }

    return true;
  }

  async verifyPickupOTP(assignmentId: string, otp: string) {
    const db = getDB();

    const assignment = await db.collection('delivery_assignments').findOne({
      _id: new ObjectId(assignmentId),
      pickupOTP: otp
    });

    if (!assignment) {
      throw new Error('Invalid OTP');
    }

    await this.updateDeliveryStatus(assignmentId, 'picked_up');
    return true;
  }

  async verifyDeliveryOTP(assignmentId: string, otp: string) {
    const db = getDB();

    const assignment = await db.collection('delivery_assignments').findOne({
      _id: new ObjectId(assignmentId),
      deliveryOTP: otp
    });

    if (!assignment) {
      throw new Error('Invalid OTP');
    }

    await this.updateDeliveryStatus(assignmentId, 'delivered');
    return true;
  }

  private async calculateEarnings(partnerId: string, orderId: string) {
    const db = getDB();

    const order = await db.collection('orders').findOne({ _id: new ObjectId(orderId) });
    if (!order) return;

    // Calculate delivery earnings (base + distance + surge)
    const baseEarning = 25; // Base earning per delivery
    const distanceEarning = 5; // Per km (simplified)
    const totalEarning = baseEarning + distanceEarning;

    // Update partner earnings
    await db.collection('delivery_partners').updateOne(
      { _id: new ObjectId(partnerId) },
      {
        $inc: {
          'earnings.total': totalEarning,
          'earnings.thisMonth': totalEarning,
          completedDeliveries: 1
        },
        $set: { updatedAt: new Date() }
      }
    );

    // Record earning transaction
    await db.collection('delivery_earnings').insertOne({
      _id: new ObjectId(),
      partnerId: new ObjectId(partnerId),
      orderId: new ObjectId(orderId),
      amount: totalEarning,
      type: 'delivery',
      status: 'pending_payout',
      createdAt: new Date()
    });
  }

  async getPartnerEarnings(partnerId: string) {
    const db = getDB();

    const earnings = await db.collection('delivery_earnings')
      .find({ partnerId: new ObjectId(partnerId) })
      .sort({ createdAt: -1 })
      .toArray();

    const summary = await db.collection('delivery_partners')
      .findOne(
        { _id: new ObjectId(partnerId) },
        { projection: { earnings: 1 } }
      );

    return {
      summary: summary?.earnings || { total: 0, thisMonth: 0, lastPayout: null },
      transactions: earnings
    };
  }
}

export const deliveryPartnerService = DeliveryPartnerService.getInstance();
