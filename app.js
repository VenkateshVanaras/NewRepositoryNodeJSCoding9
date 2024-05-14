const express = require("express");
const app = express();
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");

const dbPath = path.join(__dirname, "userData.db");
app.use(express.json());
let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server is running on http://localhost:3000");
    });
  } catch (error) {
    console.log(`DB error: ${error.message}`);
    process.exit(1);
  }
};
initializeDbAndServer();
// Creating User in Database first time
app.post("/register", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    // create new user in table
    if (password.length < 5) {
      response.status(400);
      response.send("Password is too short");
    } else {
      try {
        const createUserQuery = `
            INSERT INTO
                user (username, name, password, gender, location)
            VALUES
                (
                '${username}',
                '${name}',
                '${hashedPassword}',
                '${gender}',
                '${location}'  
                );`;
        await db.run(createUserQuery);
        response.status(200);
        response.send("User created successfully");
      } catch (error) {
        console.log(`DB error : '${error.message}'`);
        process.exit(1);
      }
    }
  } else {
    //if user already exists
    response.status(400);
    response.send("User already exists");
  }
});

// login user details
app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    // unregister user is tries to login
    response.status(400);
    response.send("Invalid user");
  } else {
    //If the user provides incorrect password
    const isPasswordMatch = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatch === false) {
      response.status(400);
      response.send("Invalid password");
    } else {
      response.status(200);
      response.send("Login success!");
    }
  }
});
// Update old Password with New one
app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    // unregister user is tries to login
    response.status(400);
    response.send("Invalid user");
  } else {
    //If the user provides incorrect password
    const isOldPasswordMatch = await bcrypt.compare(
      oldPassword,
      dbUser.password
    );
    if (isOldPasswordMatch === false) {
      response.status(400);
      response.send("Invalid current password");
    } else {
      if (newPassword.length < 5) {
        response.status(400);
        response.send("Password is too short");
      } else {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const passwordQuery = `
                    UPDATE user
                    SET 
                        password = '${hashedPassword}'
                    WHERE 
                        username = '${username}';    
            `;
        await db.run(passwordQuery);
        response.status(200);
        response.send("Password updated");
      }
    }
  }
});

module.exports = app;
