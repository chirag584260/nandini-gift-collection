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
The static site uses the deployed `payment-api/` Node web service for Razorpay Orders and server-side payment verification. Configure `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `SITE_ORIGINS=https://nandinigift.in,https://www.nandinigift.in` as service environment variables. Keep the key secret in the host's secret settings; never add it to the repository or browser code. The API URL is set in `diwali-cart.js`. Use Razorpay test keys for end-to-end testing before switching to live keys. The cart accepts online payment only for the fixed-price Diwali items; “starting from” products continue through WhatsApp for a confirmed quote. Online payment covers product prices only; shipping is confirmed and collected separately.

Run the API checks with `npm test --prefix payment-api`.

## GoDaddy
After deployment, add nandinigift.in and www.nandinigift.in as custom domains at your host and enter the exact DNS records supplied by the host in GoDaddy DNS. Keep existing MX records if you use domain email.

## Customer gift enquiries (optional consent)

The checkout shows **“To enquire about more gifts, fill in your name and mobile number.”** followed by an optional, initially unticked checkbox. The permission states that Nandini Gift Collection may retain contact details and follow up about more gifts even when no purchase is completed. Name, mobile, selected products, server-priced amount and consent text/version/time are saved only after valid contact details and this permission are provided. No address, card, UPI, OTP or payment credentials are included in the enquiry record. Ordinary delivery details still go to Razorpay for order processing independently of this optional follow-up permission.

Enquiries are saved before payment, when the customer ticks the checkbox (or leaves a contact field after ticking it). Unticking removes the enquiry record while this page remains open. Customers can also ask the shop to remove an enquiry; the owner page has a Delete button. In-progress save failures are shown in the checkout, and do not block ordinary purchases.

### Render activation

1. Open the **payment API web service** `nandini-gift-payment-api` (root directory `payment-api`; start command `npm start`). Attach a persistent disk mounted at `/var/data`. Do not use an ephemeral service directory for customer data.
2. Set `ENQUIRY_DATA_DIR=/var/data/enquiries` in that service's environment.
3. Set `ENQUIRY_ADMIN_TOKEN` to a new random password of at least 32 characters. Keep this password in the service's secret environment settings; do not commit its value. For example, generate one locally with `openssl rand -hex 24`.
4. Deploy the latest `main` commit to **both** the payment API service and the static website service `nandini-gift-bhopal`.
5. Open `https://nandini-gift-payment-api.onrender.com/enquiries` and enter that owner password. The page supports search, purchase status filtering, CSV export and deletion. The password is held only in page memory and cleared on Lock/reload. Do not share exports publicly.
6. Verify with a test enquiry: provide a test name/mobile, tick permission, check the owner page without making a payment, then untick and verify removal. Do not use real customer information for setup testing.

The feature stays hidden and its endpoints reject writes until both the storage path and owner password are configured and the store is writable. Records survive restarts/deployments **only when the configured directory is on a persistent disk**. Use a single process and one service instance with this file store. If scaling to multiple instances, replace it with a shared database. Data is stored with directory/file modes `0700`/`0600`; back up the persistent disk as appropriate.

Owner statuses are `enquiry`, `checkout_started` and `paid`. A record is marked paid only after server-side Razorpay signature, order, amount and captured-payment verification. An unfinished or interrupted verification may leave a genuinely paid record as checkout started; confirm in Razorpay before contacting someone about payment. There is no automatic marketing or customer messaging.

## Customer-sent WhatsApp gift enquiries

A green **Send enquiry on WhatsApp** section appears below the checkout name/mobile fields on the Products, Kids Toys and Showpieces pages. It works without the payment API or persistent enquiry storage. The customer supplies a valid name/mobile, ticks the optional contact permission and clicks the button. This opens a prepared WhatsApp message to the shop number `+91 8266814556`, including name, mobile, selected product names/quantities and permission to follow up about that enquiry. The customer must press **Send** in WhatsApp before the shop receives anything.

The enquiry button does not require address, PIN code or payment, does not clear the cart and does not submit an enquiry to the backend. The existing optional server-side enquiry feature stays hidden unless its storage configuration is activated separately. Deploy only the `nandini-gift-bhopal` static service for this frontend change; no paid service upgrade or WhatsApp Business API is required for the customer-sent link.
