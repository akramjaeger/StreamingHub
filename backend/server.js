const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("./models/User");
const Plan = require("./models/Plan");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = (process.env.MONGODB_URI || "")
  .trim()
  .replace(/^['\"]|['\"]$/g, "");
const JWT_SECRET = (process.env.JWT_SECRET || "dev_secret_change_me").trim();

const PASSWORD_RULES = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
const MAX_PROFILE_IMAGE_LENGTH = 3000000;

app.use(cors());
app.use(express.json({ limit: "5mb" }));

app.use((error, req, res, next) => {
  if (!error) {
    return next();
  }

  if (error.type === "entity.too.large") {
    return res.status(413).json({ message: "Request payload is too large" });
  }

  if (error.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Invalid JSON payload" });
  }

  return next(error);
});

app.get("/", (req, res) => {
  res.send("Backend is working");
});

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    message: "Backend and frontend are connected",
  });
});

app.get("/api/plans", async (req, res) => {
  try {
    const plans = await Plan.find({ active: true }).sort({ sortOrder: 1, createdAt: 1 });
    return res.status(200).json({ plans: plans.map(planToResponse) });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
});

function getAuthToken(req) {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.slice(7).trim();
}

function requireAuth(req, res, next) {
  try {
    const token = getAuthToken(req);
    if (!token) {
      return res.status(401).json({ message: "Authorization token is required" });
    }

    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

const ADMIN_EMAIL = "admin@gmail.com";
const DEFAULT_SEED_PASSWORD = "ChangeMe@123";
const DEFAULT_USERS = [
  {
    name: "Platform Admin",
    email: ADMIN_EMAIL,
    birthDate: "1990-01-01",
    username: "admin",
    phone: "+1-555-0100",
  },
  {
    name: "Ava Johnson",
    email: "ava.johnson@gmail.com",
    birthDate: "1998-04-12",
    username: "avaj",
    phone: "+1-555-0101",
  },
  {
    name: "Noah Smith",
    email: "noah.smith@gmail.com",
    birthDate: "1996-09-22",
    username: "noahs",
    phone: "+1-555-0102",
  },
  {
    name: "Mia Wilson",
    email: "mia.wilson@gmail.com",
    birthDate: "1999-02-17",
    username: "miaw",
    phone: "+1-555-0103",
  },
  {
    name: "Liam Brown",
    email: "liam.brown@gmail.com",
    birthDate: "1995-11-08",
    username: "liamb",
    phone: "+1-555-0104",
  },
  {
    name: "Sophia Davis",
    email: "sophia.davis@gmail.com",
    birthDate: "1997-06-30",
    username: "sophiad",
    phone: "+1-555-0105",
  },
];

const DEFAULT_PLANS = [
  {
    slug: "starter",
    name: "Starter",
    description: "Unlock movie details, cast, and where-to-watch providers.",
    price: "$4.99/mo",
    stripePriceId: process.env.STRIPE_PRICE_STARTER_ID || "",
    features: ["Full title details", "Watch provider availability", "Watchlist access"],
    sortOrder: 1,
  },
  {
    slug: "plus",
    name: "Plus",
    description: "Everything in Starter plus priority data refresh and richer recommendations.",
    price: "$9.99/mo",
    stripePriceId: process.env.STRIPE_PRICE_PLUS_ID || "",
    features: ["Everything in Starter", "Priority refresh", "Enhanced suggestions"],
    sortOrder: 2,
  },
];

function normalizePlanSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizePlanFeatures(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry || "").trim()).filter(Boolean);
  }

  return String(value || "")
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function planToResponse(plan) {
  return {
    id: plan.slug,
    slug: plan.slug,
    name: plan.name,
    description: plan.description,
    price: plan.price,
    stripePriceId: plan.stripePriceId,
    features: Array.isArray(plan.features) ? plan.features : [],
    active: Boolean(plan.active),
    sortOrder: Number(plan.sortOrder || 0),
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
  };
}

async function resolveUniquePlanSlug(preferredSlug, existingId) {
  const normalized = normalizePlanSlug(preferredSlug);
  if (!normalized) {
    return "";
  }

  const existing = await Plan.findOne({
    slug: normalized,
    ...(existingId ? { _id: { $ne: existingId } } : {}),
  }).select("_id");

  return existing ? "" : normalized;
}

async function ensureSeedPlans() {
  const existingCount = await Plan.countDocuments();
  if (existingCount > 0) {
    return;
  }

  const plansToCreate = [];

  for (const seedPlan of DEFAULT_PLANS) {
    const slug = await resolveUniquePlanSlug(seedPlan.slug);
    plansToCreate.push({
      slug: slug || seedPlan.slug,
      name: seedPlan.name,
      description: seedPlan.description,
      price: seedPlan.price,
      stripePriceId: String(seedPlan.stripePriceId || "").trim(),
      features: seedPlan.features,
      active: true,
      sortOrder: seedPlan.sortOrder,
    });
  }

  if (!plansToCreate.length) {
    return;
  }

  await Plan.insertMany(plansToCreate);
  console.log(`Seeded ${plansToCreate.length} default plans`);
}

async function requireAdmin(req, res, next) {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await User.findById(req.user.userId).select("email");
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (String(user.email || "").trim().toLowerCase() !== ADMIN_EMAIL) {
      return res.status(403).json({ message: "Admin access required" });
    }

    return next();
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
}

async function generateDefaultUsername() {
  let username = "";
  let exists = true;

  while (exists) {
    const suffix = Math.floor(100000 + Math.random() * 900000);
    username = `user${suffix}`;
    // Keep trying until we find a username that is not already taken.
    // This ensures new accounts always get a temporary unique handle.
    exists = Boolean(await User.exists({ username }));
  }

  return username;
}

async function resolveUniqueUsername(preferredUsername) {
  const normalized = String(preferredUsername || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/g, "");

  if (!normalized || normalized.length < 3) {
    return generateDefaultUsername();
  }

  if (!(await User.exists({ username: normalized }))) {
    return normalized;
  }

  let candidate = "";
  let exists = true;
  while (exists) {
    const suffix = Math.floor(100 + Math.random() * 900);
    candidate = `${normalized}${suffix}`;
    exists = Boolean(await User.exists({ username: candidate }));
  }

  return candidate;
}

async function ensureSeedUsers() {
  const normalizedEmails = DEFAULT_USERS.map((user) => String(user.email).trim().toLowerCase());
  const existingUsers = await User.find({ email: { $in: normalizedEmails } }).select("email");
  const existingEmailSet = new Set(
    existingUsers.map((user) => String(user.email || "").trim().toLowerCase())
  );

  const usersToCreate = [];

  for (const seedUser of DEFAULT_USERS) {
    const email = String(seedUser.email || "").trim().toLowerCase();
    if (existingEmailSet.has(email)) {
      continue;
    }

    const username = await resolveUniqueUsername(seedUser.username);
    const hashedPassword = await bcrypt.hash(DEFAULT_SEED_PASSWORD, 10);

    usersToCreate.push({
      name: String(seedUser.name || "").trim(),
      email,
      birthDate: new Date(String(seedUser.birthDate)),
      username,
      phone: String(seedUser.phone || "").trim() || undefined,
      password: hashedPassword,
    });
  }

  if (!usersToCreate.length) {
    return;
  }

  await User.insertMany(usersToCreate);
  console.log(`Seeded ${usersToCreate.length} default users`);
}

app.post("/api/auth/signup", async (req, res) => {
  try {
    const { name, email, birthDate, password, confirmPassword } = req.body;

    if (!name || !email || !birthDate || !password || !confirmPassword) {
      return res.status(400).json({
        message: "Name, email, birth date, password, and confirm password are required",
      });
    }

    if (String(password) !== String(confirmPassword)) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    if (!PASSWORD_RULES.test(String(password))) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters and include letters, numbers, and symbols",
      });
    }

    const parsedBirthDate = new Date(String(birthDate));
    if (Number.isNaN(parsedBirthDate.getTime())) {
      return res.status(400).json({ message: "Birth date is invalid" });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({ message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(String(password), 10);
    const defaultUsername = await generateDefaultUsername();

    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      birthDate: parsedBirthDate,
      username: defaultUsername,
      password: hashedPassword,
    });

    const token = jwt.sign({ userId: user._id, email: user.email }, JWT_SECRET, {
      expiresIn: "7d",
    });

    return res.status(201).json({
      message: "Account created successfully",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        birthDate: user.birthDate,
        username: user.username || null,
        phone: user.phone || null,
        pfp: user.pfp || null,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
});

app.post("/api/auth/signin", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail }).select("+password");

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isValidPassword = await bcrypt.compare(String(password), user.password);

    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign({ userId: user._id, email: user.email }, JWT_SECRET, {
      expiresIn: "7d",
    });

    return res.status(200).json({
      message: "Signed in successfully",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        birthDate: user.birthDate,
        username: user.username || null,
        phone: user.phone || null,
        pfp: user.pfp || null,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
});

app.get("/api/auth/profile", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        birthDate: user.birthDate,
        username: user.username || null,
        phone: user.phone || null,
        pfp: user.pfp || null,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
});

app.patch("/api/auth/profile", requireAuth, async (req, res) => {
  try {
    const updates = {};
    const { name, birthDate, username, phone, pfp } = req.body;

    if (typeof name !== "undefined") {
      const normalizedName = String(name).trim();
      if (normalizedName.length < 2) {
        return res.status(400).json({ message: "Name must be at least 2 characters" });
      }
      updates.name = normalizedName;
    }

    if (typeof birthDate !== "undefined") {
      const parsedBirthDate = new Date(String(birthDate));
      if (Number.isNaN(parsedBirthDate.getTime())) {
        return res.status(400).json({ message: "Birth date is invalid" });
      }
      updates.birthDate = parsedBirthDate;
    }

    if (typeof username !== "undefined") {
      const normalizedUsername = String(username).trim().toLowerCase();
      if (normalizedUsername && !/^[a-z0-9_.-]{3,30}$/.test(normalizedUsername)) {
        return res.status(400).json({
          message:
            "Username must be 3-30 chars and contain only letters, numbers, underscore, dot, or hyphen",
        });
      }

      if (normalizedUsername) {
        const conflict = await User.findOne({
          username: normalizedUsername,
          _id: { $ne: req.user.userId },
        });
        if (conflict) {
          return res.status(409).json({ message: "Username is already taken" });
        }
      }

      updates.username = normalizedUsername || undefined;
    }

    if (typeof phone !== "undefined") {
      updates.phone = String(phone).trim() || undefined;
    }

    if (typeof pfp !== "undefined") {
      const normalizedPfp = String(pfp).trim();
      if (!normalizedPfp) {
        updates.pfp = undefined;
      } else {
        const isHttpUrl = /^https?:\/\//i.test(normalizedPfp);
        const isDataImage = /^data:image\/[a-zA-Z0-9.+-]+;base64,/i.test(normalizedPfp);

        if (!isHttpUrl && !isDataImage) {
          return res
            .status(400)
            .json({ message: "Profile image must be an http(s) URL or uploaded image data" });
        }

        if (normalizedPfp.length > MAX_PROFILE_IMAGE_LENGTH) {
          return res.status(400).json({ message: "Profile image is too large" });
        }

        updates.pfp = normalizedPfp;
      }
    }

    const user = await User.findByIdAndUpdate(req.user.userId, updates, {
      returnDocument: "after",
      runValidators: true,
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      message: "Profile updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        birthDate: user.birthDate,
        username: user.username || null,
        phone: user.phone || null,
        pfp: user.pfp || null,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
});

app.get("/api/admin/users", requireAuth, requireAdmin, async (req, res) => {
  try {
    const users = await User.find({ email: { $ne: ADMIN_EMAIL } })
      .select("name email username birthDate phone pfp createdAt")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      users: users.map((user) => ({
        id: user._id,
        name: user.name,
        email: user.email,
        username: user.username || null,
        birthDate: user.birthDate,
        phone: user.phone || null,
        pfp: user.pfp || null,
        createdAt: user.createdAt,
      })),
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
});

app.patch("/api/admin/users/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const userId = String(req.params.id || "").trim();
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const existingUser = await User.findById(userId).select("email");
    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (String(existingUser.email || "").trim().toLowerCase() === ADMIN_EMAIL) {
      return res.status(400).json({ message: "Primary admin account cannot be edited" });
    }

    const { name, username, phone } = req.body;
    const updates = {};

    if (typeof name !== "undefined") {
      const normalizedName = String(name).trim();
      if (normalizedName.length < 2) {
        return res.status(400).json({ message: "Name must be at least 2 characters" });
      }
      updates.name = normalizedName;
    }

    if (typeof username !== "undefined") {
      const normalizedUsername = String(username).trim().toLowerCase();
      if (normalizedUsername && !/^[a-z0-9_.-]{3,30}$/.test(normalizedUsername)) {
        return res.status(400).json({
          message:
            "Username must be 3-30 chars and contain only letters, numbers, underscore, dot, or hyphen",
        });
      }

      if (normalizedUsername) {
        const conflict = await User.findOne({
          username: normalizedUsername,
          _id: { $ne: userId },
        }).select("_id");

        if (conflict) {
          return res.status(409).json({ message: "Username is already taken" });
        }
      }

      updates.username = normalizedUsername || undefined;
    }

    if (typeof phone !== "undefined") {
      updates.phone = String(phone).trim() || undefined;
    }

    const user = await User.findByIdAndUpdate(userId, updates, {
      returnDocument: "after",
      runValidators: true,
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      message: "User updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        username: user.username || null,
        birthDate: user.birthDate,
        phone: user.phone || null,
        pfp: user.pfp || null,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
});

app.delete("/api/admin/users/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const userId = String(req.params.id || "").trim();
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    if (userId === String(req.user.userId)) {
      return res.status(400).json({ message: "You cannot delete your own admin account" });
    }

    const user = await User.findById(userId).select("email");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (String(user.email || "").trim().toLowerCase() === ADMIN_EMAIL) {
      return res.status(400).json({ message: "Primary admin account cannot be deleted" });
    }

    await User.findByIdAndDelete(userId);
    return res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
});

app.get("/api/admin/plans", requireAuth, requireAdmin, async (req, res) => {
  try {
    const plans = await Plan.find({}).sort({ sortOrder: 1, createdAt: 1 });
    return res.status(200).json({ plans: plans.map(planToResponse) });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
});

app.post("/api/admin/plans", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { slug, name, description, price, stripePriceId, features, active, sortOrder } = req.body;
    const normalizedName = String(name || "").trim();
    const normalizedDescription = String(description || "").trim();
    const normalizedPrice = String(price || "").trim();
    const normalizedStripePriceId = String(stripePriceId || "").trim();
    const normalizedSlug = await resolveUniquePlanSlug(slug || normalizedName);

    if (!normalizedSlug) {
      return res.status(400).json({ message: "Plan ID is required and must be unique" });
    }

    if (normalizedName.length < 2) {
      return res.status(400).json({ message: "Plan name must be at least 2 characters" });
    }

    if (normalizedDescription.length < 5) {
      return res.status(400).json({ message: "Plan description is required" });
    }

    if (!normalizedPrice) {
      return res.status(400).json({ message: "Plan price is required" });
    }

    const plan = await Plan.create({
      slug: normalizedSlug,
      name: normalizedName,
      description: normalizedDescription,
      price: normalizedPrice,
      stripePriceId: normalizedStripePriceId,
      features: normalizePlanFeatures(features),
      active: typeof active === "boolean" ? active : true,
      sortOrder: Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : 0,
    });

    return res.status(201).json({
      message: "Plan created successfully",
      plan: planToResponse(plan),
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "Plan ID already exists" });
    }

    return res.status(500).json({ message: "Server error", error: error.message });
  }
});

app.patch("/api/admin/plans/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const planId = String(req.params.id || "").trim();
    const existingPlan = await Plan.findOne({ slug: planId });

    if (!existingPlan) {
      return res.status(404).json({ message: "Plan not found" });
    }

    const { slug, name, description, price, stripePriceId, features, active, sortOrder } = req.body;
    const updates = {};

    if (typeof slug !== "undefined") {
      const normalizedSlug = await resolveUniquePlanSlug(slug, existingPlan._id);
      if (!normalizedSlug) {
        return res.status(409).json({ message: "Plan ID already exists" });
      }
      updates.slug = normalizedSlug;
    }

    if (typeof name !== "undefined") {
      const normalizedName = String(name || "").trim();
      if (normalizedName.length < 2) {
        return res.status(400).json({ message: "Plan name must be at least 2 characters" });
      }
      updates.name = normalizedName;
    }

    if (typeof description !== "undefined") {
      const normalizedDescription = String(description || "").trim();
      if (normalizedDescription.length < 5) {
        return res.status(400).json({ message: "Plan description is required" });
      }
      updates.description = normalizedDescription;
    }

    if (typeof price !== "undefined") {
      const normalizedPrice = String(price || "").trim();
      if (!normalizedPrice) {
        return res.status(400).json({ message: "Plan price is required" });
      }
      updates.price = normalizedPrice;
    }

    if (typeof stripePriceId !== "undefined") {
      const normalizedStripePriceId = String(stripePriceId || "").trim();
      updates.stripePriceId = normalizedStripePriceId;
    }

    if (typeof features !== "undefined") {
      updates.features = normalizePlanFeatures(features);
    }

    if (typeof active !== "undefined") {
      updates.active = Boolean(active);
    }

    if (typeof sortOrder !== "undefined") {
      const parsedSortOrder = Number(sortOrder);
      updates.sortOrder = Number.isFinite(parsedSortOrder) ? parsedSortOrder : 0;
    }

    const updatedPlan = await Plan.findByIdAndUpdate(existingPlan._id, updates, {
      returnDocument: "after",
      runValidators: true,
    });

    return res.status(200).json({
      message: "Plan updated successfully",
      plan: planToResponse(updatedPlan),
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
});

app.delete("/api/admin/plans/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const planId = String(req.params.id || "").trim();
    const deletedPlan = await Plan.findOneAndDelete({ slug: planId });

    if (!deletedPlan) {
      return res.status(404).json({ message: "Plan not found" });
    }

    return res.status(200).json({ message: "Plan deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
});

async function startServer() {
  try {
    if (!MONGODB_URI) {
      throw new Error("MONGODB_URI is missing in environment variables");
    }

    await mongoose.connect(MONGODB_URI);
    console.log("MongoDB connected");

    await ensureSeedUsers();
    await ensureSeedPlans();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error.message);
    process.exit(1);
  }
}

startServer();
