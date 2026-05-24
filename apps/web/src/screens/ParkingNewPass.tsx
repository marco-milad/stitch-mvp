// Legacy route `/services/parking/new-pass` — the standalone "new visitor
// pass" flow was merged into the unified HomeParking screen. This file
// stays just to keep bookmarks / deep-links from 404'ing.

import { Navigate } from 'react-router-dom';

export function ParkingNewPass() {
  return <Navigate to="/home/parking" replace />;
}
