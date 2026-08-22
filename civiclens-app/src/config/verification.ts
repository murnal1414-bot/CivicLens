/**
 * Central configuration settings for AI-powered complaint verification.
 */
export const VERIFICATION_CONFIG = {
  // Confidence thresholds
  CONFIDENCE_HIGH_THRESHOLD: 0.80, // >= 80% is Low Risk (if GPS matches)
  CONFIDENCE_LOW_THRESHOLD: 0.50,  // < 50% is automatically High Risk

  // GPS/Location Validation
  ACCEPTABLE_GPS_DISTANCE_KM: 2.0, // Maximum distance mismatch in kilometers

  // Fallbacks
  AI_API_FALLBACK_CONFIDENCE: 0.92,
}
