// distance in km, speed in km/h
function calculateETA(distanceKm, avgSpeedKmh = 40) {
  if (!distanceKm || distanceKm <= 0) return null;
  const hours = distanceKm / avgSpeedKmh;
  const minutes = Math.round(hours * 60);
  return minutes; // ETA in minutes
}

module.exports = calculateETA;