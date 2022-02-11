const crypto = require("crypto");

const { validationResult } = require("express-validator");

const User = require("../models/user");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
require("dotenv").config();
const { google } = require("googleapis");
const OAuth2 = google.auth.OAuth2;
//const sendinblue = require("nodemailer-sendinblue-transport");

// const transport = nodemailer.createTransport(
//   sendinblue({
//     auth: {
//       apiKey:
//         "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",
//       apiUrl: "https://api.sendinblue.com/v3.0",
//     },
//   })
// );

// const transporter = nodemailer.createTransport({
//   service: "smtp-relay.sendinblue.com",
//   port: 587,
//   auth: {
//     user: "marotiyabhavika3@gmail.com",
//     pass: "txZNh29mGPjyEJwT",
//   },
// });

// const createTransporter = async () => {
//   const oauth2Client = new OAuth2(
//     process.env.CLIENT_ID,
//     process.env.CLIENT_SECRET,
//     "https://developers.google.com/oauthplayground"
//   );

//   oauth2Client.setCredentials({
//     refresh_token: process.env.REFRESH_TOKEN,
//   });
// };

// const accessToken = (resolve, reject) => {
//   oauth2Client.getAccessToken((err, token) => {
//     if (err) {
//       reject("Failed to create access token :(");
//     }
//     resolve(token);
//   });
// };

// const transporter = nodemailer.createTransport({
//   service: "gmail",
//   auth: {
//     type: "OAuth2",
//     user: process.env.EMAIL,
//     accessToken,
//     clientId: process.env.CLIENT_ID,
//     clientSecret: process.env.CLIENT_SECRET,
//     refreshToken: process.env.REFRESH_TOKEN,
//   },
// });

let transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "17uec111@lnmiit.ac.in",
    pass: process.env.PASSWORD,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

exports.getLogin = (req, res, next) => {
  let message = req.flash("error");

  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render("auth/login", {
    path: "/login",
    pageTitle: "Login",
    errorMessage: message,
  });
};

exports.getSignup = (req, res, next) => {
  let message = req.flash("errorSignup");

  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render("auth/signup", {
    path: "/signup",
    pageTitle: "Signup",
    errorMessage: message,
    oldInput: {
      email: "",
      password: "",
      confirmPassword: "",
    },
    validationErrors: [],
  });
};

exports.postLogin = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  User.findOne({ email: email })
    .then((user) => {
      if (!user) {
        req.flash("error", "Invalid email or password");
        return res.redirect("/login");
      }
      bcrypt
        .compare(password, user.password)
        .then((doMatch) => {
          if (doMatch) {
            req.session.isLoggedIn = true;
            req.session.user = user;
            req.session.save((err) => {
              console.log(err);
              return res.redirect("/");
            });
          } else {
            req.flash("error", "Invalid Password");
            res.redirect("/login");
          }
        })
        .catch((err) => console.log(err));
    })
    .catch((err) => console.log(err));
};

exports.postSignup = (req, res, next) => {
  //console.log("here in post signup");
  //console.log("email is:" + req.body.email);
  const error = validationResult(req);
  const email = req.body.email;
  const password = req.body.password;
  const confirmpwd = req.body.confirmPassword;
  console.log(error.array());

  if (!error.isEmpty()) {
    return res.status(422).render("auth/signup", {
      path: "/signup",
      pageTitle: "Signup",
      errorMessage: error.array()[0].msg,
      oldInput: {
        email: email,
        password: password,
        confirmPassword: confirmpwd,
      },
      validationErrors: error.array(),
    });
  }

  return bcrypt
    .hash(password, 12)
    .then((hashedPassword) => {
      const user = new User({
        email: email,
        password: hashedPassword,
        cart: { items: [] },
      });
      //console.log("email is:" + req.body.email);
      return user.save();
    })

    .then((user) => {
      res.redirect("/login");
      return transporter.sendMail(
        {
          to: email,
          from: "17uec111@lnmiit.ac.in",
          subject: "Signup succeeded!",
          html: "<h1>You successfully signed up!</h1>",
        },
        (err) => {
          if (err) console.log("here", err);
          else console.log("email sent");
        }
      );
    });
};

exports.postLogout = (req, res, next) => {
  req.session.destroy((err) => {
    console.log(err);
    res.redirect("/");
  });
};

exports.getReset = (req, res, next) => {
  let message = req.flash("error");
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render("auth/reset", {
    path: "/reset",
    pageTitle: "Reset Passwprd",
    errorMessage: message,
  });
};

exports.postReset = (req, res, next) => {
  crypto.randomBytes(32, (err, buffer) => {
    if (err) {
      console.log(err);
      res.redirect("/");
    }
    const token = buffer.toString("hex");
    User.findOne({ email: req.body.email })
      .then((user) => {
        if (!user) {
          req.flash("error", "No accound with that email exists");
          res.redirect("/reset");
        }
        user.resetToken = token;
        user.resetTokenExpiration = Date.now() + 3600000;
        return user.save();
      })
      .then((result) => {
        res.redirect("/");
        transporter.sendMail(
          {
            to: req.body.email,
            from: "17uec111@lnmiit.ac.in",
            subject: "Reset Password",
            html: `
          <h1>Please click on below link to reset your password</h1>
          <a href='http://localhost:3000/reset/${token}'>link</a>
          `,
          },
          (err) => {
            if (err) console.log("here", err);
            else console.log("email sent to reset password");
          }
        );
      })
      .catch((err) => {
        console.log(err);
      });
  });
};

exports.getNewPassword = (req, res, next) => {
  const token = req.params.token;
  User.findOne({ resetToken: token, resetTokenExpiration: { $gt: Date.now() } })
    .then((user) => {
      let message = req.flash("error");
      if (message.length > 0) {
        message = message[0];
      } else {
        message = null;
      }
      res.render("auth/new-password", {
        path: "/update",
        pageTitle: "Update Password",
        errorMessage: message,
        userId: user._id.toString(),
        passwordToken: token,
      });
    })
    .catch((err) => {
      console.log(err);
    });
};

exports.postNewPassword = (req, res, next) => {
  const newPassword = req.body.password;
  const userId = req.body.userId;
  const passwordToken = req.body.passwordToken;
  let resetUser;

  User.findOne({
    resetToken: passwordToken,
    resetTokenExpiration: { $gt: Date.now() },
    _id: userId,
  })
    .then((user) => {
      resetUser = user;
      return bcrypt.hash(newPassword, 12);
    })
    .then((hashedPassword) => {
      resetUser.password = hashedPassword;
      resetUser.resetToken = undefined;
      resetUser.resetTokenExpiration = undefined;
      return resetUser.save();
    })
    .then((result) => {
      res.redirect("/login");
    })
    .catch((err) => {
      console.log(err);
    });
};
