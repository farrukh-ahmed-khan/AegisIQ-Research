const Busboy = require("busboy");
const { neon } = require("@neondatabase/serverless");
const { parseExcelBuffer } = require("../../lib/parseExcel");

exports.handler = async function handler(event) {
  try {
    if (event.httpMethod !== "POST") {
      return response(405, { error: "Method not allowed." });
    }

    const contentType =
      event.headers["content-type"] || event.headers["Content-Type"] || "";

    if (!contentType.includes("multipart/form-data")) {
      return response(400, { error: "Expected multipart/form-data." });
    }

    const form = await parseMultipart(event);
    const ticker = (form.fields.ticker || "").trim().toUpperCase();
    const period = (form.fields.period || "").trim().toUpperCase();
    const userId = (form.fields.userId || "").trim();
    const customerEmail = (form.fields.customerEmail || "").trim();
    const uploadedFile = form.file;

    if (!ticker) return response(400, { error: "Ticker is required." });
    if (!["1Y", "3Y", "5Y"].includes(period)) {
      return response(400, { error: "Period must be 1Y, 3Y, or 5Y." });
    }
    if (!uploadedFile || !uploadedFile.buffer) {
      return response(400, { error: "Excel file is required." });
    }

    const rows = parseExcelBuffer(uploadedFile.buffer);
    const sql = neon(process.env.DATABASE_URL);

    const requestRows = await sql`
      INSERT INTO report_requests
        (ticker, period, status, original_filename, row_count, user_id, customer_email)
      VALUES
        (${ticker}, ${period}, 'uploaded', ${uploadedFile.filename}, ${rows.length}, ${userId || null}, ${customerEmail || null})
      RETURNING id
    `;

    const requestId = requestRows[0].id;

    for (const row of rows) {
      await sql`
        INSERT INTO stock_history_uploads
          (report_request_id, ticker, period, trade_date, open, high, low, close, volume)
        VALUES
          (
            ${requestId},
            ${ticker},
            ${period},
            ${row.date},
            ${row.open},
            ${row.high},
            ${row.low},
            ${row.close},
            ${row.volume}
          )
      `;
    }

    return response(200, {
      message: "Excel uploaded and parsed successfully.",
      requestId,
      rowsSaved: rows.length,
    });
  } catch (error) {
    return response(500, { error: error.message || "Server error." });
  }
};

function parseMultipart(event) {
  return new Promise((resolve, reject) => {
    const fields = {};
    let file = null;

    const busboy = Busboy({
      headers: {
        "content-type":
          event.headers["content-type"] || event.headers["Content-Type"],
      },
    });

    busboy.on("field", (name, value) => {
      fields[name] = value;
    });

    busboy.on("file", (name, stream, info) => {
      const chunks = [];
      const filename =
        typeof info === "object" ? info.filename : "upload.xlsx";

      stream.on("data", (chunk) => chunks.push(chunk));
      stream.on("end", () => {
        file = {
          fieldName: name,
          filename,
          buffer: Buffer.concat(chunks),
        };
      });
    });

    busboy.on("finish", () => resolve({ fields, file }));
    busboy.on("error", reject);

    busboy.end(Buffer.from(event.body, event.isBase64Encoded ? "base64" : "utf8"));
  });
}

function response(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}
