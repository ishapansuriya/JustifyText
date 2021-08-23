const express = require("express");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const mysql = require("mysql");
const app = express();
const dotenv = require("dotenv");
dotenv.config();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.text());

var rateLimit = [];

const dbConn = mysql.createConnection({
  host: process.env.DBHOST,
  user: process.env.DBUSER,
  password: process.env.DBPASSWORD,
  database: process.env.DBNAME,
});

dbConn.connect(function (err) {
  if (err) {
    return console.error("error: " + err.message);
  }

  console.log("Connected to the database.");
});

app.post("/api/token", (req, res) => {
  var sql =
    "SELECT 1 FROM `users` WHERE email = " + mysql.escape(req.query.email);

  function checkEmail(callback) {
    dbConn.query(sql, function (error, results, fields) {
      if (error) {
        callback();
      } else {
        callback(results.length);
      }
    });
  }

  checkEmail(function (authorized) {
    if (!authorized) {
      res.json({ message: "Email not found." });
      return;
    }

    const user = {
      email: req.query.email,
    };
    jwt.sign(
      { user },
      process.env.SECRETKEY,
      { expiresIn: "24h" },
      (err, token) => {
        rateLimit[token] = { words: 0, date: new Date() };
        res.json({
          token,
        });
      }
    );
  });
});

app.post("/api/justify", verifyToken, (req, res) => {
  jwt.verify(req.token, process.env.SECRETKEY, (err) => {
    // Authorization
    if (err) {
      res.sendStatus(403);
      return;
    } else {
      onJustifyVerified(req.body, req.token);
    }
  });

  function onJustifyVerified() {
    res.type("text/plain");
    var inputData = req.body;

    // Check for Inputdata
    if (!inputData) {
      res.send("");
      return;
    }
    // Check current user data
    if (!checkForUserRates()) {
      return;
    }

    inputData = inputData.split("\n");
    let response = "";
    for (let index = 0; index < inputData.length; index++) {
      let inputText = inputData[index];

      inputText = inputText.split(" ");
      let currentLine = "";
      let currentCounter = 0;
      let wordCount = 0;

      for (let i = 0; i < inputText.length; i++) {
        let isProcessed = false;
        if (inputText[i] === "") {
          continue;
        }

        if (currentCounter + inputText[i].length + 1 <= 80) {
          currentCounter = currentLine
            ? currentCounter + inputText[i].length + 1
            : currentCounter + inputText[i].length;
          currentLine = currentLine
            ? currentLine + " " + inputText[i]
            : inputText[i];
          isProcessed = true;
        } else {
          if (currentCounter < 80) {
            // INCASE IF EXACT 80 CHARACTERS NOT COME IN THE SENTENCE AND NEXT CHARACTER IS BIGGER THEN ADD SPACE BETWEEN
            currentLine = addSpace(currentLine);
            currentCounter = 80;
          }
        }

        if (currentCounter === 80) {
          response = response ? response + "\n" + currentLine : currentLine;
          currentLine = "";
          currentCounter = 0;
          wordCount = 0;
        }

        if (!isProcessed) {
          currentCounter = currentLine
            ? currentCounter + inputText[i].length + 1
            : currentCounter + inputText[i].length;
          currentLine = currentLine
            ? currentLine + " " + inputText[i]
            : inputText[i];
        }
      }

      if (currentLine) {
        response = response + "\n" + currentLine;
      }
    }

    res.send(addSpace(response));
  }

  function checkForUserRates() {
    var textWords = req.body;

    var userRateLimit = rateLimit[req.token];
    if (!userRateLimit || !userRateLimit.date) {
      res.sendStatus(403);
      return false;
    }

    // Check words rate
    let userDay = userRateLimit.date.getDate();
    let currentDay = new Date().getDate();

    if (currentDay !== userDay) {
      userRateLimit.date = new Date();
      userRateLimit.words = 0;
    }

    // Check for Limit per token
    if (userRateLimit.words + textWords.length > 80000) {
      res.status(402).json({ message: "402 Payment Required." });
      return false;
    }

    userRateLimit.words = userRateLimit.words + textWords.length;

    rateLimit[req.token] = userRateLimit;

    return true;
  }
});

const setSpace = (str, index, chr) => {
  if (index > str.length - 1) return str;
  return str.substr(0, index) + chr + str.substr(index + 1);
};

const addSpace = (data) => {
  let lines = data.split("/n");
  MaxLineLength = 80;
  for (let index = 0; index < lines.length; index++) {
    var line = lines[index];

    if (line.length >= MaxLineLength) {
      continue;
    }
    var j = 1;
    for (var i = 0; i < line.length; i++) {
      if (line[i] == " " && line.length < MaxLineLength) {
        line = setSpace(line, i, "  ");
        i = i + j;
      }
      if (i == line.length - 1 && line.length < MaxLineLength) {
        i = 0;
        j++;
      }
    }
    lines[index] = line;
  }
  return lines.join("/n");
};

// Function for Verify Token
function verifyToken(req, res, next) {
  const header = req.headers["authorization"];
  if (typeof header !== "undefined") {
    req.token = header;
    next();
  } else {
    res.sendStatus(403);
  }
}

app.listen(3000, () => console.log("Server started on port 3000"));
