let accessToken = "", enquiries = [];
const $ = selector => document.querySelector(selector);
const status = (message, error = false) => { $("#status").textContent = message; $("#status").className = error ? "error" : ""; };
async function request(path, options = {}) {
  const response = await fetch(path, { ...options, cache: "no-store", headers: { authorization: `Bearer ${accessToken}`, ...options.headers } });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "Request failed.");
  return body;
}
function visible() {
  const query = $("#search").value.toLowerCase().trim(), filter = $("#filter").value;
  return enquiries.filter(e => (!query || `${e.name} ${e.mobile}`.toLowerCase().includes(query)) && (!filter || (filter === "paid" ? e.status === "paid" : e.status !== "paid")));
}
const date = value => new Date(value).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
const purchaseStatus = e => e.status === "paid" ? "Payment confirmed" : e.status === "checkout_started" ? "Checkout started · no confirmed payment" : "Enquiry · no confirmed payment";
function render() {
  $("#rows").replaceChildren();
  const records = visible();
  $("#count").textContent = `${records.length} of ${enquiries.length} enquiries`;
  for (const enquiry of records) {
    const row = document.createElement("tr");
    const values = [date(enquiry.createdAt), enquiry.name, enquiry.mobile, enquiry.lines.map(p => `${p.name} × ${p.quantity}`).join("; "), purchaseStatus(enquiry), `Permission given: ${date(enquiry.consentAt)}`];
    for (const value of values) { const cell = document.createElement("td"); cell.textContent = value; row.append(cell); }
    const details = document.createElement("small"); details.textContent = enquiry.consentText; row.children[5].append(details);
    const cell = document.createElement("td"), remove = document.createElement("button");
    remove.type = "button"; remove.textContent = "Delete";
    remove.onclick = async () => {
      if (!confirm(`Delete the saved gift enquiry for ${enquiry.name}?`)) return;
      try { await request(`/api/admin/enquiries/${encodeURIComponent(enquiry.id)}`, { method: "DELETE" }); enquiries = enquiries.filter(e => e.id !== enquiry.id); render(); status("Enquiry deleted."); }
      catch (error) { status(error.message, true); }
    };
    cell.append(remove); row.append(cell); $("#rows").append(row);
  }
}
async function load() {
  try { const body = await request("/api/admin/enquiries"); enquiries = body.enquiries; $("#login").hidden = true; $("#records").hidden = false; $("#password").value = ""; render(); status("Enquiries loaded."); }
  catch (error) { status(error.message, true); }
}
$("#login").onsubmit = event => { event.preventDefault(); accessToken = $("#password").value; load(); };
$("#search").oninput = render; $("#filter").onchange = render; $("#refresh").onclick = load;
$("#logout").onclick = () => { accessToken = ""; enquiries = []; $("#rows").replaceChildren(); $("#records").hidden = true; $("#login").hidden = false; status("Enquiries locked."); };
$("#export").onclick = () => {
  // Prevent spreadsheet formula execution in customer-controlled cells.
  const quote = value => `"${String(value ?? "").replace(/^[\s]*[=+@-]/, "'$&").replaceAll('"', '""')}"`;
  const columns = ["Received (India)", "Name", "Mobile", "Products", "Purchase status", "Order ID", "Consent time (India)", "Consent text"];
  const records = visible().map(e => [date(e.createdAt), e.name, e.mobile, e.lines.map(p => `${p.name} × ${p.quantity}`).join("; "), purchaseStatus(e), e.orderId, date(e.consentAt), e.consentText]);
  const csv = "\uFEFF" + [columns, ...records].map(row => row.map(quote).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a"); link.href = url; link.download = `nandini-customer-enquiries-${new Date().toISOString().slice(0,10)}.csv`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
};
