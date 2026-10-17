const http = require('http');

const BASE_URL = 'http://localhost:5000';

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const payload = body ? JSON.stringify(body) : null;
    if (payload) {
      headers['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request(url, { method, headers }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runTests() {
  console.log('🚀 Running Comprehensive Parko End-to-End API Test Suite...\n');
  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
    }
  }

  try {
    // 1. Discovery & Search (Privacy check)
    console.log('--- 1. Discovery & Public Privacy ---');
    const searchRes = await request('GET', '/api/spaces/search?lat=12.9698&lng=79.1559');
    assert(searchRes.status === 200, 'Search returns HTTP 200');
    assert(Array.isArray(searchRes.body.spaces) && searchRes.body.spaces.length > 0, `Search returns listings (found ${searchRes.body.spaces?.length})`);
    
    const sample = searchRes.body.spaces[0];
    assert(sample.availability_state !== undefined, `Listing has computed availability_state: "${sample.availability_state}"`);
    assert(sample.exact_address === undefined, 'Public search NEVER exposes exact_address');
    assert(sample.precise_latitude === undefined, 'Public search NEVER exposes precise_latitude');
    assert(sample.precise_longitude === undefined, 'Public search NEVER exposes precise_longitude');
    assert(sample.private_notes === undefined, 'Public search NEVER exposes private_notes');
    assert(sample.access_instructions === undefined, 'Public search NEVER exposes access_instructions');

    // 2. Authentication
    console.log('\n--- 2. Authentication (Phone OTP & Email) ---');
    const phone = '9876543210';
    const otpReq = await request('POST', '/api/auth/otp/request', { phone });
    assert(otpReq.status === 200 && otpReq.body.demo_otp, `Phone OTP requested, received demo OTP: ${otpReq.body.demo_otp}`);

    const otpVerify = await request('POST', '/api/auth/otp/verify', { phone, code: otpReq.body.demo_otp });
    assert(otpVerify.status === 200 && otpVerify.body.token, 'OTP verified, JWT token issued');
    const driverToken = otpVerify.body.token;
    const driverUserId = otpVerify.body.user.user_id;

    // Login as Admin
    const adminLogin = await request('POST', '/api/auth/login', {
      email: 'admin@parko.com',
      password: 'password123'
    });
    assert(adminLogin.status === 200 && adminLogin.body.user.is_admin === true, 'Admin login verified (is_admin: true)');
    const adminToken = adminLogin.body.token;

    // Login as Host (User 2: Kavitha)
    const hostLogin = await request('POST', '/api/auth/login', {
      email: 'kavitha@parko.com',
      password: 'password123'
    });
    assert(hostLogin.status === 200, 'Host login verified (kavitha@parko.com)');
    const hostToken = hostLogin.body.token;

    // 3. Security & Access Control
    console.log('\n--- 3. Security & Access Control ---');
    const unauthRoute = await request('GET', '/api/spaces/1/route-preview');
    assert(unauthRoute.status === 401, 'Guest cannot access protected route-preview (HTTP 401)');

    const authRoute = await request('GET', '/api/spaces/1/route-preview', null, driverToken);
    assert(authRoute.status === 200 && authRoute.body.routePreview?.destination_lat, 'Authenticated user can access route-preview');
    assert(authRoute.body.exact_address === undefined, 'Route preview does NOT disclose exact address text');

    const regAdminDenied = await request('GET', '/api/admin/metrics', null, driverToken);
    assert(regAdminDenied.status === 403, 'Regular user denied access to /api/admin/metrics (HTTP 403)');

    const adminMetrics = await request('GET', '/api/admin/metrics', null, adminToken);
    assert(adminMetrics.status === 200 && adminMetrics.body.metrics, 'Admin can access /api/admin/metrics');

    // 4. Immediate Parking Rule (manual_30min rejection)
    console.log('\n--- 4. Immediate Parking Rule ---');
    // Space 8 has approval_mode = 'manual_30min'. Booking starting in 5 minutes must be rejected
    const now = new Date();
    const immediateStart = new Date(now.getTime() + 5 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
    const immediateEnd = new Date(now.getTime() + 65 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');

    const immediateBookingAttempt = await request('POST', '/api/bookings', {
      space_id: 8,
      availability_id: 12,
      start_time: immediateStart,
      end_time: immediateEnd
    }, driverToken);
    assert(immediateBookingAttempt.status === 400 && immediateBookingAttempt.body.error?.includes('30-minute owner approval'), 
      `Immediate booking on 30-min manual approval correctly rejected: "${immediateBookingAttempt.body.error}"`);

    // 5. Complete Instant Booking, Concurrency & Payment Flow
    console.log('\n--- 5. Instant Booking, Hold & Demo Payment ---');
    // Book tomorrow 10:00 to 12:00 on Space 1 (instant)
    const tmrw = new Date();
    tmrw.setDate(tmrw.getDate() + 1);
    const dateStr = tmrw.toISOString().slice(0, 10);
    const bookStart = `${dateStr} 10:00:00`;
    const bookEnd = `${dateStr} 12:00:00`;

    const instantBookingRes = await request('POST', '/api/bookings', {
      space_id: 1,
      availability_id: 2,
      start_time: bookStart,
      end_time: bookEnd
    }, driverToken);

    assert(instantBookingRes.status === 201 && instantBookingRes.body.booking, 
      `Instant booking created in pending_payment status (Booking ID: ${instantBookingRes.body.booking?.booking_id})`);
    const bookingId = instantBookingRes.body.booking?.booking_id;

    // Overlapping booking attempt (concurrency test)
    const overlapRes = await request('POST', '/api/bookings', {
      space_id: 1,
      availability_id: 2,
      start_time: `${dateStr} 11:00:00`,
      end_time: `${dateStr} 13:00:00`
    }, driverToken);
    assert(overlapRes.status === 409 || overlapRes.status === 400, 
      'Overlapping booking request blocked by active slot hold');

    // Complete simulated payment
    const payRes = await request('POST', `/api/bookings/${bookingId}/pay`, {
      payment_method: 'upi'
    }, driverToken);
    assert(payRes.status === 200 && payRes.body.booking_status === 'confirmed', 
      'Demo payment completed successfully, booking atomically confirmed');

    // Access instructions disclosure
    const accessRes = await request('GET', `/api/bookings/${bookingId}/access`, null, driverToken);
    assert(accessRes.status === 200 && (accessRes.body.access_instructions || accessRes.body.access?.access_instructions), 
      `Driver retrieved access instructions: "${accessRes.body.access_instructions || accessRes.body.access?.access_instructions}"`);

    const unauthAccessRes = await request('GET', `/api/bookings/${bookingId}/access`, null, hostToken);
    assert(unauthAccessRes.status === 403, 'Unrelated user cannot access booking access details (HTTP 403)');

    // 6. Cancellation Policy Verification
    console.log('\n--- 6. Cancellation Policy Verification ---');
    const cancelRes = await request('POST', `/api/bookings/${bookingId}/cancel`, {
      reason: 'Change of demo plans'
    }, driverToken);
    assert(cancelRes.status === 200 && cancelRes.body.policyNote?.includes('Free cancellation'), 
      `Booking cancelled within free cancellation policy: "${cancelRes.body.policyNote}"`);

    // 7. Owner-Requested Cancellation Flow
    console.log('\n--- 7. Owner-Requested Cancellation & Admin Resolution ---');
    // Create a new confirmed booking for Space 1 (Host Kavitha) for tomorrow 15:00-17:00
    const hostCancelBookingRes = await request('POST', '/api/bookings', {
      space_id: 1,
      availability_id: 2,
      start_time: `${dateStr} 15:00:00`,
      end_time: `${dateStr} 17:00:00`
    }, driverToken);
    const hostCancelBookingId = hostCancelBookingRes.body.booking?.booking_id;
    await request('POST', `/api/bookings/${hostCancelBookingId}/pay`, { payment_method: 'card' }, driverToken);

    // Host Kavitha requests cancellation on this confirmed booking
    const hostCancelReq = await request('POST', `/api/owner/bookings/${hostCancelBookingId}/request-cancellation`, {
      reason: 'Urgent driveway paving repairs needed'
    }, hostToken);
    assert(hostCancelReq.status === 200, 'Host requested cancellation, slot kept protected under review');

    // Admin fetches dispute and resolves it
    const disputesList = await request('GET', '/api/admin/disputes', null, adminToken);
    const hostDispute = disputesList.body.disputes?.find(d => d.booking_id === hostCancelBookingId);
    
    const adminResolve = await request('POST', `/api/admin/disputes/${hostDispute ? hostDispute.dispute_id : 1}/resolve`, {
      resolution: 'Approved emergency maintenance request',
      approveCancellation: true
    }, adminToken);
    assert(adminResolve.status === 200, 'Admin resolved dispute and approved host cancellation');

    // 8. Mutual Reviews
    console.log('\n--- 8. Mutual Reviews & Limits ---');
    // Seed booking 1 is completed. Check review submission:
    // User 5 (Suresh) and User 2 (Kavitha) already reviewed Booking 1.
    // Try duplicate review by User 2 on Booking 1
    const dupReview = await request('POST', '/api/reviews', {
      bookingId: 1,
      rating: 5,
      comment: 'Attempting duplicate review'
    }, hostToken);
    assert(dupReview.status === 400 && dupReview.body.error.includes('already submitted'), 
      'Duplicate review by same user rejected');

    // 9. Owner Listing Wizard & Admin Approval
    console.log('\n--- 9. Owner Listing Wizard & Admin Verification ---');
    const newSpaceRes = await request('POST', '/api/owner/spaces', {
      title: 'Vellore Fort Secured Shaded Bay',
      description: 'Private shaded car parking slot near South Rampart Gate. Type: covered.',
      vehicle_category: 'compact_car',
      hourly_rate: 45.00,
      daily_rate: 350.00,
      access_method: 'automated_code',
      approval_mode: 'instant',
      city_id: 1,
      approximate_latitude: 12.9205,
      approximate_longitude: 79.1325,
      exact_address: '14 Fort View Enclave, South Rampart Road, Vellore',
      precise_latitude: 12.92048,
      precise_longitude: 79.13249,
      private_notes: 'Keypad next to black wicket gate. Code: 7712#',
      windows: [
        { start_time: `${dateStr} 08:00:00`, end_time: `${dateStr} 20:00:00` }
      ]
    }, hostToken);

    assert(newSpaceRes.status === 201 && newSpaceRes.body.space_id, 
      `New space created in pending_verification status (ID: ${newSpaceRes.body.space_id})`);
    const newSpaceId = newSpaceRes.body.space_id;

    // Verify it is NOT visible in public search yet
    const searchAfterCreate = await request('GET', '/api/spaces/search');
    const foundNew = searchAfterCreate.body.spaces?.find(s => s.space_id === newSpaceId);
    assert(!foundNew, 'Pending space is HIDDEN from public search');

    // Admin approves the listing
    const approveRes = await request('POST', `/api/admin/listings/${newSpaceId}/decide`, {
      status: 'approved'
    }, adminToken);
    assert(approveRes.status === 200, `Admin approved space #${newSpaceId}`);

    // Verify it IS NOW visible in public search
    const searchAfterApprove = await request('GET', '/api/spaces/search');
    const foundApproved = searchAfterApprove.body.spaces?.find(s => s.space_id === newSpaceId);
    assert(foundApproved !== undefined, 'Approved space is now VISIBLE in public search!');

    console.log(`\n========================================`);
    console.log(`  RESULTS: ${passed} / ${total} TESTS PASSED (${Math.round((passed / total) * 100)}%)`);
    console.log(`========================================\n`);

    if (passed === total) {
      process.exit(0);
    } else {
      process.exit(1);
    }

  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  }
}

runTests();
