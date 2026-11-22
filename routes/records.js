const express = require("express");
const { pool } = require("../db");

const router = express.Router();

const ALLOWED_STATUSES = ["Pending", "In progress", "Completed"];
const MAX_ID = 2147483647; // largest id the database column can hold
const COLUMNS = "id, title, category, description, status";

// Returns the id as a number, or null when it is not a positive whole number.
function parseId(raw) {
  return /^[1-9]\d*$/.test(raw) ? Number(raw) : null;
}

function sendInvalidId(res) {
  return res.status(400).json({ message: "Id must be a positive whole number." });
}

function sendNotFound(res) {
  return res.status(404).json({ message: "Record not found." });
}

// Checks the four editable fields. Ignores any id sent by the client.
function readFields(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Request body must be a JSON object." };
  }

  const rules = [
    { name: "title", label: "Title", min: 3, max: 80 },
    { name: "category", label: "Category", min: 2, max: 40 },
    { name: "description", label: "Description", min: 5, max: 300 }
  ];

  const fields = {};

  for (const rule of rules) {
    const value = body[rule.name];
    if (typeof value !== "string") {
      return { error: `${rule.label} must be text.` };
    }
    const trimmed = value.trim();
    if (trimmed.length < rule.min || trimmed.length > rule.max) {
      return { error: `${rule.label} must have ${rule.min} to ${rule.max} characters.` };
    }
    fields[rule.name] = trimmed;
  }

  if (typeof body.status !== "string") {
    return { error: "Status must be text." };
  }
  const status = body.status.trim();
  if (!ALLOWED_STATUSES.includes(status)) {
    return { error: "Status must be Pending, In progress or Completed." };
  }
  fields.status = status;

  return { fields };
}

// GET /api/records
router.get("/", async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT ${COLUMNS} FROM records ORDER BY id`
    );
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
});

// GET /api/records/:id
router.get("/:id", async (req, res, next) => {
  const id = parseId(req.params.id);
  if (id === null) return sendInvalidId(res);
  if (id > MAX_ID) return sendNotFound(res);

  try {
    const result = await pool.query(
      `SELECT ${COLUMNS} FROM records WHERE id = $1`,
      [id]
    );
    if (result.rows.length === 0) return sendNotFound(res);
    res.status(200).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// POST /api/records
router.post("/", async (req, res, next) => {
  const { error, fields } = readFields(req.body);
  if (error) return res.status(400).json({ message: error });

  try {
    const result = await pool.query(
      `INSERT INTO records (title, category, description, status)
       VALUES ($1, $2, $3, $4)
       RETURNING ${COLUMNS}`,
      [fields.title, fields.category, fields.description, fields.status]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// PUT /api/records/:id
router.put("/:id", async (req, res, next) => {
  const id = parseId(req.params.id);
  if (id === null) return sendInvalidId(res);

  const { error, fields } = readFields(req.body);
  if (error) return res.status(400).json({ message: error });
  if (id > MAX_ID) return sendNotFound(res);

  try {
    const result = await pool.query(
      `UPDATE records
       SET title = $1, category = $2, description = $3, status = $4
       WHERE id = $5
       RETURNING ${COLUMNS}`,
      [fields.title, fields.category, fields.description, fields.status, id]
    );
    if (result.rows.length === 0) return sendNotFound(res);
    res.status(200).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/records/:id
router.delete("/:id", async (req, res, next) => {
  const id = parseId(req.params.id);
  if (id === null) return sendInvalidId(res);
  if (id > MAX_ID) return sendNotFound(res);

  try {
    const result = await pool.query(
      "DELETE FROM records WHERE id = $1 RETURNING id",
      [id]
    );
    if (result.rows.length === 0) return sendNotFound(res);
    res.status(200).json({ message: "Record deleted." });
  } catch (error) {
    next(error);
  }
});

module.exports = router;