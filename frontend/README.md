# Xenmesh Fashion House admin

The Vite app provides a cookie-authenticated admin dashboard for managing the
product catalog and time-bound promotions. The public catalog endpoints do not
require an admin session.

## Local setup

1. Configure the database connection and an initial admin account in
   `backend/.env` using `backend/.env.example`.
2. From `backend`, install dependencies, generate the Prisma client, apply
   migrations, and start the API:

   ```sh
   npm install
   npx prisma generate --schema prisma
   npx prisma migrate deploy --schema prisma
   npm run start:dev
   ```

3. From `frontend`, install dependencies and start Vite:

   ```sh
   npm install
   npm run dev
   ```

The dashboard is served at `http://localhost:5173`. Set `VITE_API_URL` in
`frontend/.env` to override the API origin. The backend's `FRONTEND_URL` must
match the frontend origin so credentialed sign-in cookies are accepted.

The first admin is created by the backend from `ADMIN_EMAIL` and
`ADMIN_PASSWORD` on startup. Use the configured credentials to sign in.

## API

Public endpoints:

- `GET /catalog/categories`
- `GET /catalog/products`
- `GET /catalog/promotions` (active offers that have not ended)

Admin session required:

- `GET /admin/categories`, `POST /admin/categories`,
  `PATCH /admin/categories/:id`, `DELETE /admin/categories/:id`
- `GET /admin/products`, `POST /admin/products`,
  `PATCH /admin/products/:id`, `DELETE /admin/products/:id`
- `GET /admin/promotions`, `POST /admin/promotions`,
  `PATCH /admin/promotions/:id`, `DELETE /admin/promotions/:id`

Admin authentication:

- `POST /auth/sign-in`
- `GET /auth/me`
- `POST /auth/sign-out`
