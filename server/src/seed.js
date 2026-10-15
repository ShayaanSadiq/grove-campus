import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { addCampusDays, campusMonthDate, campusToday, isoFromCampusDate } from './lib/dates.js';

const DAY = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];
const OFFICE = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

export function seed(db) {
  if (db.users.length) return false;

  const studentHash = bcrypt.hashSync('Student@123', 10);
  const adminHash = bcrypt.hashSync('Admin@123', 10);
  const createdAt = new Date().toISOString();

  const users = [
    user({ name: 'Meera Iyer', email: 'admin@grove.edu', passwordHash: adminHash, role: 'admin', studentId: 'ADM0001', department: 'Administration', phone: '9845011122' }),
    user({ name: 'Ananya Rao', email: 'ananya@grove.edu', passwordHash: studentHash, role: 'student', studentId: 'CS26AN01', department: 'Computer Science', phone: '9845001001' }),
    user({ name: 'Rohan Mehta', email: 'rohan@grove.edu', passwordHash: studentHash, role: 'student', studentId: 'EC26RH02', department: 'Electronics', phone: '9845001002' }),
    user({ name: 'Priya Nair', email: 'priya@grove.edu', passwordHash: studentHash, role: 'student', studentId: 'ME26PR03', department: 'Mechanical', phone: '9845001003' }),
    user({ name: 'Kabir Das', email: 'kabir@grove.edu', passwordHash: studentHash, role: 'student', studentId: 'MG26KB04', department: 'Management', phone: '9845001004' }),
    user({ name: 'Sara Iqbal', email: 'sara@grove.edu', passwordHash: studentHash, role: 'student', studentId: 'SC26SR05', department: 'Sciences', phone: '9845001005' }),
  ].map((entry) => ({ ...entry, createdAt }));

  const services = [
    service({ name: 'Group Study Room A', category: 'Academics', location: 'North Library, Level 2', price: 150, durationMinutes: 120, capacity: 1, slots: DAY, description: 'A six-seat room with a whiteboard and a door that actually closes. Book it for group revision.' }),
    service({ name: 'Silent Carrel Bay', category: 'Academics', location: 'Central Library, Silent Zone', price: 40, durationMinutes: 180, capacity: 10, slots: DAY, description: 'Individual desks in the silent zone, each with a lamp and a power outlet.' }),
    service({ name: 'CS Lab Workstation', category: 'Academics', location: 'Computer Block, Lab 3', price: 100, durationMinutes: 120, capacity: 16, slots: OFFICE, description: 'A reserved machine in Lab 3 with the course image, compilers, and quiet seating.' }),
    service({ name: 'Chemistry Bench', category: 'Academics', location: 'Science Block, Lab 1', price: 220, durationMinutes: 180, capacity: 8, slots: ['10:00', '11:00', '14:00', '15:00'], description: 'One bench with stocked reagents and a lab assistant on the floor.' }),
    service({ name: 'Basketball Half Court', category: 'Sports', location: 'Sports Complex, Indoor Hall', price: 300, durationMinutes: 60, capacity: 1, slots: ['08:00', '16:00', '17:00', '18:00'], description: 'Half court with indoor flooring. Borrow a ball from the sports desk if you need one.' }),
    service({ name: 'Badminton Court 2', category: 'Sports', location: 'Indoor Stadium', price: 180, durationMinutes: 60, capacity: 2, slots: OFFICE, description: 'Court 2 with nets already set. Non-marking shoes are required at the door.' }),
    service({ name: 'Clinic Consultation', category: 'Health', location: 'Campus Health Centre', price: 0, durationMinutes: 20, capacity: 1, slots: ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00'], description: 'A general physician slot. Arrive ten minutes early with your student ID.' }),
    service({ name: 'Counseling Session', category: 'Health', location: 'Wellness Centre, Room 2', price: 0, durationMinutes: 50, capacity: 1, slots: ['10:00', '11:00', '14:00', '15:00', '16:00'], description: 'A private session with a campus counselor. What you share stays in that room.' }),
    service({ name: 'Main Auditorium', category: 'Facilities', location: 'Admin Block', price: 2500, durationMinutes: 180, capacity: 1, slots: ['09:00', '13:00', '16:00'], description: '420 seats, a stage, and a basic light plot for talks, fests, and department shows.' }),
    service({ name: 'Seminar Hall B', category: 'Facilities', location: 'Academic Block, Level 1', price: 700, durationMinutes: 120, capacity: 1, slots: ['09:00', '11:00', '14:00', '16:00'], description: 'Forty seats, a projector, and a lectern. Suited to guest lectures and club meets.' }),
    service({ name: 'Hostel Maintenance', category: 'Facilities', location: 'Hostel Office', price: 0, durationMinutes: 60, capacity: 6, slots: ['09:00', '11:00', '14:00', '16:00'], description: 'Electrical, plumbing, or furniture repairs inside the campus hostels.' }),
    service({ name: 'City Shuttle Seat', category: 'Transport', location: 'Main Gate', price: 40, durationMinutes: 45, capacity: 12, slots: ['08:00', '09:00', '17:00', '18:00'], description: 'A reserved seat on the shuttle between the main gate and the city bus stand.' }),
    service({ name: 'Print and Binding Desk', category: 'Facilities', location: 'Library Annex', price: 80, durationMinutes: 30, capacity: 4, slots: OFFICE, description: 'A staffed desk for course packs, spiral binding, and colour prints.' }),
    service({ name: 'Mock Interview', category: 'Career', location: 'Placement Cell', price: 0, durationMinutes: 30, capacity: 2, slots: ['11:00', '14:00', '15:00', '16:00'], description: 'Thirty minutes with the placement team, followed by direct feedback.' }),
  ].map((entry) => ({ ...entry, createdAt, updatedAt: createdAt }));

  const byName = Object.fromEntries(services.map((item) => [item.name, item]));
  const byEmail = Object.fromEntries(users.map((item) => [item.email, item]));
  const bookings = [];
  const payments = [];
  const feedback = [];

  function place({ email, serviceName, date, slot, status, notes, amountPaid = false, review, hour = 9 }) {
    const person = byEmail[email];
    const item = byName[serviceName];
    const taken = bookings.filter((entry) => entry.serviceId === item.id && entry.date === date && entry.timeSlot === slot && entry.status !== 'cancelled').length;
    if (taken >= item.capacity) return null;
    const stamp = isoFromCampusDate(date, hour);
    const booking = {
      id: crypto.randomUUID(),
      userId: person.id,
      serviceId: item.id,
      date,
      timeSlot: slot,
      notes,
      status,
      paymentStatus: item.price === 0 ? 'not_required' : amountPaid ? 'paid' : 'unpaid',
      amount: item.price,
      cancelReason: '',
      createdAt: stamp,
      updatedAt: stamp,
    };
    bookings.push(booking);
    if (amountPaid && item.price > 0) {
      payments.push({
        id: crypto.randomUUID(),
        bookingId: booking.id,
        userId: person.id,
        amount: item.price,
        method: 'campus_wallet',
        brand: 'Campus wallet',
        last4: null,
        status: 'paid',
        transactionId: `GRV-SEED-${booking.id.slice(0, 8).toUpperCase()}`,
        createdAt: stamp,
      });
    }
    if (review) {
      feedback.push({
        id: crypto.randomUUID(),
        bookingId: booking.id,
        userId: person.id,
        serviceId: item.id,
        rating: review.rating,
        comment: review.comment,
        createdAt: stamp,
      });
    }
    return booking;
  }

  const paidServices = services.filter((item) => item.price > 0);
  const students = users.filter((item) => item.role === 'student');
  students.forEach((person, index) => {
    for (let step = 0; step < 4; step += 1) {
      const item = paidServices[(index * 2 + step) % paidServices.length];
      const monthsBack = ((index + step) % 5) + 1;
      const day = 3 + ((index * 4 + step * 3) % 22);
      const review = (index + step) % 3 === 0 ? null : {
        rating: [5, 4, 5, 3, 4][(index + step) % 5],
        comment: [
          'The room was ready on time and the whiteboard markers worked.',
          'Smooth handover at the desk. I would book this again before exams.',
          'A little crowded at the start, then it settled. Worth the slot.',
          'Clear instructions and no waiting once the slot began.',
        ][(index + step) % 4],
      };
      const placed = place({
        email: person.email,
        serviceName: item.name,
        date: campusMonthDate(monthsBack, day),
        slot: item.slots[(index + step) % item.slots.length],
        status: 'completed',
        notes: 'Seeded campus usage for the dashboard.',
        amountPaid: true,
        hour: 10,
        review,
      });
      if (!placed) {
        place({
          email: person.email,
          serviceName: item.name,
          date: campusMonthDate(monthsBack, Math.min(day + 1, 27)),
          slot: item.slots[(index + step + 1) % item.slots.length],
          status: 'completed',
          notes: 'Seeded campus usage for the dashboard.',
          amountPaid: true,
          hour: 11,
          review,
        });
      }
    }
  });

  place({
    email: 'ananya@grove.edu',
    serviceName: 'Group Study Room A',
    date: addCampusDays(2),
    slot: '10:00',
    status: 'pending',
    notes: 'Group revision for the networks quiz.',
    hour: 8,
  });
  place({
    email: 'ananya@grove.edu',
    serviceName: 'City Shuttle Seat',
    date: addCampusDays(3),
    slot: '17:00',
    status: 'confirmed',
    notes: 'Evening shuttle to the city bus stand.',
    amountPaid: true,
    hour: 8,
  });
  place({
    email: 'ananya@grove.edu',
    serviceName: 'Mock Interview',
    date: addCampusDays(-4),
    slot: '11:00',
    status: 'completed',
    notes: 'Practice round for the internship shortlist.',
    hour: 11,
  });
  place({
    email: 'ananya@grove.edu',
    serviceName: 'CS Lab Workstation',
    date: addCampusDays(-8),
    slot: '14:00',
    status: 'completed',
    notes: 'Compiler lab for the programming assignment.',
    amountPaid: true,
    hour: 14,
    review: { rating: 5, comment: 'The machine was imaged correctly and I finished the lab without switching seats.' },
  });
  place({
    email: 'rohan@grove.edu',
    serviceName: 'Clinic Consultation',
    date: campusToday(),
    slot: '15:00',
    status: 'in_progress',
    notes: 'Follow-up for a sports sprain.',
    hour: 9,
  });
  place({
    email: 'priya@grove.edu',
    serviceName: 'Seminar Hall B',
    date: addCampusDays(5),
    slot: '11:00',
    status: 'confirmed',
    notes: 'Department club orientation.',
    amountPaid: true,
    hour: 9,
  });
  place({
    email: 'kabir@grove.edu',
    serviceName: 'Hostel Maintenance',
    date: addCampusDays(1),
    slot: '16:00',
    status: 'confirmed',
    notes: 'Ceiling fan in room B-214 is not turning.',
    hour: 9,
  });
  place({
    email: 'sara@grove.edu',
    serviceName: 'Chemistry Bench',
    date: addCampusDays(-6),
    slot: '10:00',
    status: 'completed',
    notes: 'Titration practical.',
    amountPaid: true,
    hour: 10,
    review: { rating: 4, comment: 'Bench was clean and the assistant knew the practical sheet.' },
  });

  db.users = users;
  db.services = services;
  db.bookings = bookings;
  db.payments = payments;
  db.feedback = feedback;
  return true;
}

function user(fields) {
  return { id: crypto.randomUUID(), status: 'active', ...fields };
}

function service(fields) {
  return { id: crypto.randomUUID(), status: 'active', ...fields };
}
