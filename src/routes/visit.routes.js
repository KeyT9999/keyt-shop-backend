const express = require('express');
const Visit = require('../models/visit.model');
const { authenticateToken, requireAdmin } = require('../middleware/auth.middleware');

const router = express.Router();

/**
 * Track a visit (public endpoint - called from frontend)
 * POST /api/visits/track
 */
router.post('/track', async (req, res) => {
  try {
    const ipAddress = req.headers['x-forwarded-for']?.split(',')[0] || 
                     req.headers['x-real-ip'] || 
                     req.connection.remoteAddress ||
                     req.socket.remoteAddress ||
                     'unknown';
    
    const userAgent = req.headers['user-agent'] || '';
    const path = req.body.path || '/';
    const referrer = req.body.referrer || req.headers['referer'] || '';
    
    // Parse user agent
    const deviceInfo = parseUserAgent(userAgent);
    
    // Get userId if provided (from frontend if user is logged in)
    const userId = req.body.userId || null;
    
    // Create session ID
    const sessionId = require('crypto')
      .createHash('md5')
      .update(`${ipAddress}-${userAgent}-${Date.now()}`)
      .digest('hex');

    // Save visit
    await Visit.create({
      ipAddress,
      userAgent,
      path,
      referrer,
      deviceType: deviceInfo.deviceType,
      browser: deviceInfo.browser,
      os: deviceInfo.os,
      userId: userId || null,
      sessionId
    });

    res.json({ success: true });
  } catch (err) {
    console.error('❌ Error tracking visit:', err);
    // Don't fail the request if tracking fails
    res.json({ success: false, error: err.message });
  }
});

/**
 * Get visit statistics by time period (Admin only)
 * GET /api/visits/stats?period=1m|2m|3m|6m|1y
 */
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { period = '1m' } = req.query;
    
    // Calculate date range based on period
    const now = new Date();
    let startDate;
    
    switch (period) {
      case '1m':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        break;
      case '2m':
        startDate = new Date(now.getFullYear(), now.getMonth() - 2, now.getDate());
        break;
      case '3m':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        break;
      case '6m':
        startDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
        break;
      case '1y':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    }

    // Query visits in the period
    const visits = await Visit.find({
      createdAt: {
        $gte: startDate,
        $lte: now
      }
    }).sort({ createdAt: -1 });

    // Calculate statistics
    const totalVisits = visits.length;
    
    // Unique visitors (by IP)
    const uniqueIPs = new Set(visits.map(v => v.ipAddress));
    const uniqueVisitors = uniqueIPs.size;
    
    // Unique sessions
    const uniqueSessions = new Set(visits.map(v => v.sessionId));
    const totalSessions = uniqueSessions.size;
    
    // Visits by device type
    const deviceStats = visits.reduce((acc, visit) => {
      const device = visit.deviceType || 'unknown';
      acc[device] = (acc[device] || 0) + 1;
      return acc;
    }, {});
    
    // Visits by browser
    const browserStats = visits.reduce((acc, visit) => {
      const browser = visit.browser || 'Unknown';
      acc[browser] = (acc[browser] || 0) + 1;
      return acc;
    }, {});
    
    // Visits by OS
    const osStats = visits.reduce((acc, visit) => {
      const os = visit.os || 'Unknown';
      acc[os] = (acc[os] || 0) + 1;
      return acc;
    }, {});
    
    // Most visited paths
    const pathStats = visits.reduce((acc, visit) => {
      const path = visit.path || '/';
      acc[path] = (acc[path] || 0) + 1;
      return acc;
    }, {});
    
    const topPaths = Object.entries(pathStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([path, count]) => ({ path, count }));

    // Daily visits (for chart)
    const dailyVisits = visits.reduce((acc, visit) => {
      const date = new Date(visit.createdAt).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});
    
    const dailyData = Object.entries(dailyVisits)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, count]) => ({ date, count }));

    // Hourly visits (for chart) - group by hour (0-23)
    const hourlyVisits = visits.reduce((acc, visit) => {
      const hour = new Date(visit.createdAt).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {});
    
    // Create array with all 24 hours, fill missing hours with 0
    const hourlyData = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: hourlyVisits[hour] || 0
    }));

    // Calculate previous period stats
    let previousPeriodStats = null;
    let comparison = null;
    
    // Calculate previous period date range
    let previousStartDate;
    let previousEndDate = new Date(startDate); // Previous period ends when current period starts
    
    switch (period) {
      case '1m':
        previousStartDate = new Date(now.getFullYear(), now.getMonth() - 2, now.getDate());
        break;
      case '2m':
        previousStartDate = new Date(now.getFullYear(), now.getMonth() - 4, now.getDate());
        break;
      case '3m':
        previousStartDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
        break;
      case '6m':
        previousStartDate = new Date(now.getFullYear(), now.getMonth() - 12, now.getDate());
        break;
      case '1y':
        previousStartDate = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
        break;
      default:
        previousStartDate = new Date(now.getFullYear(), now.getMonth() - 2, now.getDate());
    }

    // Query previous period visits
    const previousVisits = await Visit.find({
      createdAt: {
        $gte: previousStartDate,
        $lt: previousEndDate
      }
    });

    if (previousVisits.length > 0) {
      const previousTotalVisits = previousVisits.length;
      const previousUniqueIPs = new Set(previousVisits.map(v => v.ipAddress));
      const previousUniqueVisitors = previousUniqueIPs.size;
      const previousUniqueSessions = new Set(previousVisits.map(v => v.sessionId));
      const previousTotalSessions = previousUniqueSessions.size;

      previousPeriodStats = {
        period: `previous_${period}`,
        startDate: previousStartDate,
        endDate: previousEndDate,
        totalVisits: previousTotalVisits,
        uniqueVisitors: previousUniqueVisitors,
        totalSessions: previousTotalSessions
      };

      // Calculate comparison percentages
      const calculateChange = (current, previous) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
      };

      comparison = {
        totalVisitsChange: calculateChange(totalVisits, previousTotalVisits),
        uniqueVisitorsChange: calculateChange(uniqueVisitors, previousUniqueVisitors),
        sessionsChange: calculateChange(totalSessions, previousTotalSessions)
      };
    }

    res.json({
      period,
      startDate,
      endDate: now,
      totalVisits,
      uniqueVisitors,
      totalSessions,
      deviceStats,
      browserStats,
      osStats,
      topPaths,
      dailyData,
      hourlyData,
      previousPeriod: previousPeriodStats,
      comparison
    });
  } catch (err) {
    console.error('❌ Error fetching visit stats:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Parse user agent string
 */
function parseUserAgent(userAgent) {
  if (!userAgent) {
    return { deviceType: 'unknown', browser: '', os: '' };
  }

  const ua = userAgent.toLowerCase();
  
  let deviceType = 'desktop';
  if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua)) {
    deviceType = 'mobile';
  } else if (/ipad|tablet/i.test(ua)) {
    deviceType = 'tablet';
  }

  let browser = '';
  if (ua.includes('chrome') && !ua.includes('edg')) {
    browser = 'Chrome';
  } else if (ua.includes('firefox')) {
    browser = 'Firefox';
  } else if (ua.includes('safari') && !ua.includes('chrome')) {
    browser = 'Safari';
  } else if (ua.includes('edg')) {
    browser = 'Edge';
  } else if (ua.includes('opera') || ua.includes('opr')) {
    browser = 'Opera';
  } else {
    browser = 'Unknown';
  }

  let os = '';
  if (ua.includes('windows')) {
    os = 'Windows';
  } else if (ua.includes('mac os') || ua.includes('macos')) {
    os = 'macOS';
  } else if (ua.includes('linux')) {
    os = 'Linux';
  } else if (ua.includes('android')) {
    os = 'Android';
  } else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) {
    os = 'iOS';
  } else {
    os = 'Unknown';
  }

  return { deviceType, browser, os };
}

module.exports = router;
