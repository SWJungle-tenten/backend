const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../../models/user");
const router = express.Router();
const jwt = require("jsonwebtoken");

router.post("/", async (req, res) => {
  const email = req.headers.email;
  const password = req.headers.password;

  try {
    let user = await User.findOne({ email });

    // 사용자가 존재하지 않는 경우
    if (!user) {
      return res.status(400).json({ errors: [{ msg: "Invalid email" }] });
    }

    // 비밀번호 일치 여부 확인
    const isMatch = bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ errors: [{ msg: "Invalid password" }] });
    }

    // JWT 생성
    const payload = {
      user: {
        id: user.id,
      },
    };
    
    
    jwt.sign(payload, process.env.jwtSecret, { expiresIn: "100h" }, (err, token) => {
      if (err) throw err;
      res.json({ token });
    });
    
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
