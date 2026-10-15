import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.DB_PATH = path.join(os.tmpdir(), `grove-${process.pid}-${Date.now()}.json`);

const { default: request } = await import('supertest');
const { app } = await import('../src/app.js');
const { getDb, resetDb } = await import('../src/db.js');
const { addCampusDays } = await import('../src/lib/dates.js');

const auth = (token) => ({ Authorization: `Bearer ${token}` });

async function login(email, password) {
  const response = await request(app).post('/api/auth/login').send({ email, password });
  assert.equal(response.status, 200, response.body.error || 'login failed');
  return response.body;
}

function serviceBody(overrides = {}) {
  return {
    name: 'Night Lab Bench',
    category: 'Academics',
    description: 'A quiet bench reserved for project work after class hours.',
    location: 'Science Block, Lab 2',
    price: 125,
    durationMinutes: 60,
    capacity: 1,
    status: 'active',
    slots: ['10:00', '11:00'],
    ...overrides,
  };
}

describe('Grove campus API', () => {
  let adminToken;
  let studentToken;
  let otherToken;

  before(async () => {
    resetDb();
    adminToken = (await login('admin@grove.edu', 'Admin@123')).token;
    studentToken = (await login('ananya@grove.edu', 'Student@123')).token;
    otherToken = (await login('rohan@grove.edu', 'Student@123')).token;
  });

  after(() => {
    fs.rmSync(process.env.DB_PATH, { force: true });
  });

  it('exposes health, the API map, and public campus metadata', async () => {
    const health = await request(app).get('/api/health');
    assert.equal(health.status, 200);
    assert.equal(health.body.ok, true);

    const map = await request(app).get('/api');
    assert.equal(map.status, 200);
    assert.ok(map.body.endpoints.some((item) => item.path === '/api/payments'));

    const meta = await request(app).get('/api/meta');
    assert.ok(meta.body.categories.includes('Sports'));
    assert.ok(meta.body.publicStats.services >= 10);
  });

  it('rejects a weak password and ignores a forged admin role', async () => {
    const weak = await request(app).post('/api/auth/register').send({
      name: 'Weak Password',
      email: 'weak@grove.edu',
      password: 'short',
      studentId: 'CS26WEAK',
      department: 'Computer Science',
    });
    assert.equal(weak.status, 400);
    assert.ok(weak.body.fields.password);

    const created = await request(app).post('/api/auth/register').send({
      name: 'Neel Kapoor',
      email: 'neel@grove.edu',
      password: 'NeelPass1',
      studentId: 'cs26neel',
      department: 'Mechanical',
      role: 'admin',
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.user.role, 'student');
    assert.equal(created.body.user.studentId, 'CS26NEEL');
    assert.equal(created.body.user.passwordHash, undefined);
  });

  it('does not reveal whether an email exists when the password is wrong', async () => {
    const response = await request(app).post('/api/auth/login').send({
      email: 'ananya@grove.edu',
      password: 'WrongPass1',
    });
    assert.equal(response.status, 401);
    assert.equal(response.body.token, undefined);
  });

  it('lets visitors search and filter the catalog', async () => {
    const sports = await request(app).get('/api/services').query({ category: 'Sports', sort: 'price' });
    assert.equal(sports.status, 200);
    assert.ok(sports.body.services.length >= 2);
    assert.ok(sports.body.services.every((item) => item.category === 'Sports'));
    assert.ok(sports.body.services[0].price <= sports.body.services.at(-1).price);

    const shuttle = await request(app).get('/api/services').query({ q: 'shuttle' });
    assert.ok(shuttle.body.services.some((item) => item.name === 'City Shuttle Seat'));

    const bad = await request(app).get('/api/services').query({ category: 'Dining' });
    assert.equal(bad.status, 400);
  });

  it('stops students from creating services and lets an admin create one', async () => {
    const denied = await request(app).post('/api/services').set(auth(studentToken)).send(serviceBody());
    assert.equal(denied.status, 403);

    const created = await request(app).post('/api/services').set(auth(adminToken)).send(serviceBody());
    assert.equal(created.status, 201);
    assert.equal(created.body.service.name, 'Night Lab Bench');

    const removed = await request(app).delete(`/api/services/${created.body.service.id}`).set(auth(adminToken));
    assert.equal(removed.status, 200);
    assert.equal(removed.body.deleted, true);
  });

  it('books a free service immediately and rejects a past date', async () => {
    const clinic = getDb().services.find((item) => item.name === 'Clinic Consultation');
    const past = await request(app).post('/api/bookings').set(auth(studentToken)).send({
      serviceId: clinic.id,
      date: addCampusDays(-1),
      timeSlot: '09:00',
    });
    assert.equal(past.status, 400);

    const booked = await request(app).post('/api/bookings').set(auth(studentToken)).send({
      serviceId: clinic.id,
      date: addCampusDays(6),
      timeSlot: '09:00',
      notes: '<b>Bring</b> the health card',
    });
    assert.equal(booked.status, 201);
    assert.equal(booked.body.booking.status, 'confirmed');
    assert.equal(booked.body.booking.paymentStatus, 'not_required');
    assert.equal(booked.body.booking.notes, 'Bring the health card');
  });

  it('enforces slot capacity, confirms payment, and refuses a second charge', async () => {
    const created = await request(app).post('/api/services').set(auth(adminToken)).send(serviceBody({ name: 'Optics Bench', price: 90 }));
    const serviceId = created.body.service.id;
    const date = addCampusDays(4);
    const first = await request(app).post('/api/bookings').set(auth(studentToken)).send({ serviceId, date, timeSlot: '10:00' });
    assert.equal(first.status, 201);
    assert.equal(first.body.booking.status, 'pending');

    const clash = await request(app).post('/api/bookings').set(auth(otherToken)).send({ serviceId, date, timeSlot: '10:00' });
    assert.equal(clash.status, 409);

    const open = await request(app).get(`/api/services/${serviceId}/availability`).query({ date });
    const full = open.body.slots.find((slot) => slot.time === '10:00');
    const free = open.body.slots.find((slot) => slot.time === '11:00');
    assert.equal(full.remaining, 0);
    assert.equal(free.remaining, 1);

    const card = { name: 'Ananya Rao', number: '4242424242424242', expiry: '12/30', cvv: '737' };
    const paid = await request(app).post('/api/payments').set(auth(studentToken)).send({
      bookingId: first.body.booking.id,
      method: 'card',
      card,
    });
    assert.equal(paid.status, 201);
    assert.equal(paid.body.booking.status, 'confirmed');
    assert.equal(paid.body.booking.paymentStatus, 'paid');
    assert.equal(paid.body.payment.last4, '4242');
    assert.equal(JSON.stringify(paid.body).includes('4242424242424242'), false);
    const stored = JSON.stringify(getDb());
    assert.equal(stored.includes('4242424242424242'), false);
    assert.equal(stored.includes('"cvv"'), false);
    assert.equal(stored.includes('"number"'), false);

    const again = await request(app).post('/api/payments').set(auth(studentToken)).send({
      bookingId: first.body.booking.id,
      method: 'campus_wallet',
    });
    assert.equal(again.status, 409);

    const declinedBooking = await request(app).post('/api/bookings').set(auth(otherToken)).send({ serviceId, date, timeSlot: '11:00' });
    const declined = await request(app).post('/api/payments').set(auth(otherToken)).send({
      bookingId: declinedBooking.body.booking.id,
      method: 'card',
      card: { name: 'Rohan Mehta', number: '4000000000000002', expiry: '12/30', cvv: '737' },
    });
    assert.equal(declined.status, 402);

    const invalid = await request(app).post('/api/payments').set(auth(otherToken)).send({
      bookingId: declinedBooking.body.booking.id,
      method: 'card',
      card: { name: 'Rohan Mehta', number: '4242424242424241', expiry: '12/30', cvv: '737' },
    });
    assert.equal(invalid.status, 400);
    assert.ok(invalid.body.fields.number);
  });

  it('refunds a wallet payment when the student cancels', async () => {
    const created = await request(app).post('/api/services').set(auth(adminToken)).send(serviceBody({
      name: 'Print Window',
      price: 55,
      slots: ['16:00'],
    }));
    const booked = await request(app).post('/api/bookings').set(auth(studentToken)).send({
      serviceId: created.body.service.id,
      date: addCampusDays(3),
      timeSlot: '16:00',
    });
    const paid = await request(app).post('/api/payments').set(auth(studentToken)).send({
      bookingId: booked.body.booking.id,
      method: 'campus_wallet',
    });
    assert.equal(paid.status, 201);

    const cancelled = await request(app).post(`/api/bookings/${booked.body.booking.id}/cancel`).set(auth(studentToken)).send({
      reason: 'The seminar moved rooms.',
    });
    assert.equal(cancelled.status, 200);
    assert.equal(cancelled.body.booking.status, 'cancelled');
    assert.equal(cancelled.body.booking.paymentStatus, 'refunded');
    assert.equal(cancelled.body.booking.payment.status, 'refunded');
  });

  it('lets an admin complete a booking and allows one review', async () => {
    const created = await request(app).post('/api/services').set(auth(adminToken)).send(serviceBody({
      name: 'Review Booth',
      price: 0,
      slots: ['15:00'],
    }));
    const booked = await request(app).post('/api/bookings').set(auth(studentToken)).send({
      serviceId: created.body.service.id,
      date: addCampusDays(2),
      timeSlot: '15:00',
    });
    const tooSoon = await request(app).post('/api/feedback').set(auth(studentToken)).send({
      bookingId: booked.body.booking.id,
      rating: 5,
      comment: 'Too early to review this booth.',
    });
    assert.equal(tooSoon.status, 409);

    const studentStatus = await request(app).patch(`/api/bookings/${booked.body.booking.id}/status`).set(auth(studentToken)).send({ status: 'completed' });
    assert.equal(studentStatus.status, 403);

    const completed = await request(app).patch(`/api/bookings/${booked.body.booking.id}/status`).set(auth(adminToken)).send({ status: 'completed' });
    assert.equal(completed.status, 200);

    const review = await request(app).post('/api/feedback').set(auth(studentToken)).send({
      bookingId: booked.body.booking.id,
      rating: 4,
      comment: 'The booth was quiet and the slot started on time.',
    });
    assert.equal(review.status, 201);
    assert.equal(review.body.feedback.author, 'Ananya R.');

    const second = await request(app).post('/api/feedback').set(auth(studentToken)).send({
      bookingId: booked.body.booking.id,
      rating: 5,
      comment: 'Trying to review the same booth again.',
    });
    assert.equal(second.status, 409);

    const stranger = await request(app).post('/api/feedback').set(auth(otherToken)).send({
      bookingId: booked.body.booking.id,
      rating: 1,
      comment: 'This is not my booking to review.',
    });
    assert.equal(stranger.status, 403);
  });

  it('keeps administration behind the admin role and can suspend an account', async () => {
    const hidden = await request(app).get('/api/admin/stats').set(auth(studentToken));
    assert.equal(hidden.status, 403);
    const missing = await request(app).get('/api/admin/users');
    assert.equal(missing.status, 401);

    const stats = await request(app).get('/api/admin/stats').set(auth(adminToken));
    assert.equal(stats.status, 200);
    assert.ok(stats.body.totals.bookings > 0);
    assert.equal(stats.body.revenueByMonth.length, 6);

    const sara = getDb().users.find((user) => user.email === 'sara@grove.edu');
    const suspended = await request(app).patch(`/api/admin/users/${sara.id}`).set(auth(adminToken)).send({ role: 'student', status: 'suspended' });
    assert.equal(suspended.status, 200);

    const blocked = await request(app).post('/api/auth/login').send({ email: 'sara@grove.edu', password: 'Student@123' });
    assert.equal(blocked.status, 403);

    const self = await request(app).patch(`/api/admin/users/${getDb().users.find((user) => user.email === 'admin@grove.edu').id}`).set(auth(adminToken)).send({ role: 'student', status: 'active' });
    assert.equal(self.status, 409);

    await request(app).patch(`/api/admin/users/${sara.id}`).set(auth(adminToken)).send({ role: 'student', status: 'active' });
  });

  it('retires a service that already has bookings instead of deleting history', async () => {
    const service = getDb().services.find((item) => item.name === 'Optics Bench');
    const response = await request(app).delete(`/api/services/${service.id}`).set(auth(adminToken));
    assert.equal(response.status, 200);
    assert.equal(response.body.deactivated, true);
    assert.equal(response.body.service.status, 'inactive');
  });

  it('updates a profile and rotates the password', async () => {
    const token = (await login('neel@grove.edu', 'NeelPass1')).token;
    const profile = await request(app).patch('/api/users/me').set(auth(token)).send({
      name: 'Neel K. Kapoor',
      department: 'Mechanical',
      phone: '9845012345',
      studentId: 'CS26NEEL',
    });
    assert.equal(profile.status, 200);
    assert.equal(profile.body.user.name, 'Neel K. Kapoor');

    const rotated = await request(app).patch('/api/users/me/password').set(auth(token)).send({
      currentPassword: 'NeelPass1',
      newPassword: 'NeelPass2',
    });
    assert.equal(rotated.status, 200);
    const again = await login('neel@grove.edu', 'NeelPass2');
    assert.ok(again.token);
  });
});
