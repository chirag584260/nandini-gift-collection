import { mkdir, readFile, open, rename, unlink } from "node:fs/promises";
import { join, isAbsolute } from "node:path";
import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";

export const CONSENT_VERSION = "gift-enquiry-v1";
export const CONSENT_TEXT = "I agree that Nandini Gift Collection may retain my contact details and contact me about more gifts, even if I do not complete a purchase.";
const digest = value => createHash("sha256").update(String(value)).digest();
export function secretMatches(value, expected) {
  return typeof value === "string" && typeof expected === "string" && expected.length > 0 && timingSafeEqual(digest(value), digest(expected));
}

// Single process only. Directory must be mounted on a persistent disk in production.
export class EnquiryStore {
  constructor(directory) {
    if (!isAbsolute(directory)) throw new Error("ENQUIRY_DATA_DIR must be an absolute persistent-disk path.");
    this.directory = directory;
    this.path = join(directory, "enquiries.json");
    this.queue = Promise.resolve();
  }
  async read() {
    try {
      const records = JSON.parse(await readFile(this.path, "utf8"));
      if (!Array.isArray(records)) throw new Error("Invalid enquiry storage.");
      return records;
    } catch (error) { if (error.code === "ENOENT") return []; throw error; }
  }
  mutate(change) {
    const operation = this.queue.then(async () => {
      await mkdir(this.directory, { recursive: true, mode: 0o700 });
      const records = await this.read();
      const result = await change(records);
      const temporary = join(this.directory, `.enquiries-${randomUUID()}.tmp`);
      const file = await open(temporary, "wx", 0o600);
      try { await file.writeFile(JSON.stringify(records)); await file.sync(); }
      finally { await file.close(); }
      try { await rename(temporary, this.path); }
      catch (error) { await unlink(temporary).catch(() => {}); throw error; }
      const directory = await open(this.directory, "r");
      try { await directory.sync(); } finally { await directory.close(); }
      return result;
    });
    this.queue = operation.catch(() => {});
    return operation;
  }
  async ready() { await this.mutate(() => null); }
  async create({ name, mobile, lines, amount }) {
    const token = randomBytes(32).toString("hex");
    const id = randomUUID();
    const now = new Date().toISOString();
    await this.mutate(records => records.push({
      id, tokenHash: digest(token).toString("hex"), name, mobile, lines, amount,
      createdAt: now, updatedAt: now, status: "enquiry", orderId: null,
      consentVersion: CONSENT_VERSION, consentText: CONSENT_TEXT, consentAt: now,
    }));
    return { id, token };
  }
  async withdraw(id, token) {
    return this.mutate(records => {
      const index = records.findIndex(record => record.id === id && secretMatches(digest(token).toString("hex"), record.tokenHash));
      if (index === -1) return false;
      records.splice(index, 1);
      return true;
    });
  }
  async attach(reference, orderId, customer) {
    return this.mutate(records => {
      const record = records.find(record => record.id === reference?.id && secretMatches(digest(reference?.token || "").toString("hex"), record.tokenHash));
      if (!record || record.mobile !== customer.mobile || record.name !== customer.name) return false;
      record.status = "checkout_started";
      record.orderId = orderId;
      record.updatedAt = new Date().toISOString();
      return true;
    });
  }
  async paid(orderId) {
    await this.mutate(records => {
      for (const record of records) if (record.orderId === orderId) {
        record.status = "paid";
        record.updatedAt = new Date().toISOString();
      }
    });
  }
  async remove(id) {
    return this.mutate(records => {
      const index = records.findIndex(record => record.id === id);
      if (index === -1) return false;
      records.splice(index, 1);
      return true;
    });
  }
  async list() {
    await this.queue;
    return (await this.read()).map(({ tokenHash, ...record }) => record).reverse();
  }
}
