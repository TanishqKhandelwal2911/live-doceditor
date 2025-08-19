const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const DATA_DIR = path.join(__dirname, "data");

// ✅ Create data folder if it doesn't exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

// ✅ Serve static files from public/
app.use(express.static(path.join(__dirname, "public")));

// ✅ Main home page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

// ✅ Document editor page for /doc/:docId
app.get("/doc/:docId", (req, res) => {
  const docId = req.params.docId;
  const isValid = /^[a-zA-Z0-9_-]+$/.test(docId);

  if (!isValid) {
    return res
      .status(400)
      .send("❌ Invalid Document ID. Only letters, numbers, - and _ are allowed.");
  }

  // Always serve editor.html (your editor UI)
  res.sendFile(path.join(__dirname, "public/editor.html"));
});

// ✅ Socket.io for real-time editing
io.on("connection", (socket) => {
  console.log("🟢 A user connected");

  socket.on("join-doc", (docId) => {
    socket.join(docId);
    console.log(`📄 User joined room: ${docId}`);

    const filePath = path.join(DATA_DIR, `${docId}.txt`);

    // Load existing content from file if it exists
    fs.readFile(filePath, "utf8", (err, data) => {
      const content = err ? "" : data;
      socket.emit("update-text", content);
    });

    // When user edits the document
    socket.on("text-change", ({ docId, content }) => {
      // Save changes to file
      fs.writeFile(filePath, content, (err) => {
        if (err) console.error("❌ Error saving document:", err);
      });

      // Broadcast changes to others in the same doc
      socket.to(docId).emit("update-text", content);
    });
  });

  socket.on("disconnect", () => {
    console.log("🔴 A user disconnected");
  });
});

// ✅ Start server
server.listen(3000, () => {
  console.log("✅ Server running on http://localhost:3000");
});
