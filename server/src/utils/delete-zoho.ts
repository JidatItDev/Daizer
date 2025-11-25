import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const BASE_URL = "https://www.zohoapis.com/books/v3";
const ZOHO_ORG_ID = 904115537;
const ACCESS_TOKEN =
  "1000.1c3333f5da77aa6893c7d8c08dd152eb.0a253978f9b9956a3c1a0a4b2b6269c7";

if (!ZOHO_ORG_ID || !ACCESS_TOKEN) {
  console.error("❌ Missing env variables: ZOHO_ORG_ID or ZOHO_ACCESS_TOKEN");
  process.exit(1);
}

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    Authorization: `Zoho-oauthtoken ${ACCESS_TOKEN}`,
    "X-com-zoho-books-organizationid": ZOHO_ORG_ID,
  },
});

// -----------------------
// Helper: Fetch all pages
// -----------------------
async function getAll<T>(url: string, key: string): Promise<T[]> {
  let page = 1;
  const results: T[] = [];

  while (true) {
    const res = await api.get(`${url}?page=${page}`);
    const list: T[] = res.data[key];

    if (!list || list.length === 0) break;

    results.push(...list);
    page++;
  }

  return results;
}

// -----------------------------------
// STEP 1: Remove credit-note applications
// -----------------------------------
async function unapplyCreditNotes() {
  const creditNotes = await getAll<any>("/creditnotes", "creditnotes");

  for (const cn of creditNotes) {
    if (!cn.invoices || cn.invoices.length === 0) continue;

    console.log(`🔄 Unapplying CN ${cn.creditnote_id} ...`);

    for (const inv of cn.invoices) {
      await api.post(
        `/creditnotes/${cn.creditnote_id}/invoices/${inv.invoice_id}/delete`
      );
    }
  }
}

// -----------------------------------
// STEP 2: Delete credit notes
// -----------------------------------
async function deleteCreditNotes() {
  const creditNotes = await getAll<any>("/creditnotes", "creditnotes");

  for (const cn of creditNotes) {
    console.log(`🗑 Deleting Credit Note: ${cn.creditnote_id}`);
    await api.delete(`/creditnotes/${cn.creditnote_id}`);
  }
}

// -----------------------------------
// STEP 3: Delete invoices
// -----------------------------------
async function deleteInvoices() {
  const invoices = await getAll<any>("/invoices", "invoices");

  for (const inv of invoices) {
    console.log(`🗑 Deleting Invoice: ${inv.invoice_id}`);
    await api.delete(`/invoices/${inv.invoice_id}`);
  }
}

// -----------------------------------
// STEP 4: Delete customer payments
// -----------------------------------
async function deletePayments() {
  const payments = await getAll<any>("/customerpayments", "customerpayments");

  for (const p of payments) {
    console.log(`🗑 Deleting Payment: ${p.payment_id}`);
    await api.delete(`/customerpayments/${p.payment_id}`);
  }
}

// -----------------------------------
// STEP 5: Delete customers
// -----------------------------------
async function deleteCustomers() {
  const customers = await getAll<any>("/customers", "customers");

  for (const c of customers) {
    console.log(`🗑 Deleting Customer: ${c.customer_id}`);
    await api.delete(`/customers/${c.customer_id}`);
  }
}

// -----------------------------------
// STEP 6: Delete items
// -----------------------------------
async function deleteItems() {
  const items = await getAll<any>("/items", "items");

  for (const item of items) {
    console.log(`🗑 Deleting Item: ${item.item_id}`);
    await api.delete(`/items/${item.item_id}`);
  }
}
async function fetchAll(url: string, key: string) {
  const res = await api.get(url, {
    params: { organization_id: ZOHO_ORG_ID },
  });
  return res.data[key] || [];
}

async function deleteOne(url: string) {
  try {
    await api.delete(url, { params: { organization_id: ZOHO_ORG_ID } });
    console.log("✔ Deleted:", url);
  } catch (err: any) {
    console.log("❌ Error deleting", url, err.response?.data || err.message);
  }
}

async function deleteAll(
  url: string,
  key: string,
  buildUrl: (id: string) => string
) {
  const items = await fetchAll(url, key);
  for (const item of items) {
    await deleteOne(
      buildUrl(item[key.slice(0, -1) + "_id"] || item[key.slice(0, -1)])
    );
  }
}
// -----------------------------------
// RUN ALL STEPS IN CORRECT ORDER
// -----------------------------------
(async () => {
  console.log("🚀 Starting Zoho Books Cleanup...");

  // 1️⃣ Credit Note Refunds
  await deleteAll(
    "/creditnotes/refunds",
    "creditnote_refunds",
    (id) => `/creditnotes/refunds/${id}`
  );

  // 2️⃣ Credit Notes
  await deleteAll("/creditnotes", "creditnotes", (id) => `/creditnotes/${id}`);

  // 3️⃣ Payments Received
  await deleteAll(
    "/customerpayments",
    "customerpayments",
    (id) => `/customerpayments/${id}`
  );

  // 4️⃣ Invoices
  await deleteAll("/invoices", "invoices", (id) => `/invoices/${id}`);

  // 5️⃣ Vendor Payments
  await deleteAll(
    "/vendorpayments",
    "vendorpayments",
    (id) => `/vendorpayments/${id}`
  );

  // 6️⃣ Bills
  await deleteAll("/bills", "bills", (id) => `/bills/${id}`);

  // 7️⃣ Items
  await deleteAll("/items", "items", (id) => `/items/${id}`);

  // 8️⃣ Customers
  await deleteAll(
    "/contacts?type=customer",
    "contacts",
    (id) => `/contacts/${id}`
  );

  // 9️⃣ Vendors
  await deleteAll(
    "/contacts?type=vendor",
    "contacts",
    (id) => `/contacts/${id}`
  );

  console.log("🎉 Cleanup Completed Successfully!");
})();
