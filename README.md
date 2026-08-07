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

## GoDaddy
After deployment, add nandinigift.in and www.nandinigift.in as custom domains at your host and enter the exact DNS records supplied by the host in GoDaddy DNS. Keep existing MX records if you use domain email.
