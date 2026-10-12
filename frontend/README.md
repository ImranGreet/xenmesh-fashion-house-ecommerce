# Xenmesh Fashion House admin

The Vite app uses React Router for the public storefront at `/`, product detail
pages at `/products/:productId`, and the cookie-authenticated admin dashboard at
`/admin`. Customers can order single products or their cart with cash on
delivery. Admins manage orders, the product catalog, categories, and time-bound
promotions. Product and category browsing and order placement are public; order
management requires an admin session.

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

The storefront is served at `http://localhost:5173` and the admin dashboard at
`http://localhost:5173/admin`. Set `VITE_API_URL` in
`frontend/.env` to override the API origin. The backend's `FRONTEND_URL` must
match the frontend origin so credentialed sign-in cookies are accepted.

The first admin is created by the backend from `ADMIN_EMAIL` and
`ADMIN_PASSWORD` on startup. Use the configured credentials to sign in.

## API

Public endpoints:

- `GET /catalog/categories`
- `GET /catalog/products` (includes applicable live sale prices)
- `GET /catalog/products/:id` (product details with the current sale price)
- `GET /catalog/promotions` (active offers that have not ended)
- `GET /store/settings` (public store name and contact information)
- `POST /orders` (place a cash-on-delivery order; product prices and stock are
  checked by the backend)

Admin session required:

- `GET /admin/orders`
- `PATCH /admin/orders/:id` (advance the order status or cancel and restock)
- `PATCH /admin/settings` (update public store name, email, phone and location)
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
