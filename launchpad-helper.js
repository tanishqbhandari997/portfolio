(() => {
  "use strict";

  const STORAGE_KEY = "tanishq-portfolio-demo-v1";
  const LEGACY_STORAGE_KEY = "tanishk-portfolio-demo-v1";
  const PROFILE_KEY = "tanishq-portfolio-profile";
  const LEGACY_PROFILE_KEY = "tanishk-portfolio-profile";
  const profiles = {
    student: { id: "demo-student", name: "Aarav Student", role: "student" },
    faculty: { id: "demo-faculty", name: "Mira Faculty", role: "faculty" },
  };
  const listeners = new Set();
  const chatListeners = new Map();
  let user = null;
  let store;

  const ensurePortfolioNav = () => {
    if (document.querySelector(".portfolio-nav")) return;
    const style = document.createElement("style");
    style.textContent = `
      .portfolio-nav {
        position: relative;
        z-index: 1000;
        display: flex;
        min-height: 46px;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 8px max(18px, calc((100% - 1180px) / 2));
        border-bottom: 1px solid rgba(32, 58, 52, 0.12);
        background: #f6f4ed;
        color: #203a34;
        font: 600 13px/1.3 "Segoe UI", Inter, Arial, sans-serif;
      }
      .portfolio-nav a {
        color: inherit;
        text-decoration: none;
      }
      .portfolio-nav a:hover { text-decoration: underline; }
      .portfolio-nav a:focus-visible,
      .portfolio-nav select:focus-visible {
        outline: 3px solid #bb805e;
        outline-offset: 3px;
      }
      .portfolio-nav-label {
        color: #71817a;
        font-size: 11px;
      }
      @media (max-width: 520px) {
        .portfolio-nav {
          padding-inline: 14px;
        }
        .portfolio-nav-label {
          display: none;
        }
      }
    `;
    document.head.append(style);

    const nav = document.createElement("nav");
    nav.className = "portfolio-nav";
    nav.setAttribute("aria-label", "Portfolio navigation");
    nav.innerHTML = '<a href="./index.html">← Back to portfolio</a><span class="portfolio-nav-label">Project demo</span><span id="demo-profile-slot"></span>';
    document.body.prepend(nav);
  };
  ensurePortfolioNav();

  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  const initialData = () => ({
    finance: {
      transactions: [
        { id: 1, date: `${month}-03`, description: "Monthly stipend", category: "Income", amount: 18000 },
        { id: 2, date: `${month}-06`, description: "Groceries", category: "Food", amount: -2350 },
        { id: 3, date: `${month}-09`, description: "Metro card", category: "Transport", amount: -850 },
        { id: 4, date: `${month}-12`, description: "Internet bill", category: "Bills", amount: -699 },
      ],
      budgets: [
        { category: "Food", limit_value: 6000 },
        { category: "Transport", limit_value: 2500 },
        { category: "Bills", limit_value: 1800 },
      ],
    },
    college: {
      students: [
        { id: "s-1", name: "Aarav Student", attendance: 88, cgpa: 8.1 },
        { id: "s-2", name: "Diya Sharma", attendance: 71, cgpa: 7.4 },
        { id: "s-3", name: "Kabir Rao", attendance: 94, cgpa: 8.8 },
      ],
      notices: [
        { body: "Project review submissions are due Friday.", author: "Mira Faculty", created_at: new Date().toISOString() },
      ],
      timetable: [
        { name: "Applied Mathematics", place: "Room 204", time: "09:00" },
        { name: "Data Structures", place: "Lab 2", time: "11:00" },
        { name: "Design Studio", place: "Room 108", time: "14:00" },
      ],
    },
    chat: { messages: [] },
    inventory: {
      products: [
        { id: 1, name: "Notebook", price: 60, stock: 24 },
        { id: 2, name: "Pen set", price: 45, stock: 32 },
        { id: 3, name: "Desk planner", price: 180, stock: 8 },
        { id: 4, name: "Water bottle", price: 250, stock: 0 },
      ],
      sales: [],
    },
    warehouse: {
      vendors: [
        { id: 1, name: "Northstar Stationery", contact_name: "Riya Mehta", email: "hello@northstar.example", phone: "+91 80000 10001" },
        { id: 2, name: "Paper & Co.", contact_name: "Dev Shah", email: "orders@paperco.example", phone: "+91 80000 10002" },
      ],
      products: [
        { id: 1, sku: "ST-101", name: "A5 Notebook", category: "Stationery", vendor: "Northstar Stationery", vendor_id: 1, on_hand: 7, on_order: 0, reorder_point: 12, batch_count: 2, unit_cost: 42 },
        { id: 2, sku: "ST-102", name: "Gel Pen Pack", category: "Stationery", vendor: "Paper & Co.", vendor_id: 2, on_hand: 35, on_order: 0, reorder_point: 10, batch_count: 3, unit_cost: 28 },
        { id: 3, sku: "OF-201", name: "Desk Planner", category: "Office", vendor: "Northstar Stationery", vendor_id: 1, on_hand: 4, on_order: 0, reorder_point: 8, batch_count: 1, unit_cost: 110 },
      ],
      orders: [],
      contacts: [],
    },
    blog: [
      {
        id: 1, author_id: "demo-faculty", author: "Mira Faculty",
        title: "A small note on starting",
        markdown: "The best way to begin is to make the first version small.\n\nA working draft gives you something real to improve.",
        tags: ["making", "notes"], status: "published", updated_at: new Date().toISOString(),
      },
      {
        id: 2, author_id: "demo-faculty", author: "Mira Faculty",
        title: "Keep useful work visible",
        markdown: "A short changelog can make a long project feel manageable.",
        tags: ["process"], status: "published", updated_at: new Date().toISOString(),
      },
    ],
    nextIds: { transaction: 5, student: 4, notice: 2, product: 5, sale: 1, vendor: 3, warehouseProduct: 4, order: 1, contact: 1, post: 3 },
  });

  function readStore() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const legacySaved = !saved ? localStorage.getItem(LEGACY_STORAGE_KEY) : null;
      const currentValue = saved || legacySaved;
      if (!currentValue) {
        store = initialData();
        writeStore();
      } else {
        if (legacySaved && !saved) localStorage.setItem(STORAGE_KEY, legacySaved);
        store = JSON.parse(currentValue);
      }
    } catch (error) {
      throw new Error(`Could not open this browser's demo storage: ${error.message}`);
    }
  }

  function writeStore() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch (error) {
      throw new Error(`Could not save this browser's demo data: ${error.message}`);
    }
  }

  function parseBody(options) {
    if (!options.body) return {};
    try {
      return JSON.parse(options.body);
    } catch {
      throw new Error("The demo received invalid JSON.");
    }
  }

  function requireUser() {
    if (!user) throw new Error("Choose a demo profile first.");
  }

  function markdownHtml(markdown) {
    const escaped = String(markdown).replace(/[&<>"]/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;",
    })[char]);
    return escaped.split(/\n{2,}/).map(block => {
      const line = block.trim();
      if (!line) return "";
      if (line.startsWith("### ")) return `<h3>${line.slice(4)}</h3>`;
      if (line.startsWith("## ")) return `<h2>${line.slice(3)}</h2>`;
      if (line.startsWith("# ")) return `<h2>${line.slice(2)}</h2>`;
      return `<p>${line.replace(/\n/g, "<br>")}</p>`;
    }).join("");
  }

  function resultFor(requestUrl, method, payload) {
    const path = requestUrl.pathname;
    if (path === "/api/finance" && method === "GET") {
      requireUser();
      return { transactions: store.finance.transactions, budgets: store.finance.budgets };
    }
    if (path === "/api/finance/budgets" && method === "PUT") {
      requireUser();
      const category = String(payload.category || "").trim();
      const limit = Number(payload.limit);
      if (!category || !Number.isFinite(limit) || limit < 0) throw new Error("Enter a category and a non-negative budget limit.");
      const existing = store.finance.budgets.find(item => item.category.toLowerCase() === category.toLowerCase());
      if (existing) existing.limit_value = limit;
      else store.finance.budgets.push({ category, limit_value: limit });
      writeStore();
      return { ok: true };
    }
    if (path === "/api/finance/transactions" && method === "POST") {
      requireUser();
      const transactions = Array.isArray(payload.transactions) ? payload.transactions : [];
      if (!transactions.length) throw new Error("Add at least one valid transaction.");
      const added = transactions.map(item => ({
        id: store.nextIds.transaction++,
        date: /^\d{4}-\d{2}-\d{2}$/.test(item.date) ? item.date : today,
        description: String(item.description || "Imported transaction").slice(0, 200),
        category: String(item.category || "Other").slice(0, 50),
        amount: Number(item.amount),
      })).filter(item => Number.isFinite(item.amount));
      if (!added.length) throw new Error("No valid transaction amounts were provided.");
      store.finance.transactions.push(...added);
      writeStore();
      return { imported: added.length };
    }
    if (path === "/api/college/dashboard" && method === "GET") {
      requireUser();
      const faculty = user.role === "faculty";
      const student = store.college.students.find(item => item.id === user.id) || store.college.students[0];
      return {
        role: faculty ? "faculty" : "student",
        profile: { attendance: student.attendance, cgpa: student.cgpa },
        students: faculty ? store.college.students : [],
        timetable: store.college.timetable,
        notices: store.college.notices,
      };
    }
    if (path.startsWith("/api/college/students/") && method === "PATCH") {
      requireUser();
      if (user.role !== "faculty") throw new Error("Only the faculty demo profile can update student records.");
      const id = path.slice("/api/college/students/".length);
      const student = store.college.students.find(item => item.id === id);
      if (!student) throw new Error("Student record not found.");
      const attendance = Number(payload.attendance), cgpa = Number(payload.cgpa);
      if (!Number.isFinite(attendance) || attendance < 0 || attendance > 100 || !Number.isFinite(cgpa) || cgpa < 0 || cgpa > 10) {
        throw new Error("Attendance must be 0–100 and CGPA must be 0–10.");
      }
      student.attendance = attendance;
      student.cgpa = cgpa;
      writeStore();
      return { ok: true };
    }
    if (path === "/api/college/notices" && method === "POST") {
      requireUser();
      if (user.role !== "faculty") throw new Error("Only the faculty demo profile can post notices.");
      const body = String(payload.body || "").trim();
      if (!body || body.length > 500) throw new Error("Notices must contain 1–500 characters.");
      store.college.notices.unshift({ body, author: user.name, created_at: new Date().toISOString() });
      writeStore();
      return { ok: true };
    }
    if (path === "/api/chat/messages" && method === "GET") {
      requireUser();
      const room = requestUrl.searchParams.get("room") || "general";
      return { messages: store.chat.messages.filter(message => message.room === room).slice(-150) };
    }
    if (path === "/api/inventory/products" && method === "GET") {
      requireUser();
      if (user.role !== "faculty") throw new Error("Choose the faculty/operator demo profile to manage inventory.");
      return { products: store.inventory.products };
    }
    if (path === "/api/inventory/products" && method === "POST") {
      requireUser();
      if (user.role !== "faculty") throw new Error("Only the faculty/operator demo profile can add products.");
      const name = String(payload.name || "").trim(), price = Number(payload.price), stock = Number(payload.stock);
      if (!name || !Number.isFinite(price) || price <= 0 || !Number.isInteger(stock) || stock < 0) throw new Error("Enter a name, positive price, and whole-number stock quantity.");
      store.inventory.products.push({ id: store.nextIds.product++, name: name.slice(0, 100), price, stock });
      writeStore();
      return { ok: true };
    }
    if (path === "/api/inventory/sales" && method === "POST") {
      requireUser();
      const items = Array.isArray(payload.items) ? payload.items : [];
      if (!items.length) throw new Error("Add at least one product before completing a sale.");
      let subtotal = 0;
      const saleItems = items.map(item => {
        const product = store.inventory.products.find(entry => entry.id === Number(item.productId));
        const quantity = Number(item.quantity);
        if (!product || !Number.isInteger(quantity) || quantity < 1 || quantity > product.stock) throw new Error("A product is no longer available in the requested quantity.");
        subtotal += product.price * quantity;
        return { product, quantity };
      });
      const discount = Math.max(0, Math.min(100, Number(payload.discountPercent) || 0));
      const gst = Math.max(0, Math.min(100, Number(payload.gstPercent) || 0));
      const total = subtotal * (1 - discount / 100) * (1 + gst / 100);
      saleItems.forEach(({ product, quantity }) => { product.stock -= quantity; });
      const sale = { id: store.nextIds.sale++, total: Math.round(total * 100) / 100, items: items };
      store.inventory.sales.push(sale);
      writeStore();
      return sale;
    }
    if (path === "/api/warehouse/dashboard" && method === "GET") {
      requireUser();
      if (user.role !== "faculty") throw new Error("Choose the faculty/operator demo profile to use the warehouse planner.");
      const categories = [...new Set(store.warehouse.products.map(product => product.category))].map(name => ({ name }));
      const products = store.warehouse.products.map(product => ({
        ...product,
        on_order: store.warehouse.orders
          .filter(order => order.product_id === product.id && ["planned", "ordered"].includes(order.status))
          .reduce((sum, order) => sum + order.quantity, 0),
      }));
      return {
        ...store.warehouse,
        products,
        categories,
        lowStockCount: products.filter(product => product.on_hand <= product.reorder_point).length,
        orders: store.warehouse.orders.filter(order => !["received", "cancelled"].includes(order.status)),
      };
    }
    if (path === "/api/warehouse/reorder-plan" && method === "POST") {
      requireUser();
      if (user.role !== "faculty") throw new Error("Only the faculty/operator demo profile can plan reorders.");
      const orders = [];
      store.warehouse.products.filter(product => product.on_hand <= product.reorder_point).forEach(product => {
        const openQuantity = store.warehouse.orders
          .filter(order => order.product_id === product.id && ["planned", "ordered"].includes(order.status))
          .reduce((sum, order) => sum + order.quantity, 0);
        const quantity = Math.max(0, product.reorder_point * 2 - product.on_hand - openQuantity);
        if (!quantity) return;
        const order = {
          id: store.nextIds.order++, product_id: product.id, sku: product.sku, product: product.name,
          quantity, vendor_id: product.vendor_id, vendor: product.vendor, status: "planned",
        };
        store.warehouse.orders.push(order);
        orders.push(order);
      });
      writeStore();
      return { orders };
    }
    if (path.startsWith("/api/warehouse/orders/") && method === "PATCH") {
      requireUser();
      if (user.role !== "faculty") throw new Error("Only the faculty/operator demo profile can update purchase orders.");
      const id = Number(path.slice("/api/warehouse/orders/".length));
      const order = store.warehouse.orders.find(item => item.id === id);
      if (!order || !["planned", "ordered", "received", "cancelled"].includes(payload.status)) throw new Error("Purchase order or requested status is invalid.");
      if (payload.status === "received" && order.status !== "received") {
        const product = store.warehouse.products.find(item => item.id === order.product_id);
        if (product) { product.on_hand += order.quantity; product.batch_count += 1; }
      }
      order.status = payload.status;
      writeStore();
      return { ok: true };
    }
    if (path === "/api/warehouse/vendors" && method === "POST") {
      requireUser();
      if (user.role !== "faculty") throw new Error("Only the faculty/operator demo profile can add suppliers.");
      const name = String(payload.name || "").trim();
      if (!name) throw new Error("Supplier name is required.");
      store.warehouse.vendors.push({
        id: store.nextIds.vendor++, name: name.slice(0, 100),
        contact_name: String(payload.contactName || "").slice(0, 100),
        email: String(payload.email || "").slice(0, 150),
        phone: String(payload.phone || "").slice(0, 50),
      });
      writeStore();
      return { ok: true };
    }
    if (path === "/api/warehouse/products" && method === "POST") {
      requireUser();
      if (user.role !== "faculty") throw new Error("Only the faculty/operator demo profile can add stock.");
      const vendor = store.warehouse.vendors.find(item => item.id === Number(payload.vendorId));
      const quantity = Number(payload.quantity), reorderPoint = Number(payload.reorderPoint), unitCost = Number(payload.unitCost);
      const name = String(payload.name || "").trim(), sku = String(payload.sku || "").trim(), category = String(payload.category || "").trim();
      if (!vendor || !name || !sku || !category || !Number.isInteger(quantity) || quantity < 0 || !Number.isInteger(reorderPoint) || reorderPoint < 0 || !Number.isFinite(unitCost) || unitCost < 0) {
        throw new Error("Complete the product details with a valid supplier, quantity, reorder point, and cost.");
      }
      store.warehouse.products.push({
        id: store.nextIds.warehouseProduct++, sku, name, category, vendor: vendor.name, vendor_id: vendor.id,
        on_hand: quantity, on_order: 0, reorder_point: reorderPoint, batch_count: 1, unit_cost: unitCost,
      });
      writeStore();
      return { ok: true };
    }
    const contactMatch = path.match(/^\/api\/warehouse\/vendors\/(\d+)\/contacts$/);
    if (contactMatch && method === "POST") {
      requireUser();
      if (user.role !== "faculty") throw new Error("Only the faculty/operator demo profile can log supplier contacts.");
      const vendor = store.warehouse.vendors.find(item => item.id === Number(contactMatch[1]));
      const note = String(payload.note || "").trim();
      if (!vendor || !note) throw new Error("Choose a supplier and enter a contact note.");
      store.warehouse.contacts.unshift({ id: store.nextIds.contact++, vendor: vendor.name, author: user.name, note: note.slice(0, 500), created_at: new Date().toISOString() });
      writeStore();
      return { ok: true };
    }
    if (path === "/api/blog/posts" && method === "GET") {
      const mine = requestUrl.searchParams.get("mine") === "1";
      const posts = store.blog.filter(post => mine ? user && post.author_id === user.id : post.status === "published")
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
        .map(post => ({ ...post, html: markdownHtml(post.markdown) }));
      return { posts };
    }
    if (path === "/api/blog/posts" && method === "POST") {
      requireUser();
      const title = String(payload.title || "").trim(), markdown = String(payload.markdown || "");
      if (!title || !markdown.trim()) throw new Error("A title and post content are required.");
      if (!["draft", "published"].includes(payload.status)) throw new Error("Choose draft or published status.");
      const post = {
        id: store.nextIds.post++, author_id: user.id, author: user.name,
        title: title.slice(0, 160), markdown: markdown.slice(0, 20000),
        tags: Array.isArray(payload.tags) ? payload.tags.map(tag => String(tag).slice(0, 40)).slice(0, 12) : [],
        status: payload.status, updated_at: new Date().toISOString(),
      };
      store.blog.push(post);
      writeStore();
      return { ...post, html: markdownHtml(post.markdown) };
    }
    const postMatch = path.match(/^\/api\/blog\/posts\/(\d+)$/);
    if (postMatch) {
      requireUser();
      const post = store.blog.find(item => item.id === Number(postMatch[1]) && item.author_id === user.id);
      if (method === "DELETE") {
        if (!post) throw new Error("Post not found.");
        store.blog = store.blog.filter(item => item !== post);
        writeStore();
        return { ok: true };
      }
      if (method === "PUT") {
        if (!post) throw new Error("Post not found.");
        const title = String(payload.title || "").trim(), markdown = String(payload.markdown || "");
        if (!title || !markdown.trim() || !["draft", "published"].includes(payload.status)) throw new Error("Enter a title, content, and valid post status.");
        Object.assign(post, {
          title: title.slice(0, 160), markdown: markdown.slice(0, 20000),
          tags: Array.isArray(payload.tags) ? payload.tags.map(tag => String(tag).slice(0, 40)).slice(0, 12) : [],
          status: payload.status, updated_at: new Date().toISOString(),
        });
        writeStore();
        return { ...post, html: markdownHtml(post.markdown) };
      }
    }
    throw new Error(`This demo does not support ${method} ${path}.`);
  }

  const api = async (input, options = {}) => {
    readStore();
    const requestUrl = input.startsWith("/api/")
      ? new URL(`http://portfolio.local${input}`)
      : new URL(input, location.href);
    return resultFor(requestUrl, (options.method || "GET").toUpperCase(), parseBody(options));
  };

  function notifyChat(message) {
    chatListeners.get(message.room)?.forEach(listener => listener(message));
    channel?.postMessage({ type: "chat", message });
  }

  const channel = typeof BroadcastChannel === "function" ? new BroadcastChannel("tanishq-portfolio-chat") : null;
  if (channel) channel.addEventListener("message", event => {
    if (event.data?.type === "chat") chatListeners.get(event.data.message.room)?.forEach(listener => listener(event.data.message));
  });

  const chat = {
    join(room, onMessage, onCount) {
      const list = chatListeners.get(room) || new Set();
      list.add(onMessage);
      chatListeners.set(room, list);
      onCount(1);
      return () => {
        list.delete(onMessage);
        if (!list.size) chatListeners.delete(room);
      };
    },
    send(room, body) {
      requireUser();
      const text = String(body).trim();
      if (!text || text.length > 500) throw new Error("Messages must contain 1–500 characters.");
      readStore();
      const message = { id: `${Date.now()}-${Math.random()}`, room, author: user.name, body: text, created_at: new Date().toISOString() };
      store.chat.messages.push(message);
      store.chat.messages = store.chat.messages.slice(-500);
      writeStore();
      notifyChat(message);
    },
  };

  function setProfile(value) {
    user = profiles[value] || null;
    if (user) {
      localStorage.setItem(PROFILE_KEY, value);
      localStorage.removeItem(LEGACY_PROFILE_KEY);
    } else {
      localStorage.removeItem(PROFILE_KEY);
      localStorage.removeItem(LEGACY_PROFILE_KEY);
    }
    listeners.forEach(listener => listener(user));
    window.dispatchEvent(new CustomEvent("launchpad-profile-change", { detail: user }));
  }

  function mountProfilePicker() {
    const slot = document.querySelector("#demo-profile-slot");
    if (!slot) return;
    const select = document.createElement("select");
    select.setAttribute("aria-label", "Choose a demo profile");
    select.style.cssText = "max-width:190px;padding:6px 9px;border:1px solid #d7ddd1;border-radius:8px;background:#fffefa;color:#203a34;font:inherit";
    select.innerHTML = '<option value="">Choose demo profile</option><option value="student">Student · Aarav</option><option value="faculty">Faculty · Mira</option>';
    select.addEventListener("change", () => setProfile(select.value));
    slot.append(select);
    try {
      select.value = localStorage.getItem(PROFILE_KEY) || "";
      user = profiles[select.value] || null;
    } catch (error) {
      select.disabled = true;
      announce(`Demo profile storage is unavailable: ${error.message}`, true);
    }
  }

  function announce(message, isError = false) {
    const current = document.querySelector("[role=status][aria-live]");
    if (current) {
      current.textContent = String(message);
      if (isError) current.setAttribute("data-error", "true");
    } else if (isError) {
      console.error(message);
    }
  }

  readStore();
  document.addEventListener("DOMContentLoaded", mountProfilePicker, { once: true });
  window.addEventListener("storage", event => {
    if (event.key === PROFILE_KEY || event.key === LEGACY_PROFILE_KEY) {
      user = profiles[event.newValue] || null;
      listeners.forEach(listener => listener(user));
    }
  });
  window.Launchpad = {
    get user() { return user; },
    sessionReady: Promise.resolve(null).then(() => {
      const key = localStorage.getItem(PROFILE_KEY);
      user = profiles[key] || null;
      return user;
    }),
    onSessionChange(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    api,
    chat,
    announce,
  };
})();
