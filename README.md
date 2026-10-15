# Grove

Campus booking site for the term project. A student can look through services (study rooms, labs, the shuttle, and so on), pick a date and slot, and pay with a test card or the campus wallet. Admins have their own pages for the catalog, bookings, and accounts.

## Run it

```bash
npm install
npm run dev
```

The site is http://localhost:5173 and the API is http://localhost:4000.

| | email | password |
| --- | --- | --- |
| student | ananya@grove.edu | Student@123 |
| admin | admin@grove.edu | Admin@123 |

rohan, priya, kabir, and sara at grove.edu use Student@123 as well.

Ananya already has an unpaid study room, a paid shuttle seat, and a finished mock interview that has no review yet. If you mess the sample data up, `npm run reset` puts it back.

## Layout

`client/` is the React app. `server/` is the Express API. Bookings and users are stored in `server/data/db.json`. If that file is missing, the server writes the sample campus the first time it starts. Set `MONGODB_URI` when you want MongoDB instead of the file. Copy `.env.example` to `.env` for the other settings. Production will not start unless `JWT_SECRET` is set.

`npm test` uses a temporary data file, so it does not change `db.json`.

`npm run build` then `npm start` serves the built site and the API together on port 4000.

Docker is `docker compose up --build`, then http://localhost:4000. Set `JWT_SECRET` in the environment first.

## Payments

This is not a real gateway. The card check is Luhn, plus the expiry has to be in the future. `4242 4242 4242 4242` succeeds. `4000 0000 0000 0002` is declined. Any 3-digit CVV is fine on the test card. The campus wallet just approves.

What gets saved is the brand, last four digits, amount, and a transaction id. The full card number and CVV are not stored. Cancelling a paid booking marks that payment refunded. A free service confirms without a charge.

## A few routes

- `/design` is the wireframe page
- `/api-map` lists the API
- `/admin` is the office view, after the admin login
