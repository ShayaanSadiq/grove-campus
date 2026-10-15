export function authorName(user) {
  if (!user?.name) return 'Campus user';
  const parts = user.name.split(' ');
  const first = parts[0];
  const last = parts.length > 1 ? ` ${parts[parts.length - 1][0]}.` : '';
  return `${first}${last}`;
}

export function presentService(db, service) {
  const reviews = db.feedback.filter((item) => item.serviceId === service.id);
  const rating = reviews.length
    ? Math.round((reviews.reduce((sum, item) => sum + item.rating, 0) / reviews.length) * 10) / 10
    : null;
  return {
    ...service,
    rating,
    reviewCount: reviews.length,
    bookingCount: db.bookings.filter((item) => item.serviceId === service.id && item.status !== 'cancelled').length,
  };
}

export function presentReview(db, item) {
  const user = db.users.find((entry) => entry.id === item.userId);
  return {
    id: item.id,
    serviceId: item.serviceId,
    bookingId: item.bookingId,
    rating: item.rating,
    comment: item.comment,
    createdAt: item.createdAt,
    author: authorName(user),
  };
}

export function presentBooking(db, booking) {
  const service = db.services.find((item) => item.id === booking.serviceId);
  const user = db.users.find((item) => item.id === booking.userId);
  const payment = [...db.payments].reverse().find((item) => item.bookingId === booking.id) || null;
  const feedback = db.feedback.find((item) => item.bookingId === booking.id) || null;
  return {
    ...booking,
    service: service
      ? {
          id: service.id,
          name: service.name,
          category: service.category,
          location: service.location,
          durationMinutes: service.durationMinutes,
        }
      : null,
    user: user
      ? { id: user.id, name: user.name, email: user.email, department: user.department, studentId: user.studentId }
      : null,
    payment: payment
      ? {
          id: payment.id,
          method: payment.method,
          brand: payment.brand,
          last4: payment.last4,
          amount: payment.amount,
          status: payment.status,
          transactionId: payment.transactionId,
          createdAt: payment.createdAt,
        }
      : null,
    feedback: feedback
      ? { id: feedback.id, rating: feedback.rating, comment: feedback.comment, createdAt: feedback.createdAt }
      : null,
  };
}

export function heldCount(db, serviceId, date, timeSlot) {
  return db.bookings.filter(
    (item) => item.serviceId === serviceId && item.date === date && item.timeSlot === timeSlot && item.status !== 'cancelled',
  ).length;
}
