import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { deliveryPartnerService } from '../services/delivery-partner.service';

const router = Router();

// Partner registration
router.post('/register', authenticate, async (req, res) => {
  try {
    const partner = await deliveryPartnerService.registerPartner({
      userId: (req as any).user.id,
      ...req.body
    });
    res.status(201).json(partner);
  } catch (error) {
    console.error('Partner registration error:', error);
    res.status(500).json({ error: 'Failed to register partner' });
  }
});

// Update online status and location
router.post('/status', authenticate, async (req, res) => {
  try {
    const { isOnline, location } = req.body;
    const partnerId = (req as any).user.partnerId; // Assume this is set during auth
    
    await deliveryPartnerService.updateOnlineStatus(partnerId, isOnline, location);
    res.json({ success: true });
  } catch (error) {
    console.error('Status update error:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Accept order
router.post('/assignments/:id/accept', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const partnerId = (req as any).user.partnerId;
    
    await deliveryPartnerService.acceptOrder(id, partnerId);
    res.json({ success: true });
  } catch (error) {
    console.error('Accept order error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Reject order
router.post('/assignments/:id/reject', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const partnerId = (req as any).user.partnerId;
    
    await deliveryPartnerService.rejectOrder(id, partnerId, reason);
    res.json({ success: true });
  } catch (error) {
    console.error('Reject order error:', error);
    res.status(500).json({ error: 'Failed to reject order' });
  }
});

// Update delivery status
router.patch('/assignments/:id/status', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, location, proofImage } = req.body;
    
    await deliveryPartnerService.updateDeliveryStatus(id, status, location, proofImage);
    res.json({ success: true });
  } catch (error) {
    console.error('Status update error:', error);
    res.status(500).json({ error: 'Failed to update delivery status' });
  }
});

// Verify pickup OTP
router.post('/assignments/:id/verify-pickup', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { otp } = req.body;
    
    await deliveryPartnerService.verifyPickupOTP(id, otp);
    res.json({ success: true });
  } catch (error) {
    console.error('Pickup verification error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Verify delivery OTP
router.post('/assignments/:id/verify-delivery', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { otp } = req.body;
    
    await deliveryPartnerService.verifyDeliveryOTP(id, otp);
    res.json({ success: true });
  } catch (error) {
    console.error('Delivery verification error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get earnings
router.get('/earnings', authenticate, async (req, res) => {
  try {
    const partnerId = (req as any).user.partnerId;
    const earnings = await deliveryPartnerService.getPartnerEarnings(partnerId);
    res.json(earnings);
  } catch (error) {
    console.error('Get earnings error:', error);
    res.status(500).json({ error: 'Failed to get earnings' });
  }
});

// Admin: Verify partner
router.post('/:id/verify', authenticate, authorize(['admin']) as any, async (req, res) => {
  try {
    const { id } = req.params;
    const verified = await deliveryPartnerService.verifyPartner(id, req.body);
    res.json({ success: true, verified });
  } catch (error) {
    console.error('Partner verification error:', error);
    res.status(500).json({ error: 'Failed to verify partner' });
  }
});

export default router;
