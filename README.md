# NANDINI GIFT COLLECTION — upgraded full-stack starter

Includes 5 customer pages, product database, search/filter, cart, checkout/order API, WhatsApp notification, customer enquiries, stock tracking, secure session admin login, admin order status and product creation, security headers and API rate limiting.

## Run
Node.js 18+ recommended.
1. npm install
2. Set ADMIN_USER, ADMIN_PASSWORD and SESSION_SECRET environment variables.
3. npm start
4. Open http://localhost:3000

Admin: /admin.html

## Production
Deploy to a Node.js host with persistent disk if using SQLite. For larger traffic, migrate to managed PostgreSQL. Add a real payment provider only after obtaining merchant credentials; never put secret keys in frontend code.

## Razorpay checkout API
The static site uses `payment-api/` for Razorpay Orders and server-side payment verification. Deploy that folder as a Node web service (Node 20+, start command `npm start`, health check `/health`) and add `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `SITE_ORIGINS=https://nandinigift.in,https://www.nandinigift.in` as service environment variables. Keep the key secret in the host's secret settings; never add it to the repository or browser code. Set `PAYMENT_API_BASE` at the top of `diwali-cart.js` to the deployed API URL, then redeploy the static site. Use Razorpay test keys for end-to-end testing before switching to live keys. The cart accepts online payment only for the fixed-price Diwali items; “starting from” products continue through WhatsApp for a confirmed quote. Online payment covers product prices only; shipping is confirmed and collected separately.

Run the API checks with `npm test --prefix payment-api`.

## GoDaddy
After deployment, add nandinigift.in and www.nandinigift.in as custom domains at your host and enter the exact DNS records supplied by the host in GoDaddy DNS. Keep existing MX records if you use domain email.
