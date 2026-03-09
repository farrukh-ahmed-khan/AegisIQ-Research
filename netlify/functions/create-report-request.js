exports.handler = async function handler(event) {
  try {
    if (event.httpMethod !== "POST") {
      return jsonResponse(405, { error: "Method not allowed." });
    }

    const contentType =
      event.headers["content-type"] || event.headers["Content-Type"] || "";

    if (!contentType.includes("multipart/form-data")) {
      return jsonResponse(400, {
        error: "Expected multipart/form-data submission.",
      });
    }

    return jsonResponse(200, {
      message: "Request received.",
      requestId: `REQ-${Date.now()}`,
      note: "Next step is to parse the uploaded Excel file and save to database.",
    });
  } catch (error) {
    return jsonResponse(500, {
      error: error.message || "Server error.",
    });
  }
};

function jsonResponse(statusCode, payload) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  };
}
