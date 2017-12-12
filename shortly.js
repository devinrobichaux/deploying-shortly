var express = require("express");
var util = require("./lib/utility");
var partials = require("express-partials");
var bodyParser = require("body-parser");
var session = require("express-session");

var db = require("./app/config");
var Users = require("./app/collections/users");
var User = require("./app/models/user");
var Links = require("./app/collections/links");
var Link = require("./app/models/link");
var Click = require("./app/models/click");

var app = express();

app.set("views", __dirname + "/views");
app.set("view engine", "ejs");
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + "/public"));

app.use(
  session({
    secret: "denied",
    resave: false,
    saveUninitialized: false,
    // cookie: {},
    user: undefined 
  })
);

function restrict(req, res, next) {
  console.log(req.session.user);
  if (req.session.user) {
    // res.redirect('/')
    next();
  } else {
    req.session.error = 'please login'
    res.redirect("/login");
  }
}

app.get("/", restrict, function(req, res) {
  res.render("index");
});

app.get("/create", restrict, function(req, res) {
  res.render("index");
});

app.get("/links", function(req, res) {
  console.log(req.sessions);
  // if (req.session.user) {
    Links.reset()
      .fetch()
      .then(function(links) {
        res.status(200).send(links.models);
      });
  // } else {
  //   res.redirect("login");
  // }
});

app.post("/links", function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log("Not a valid url: ", uri);
    return res.sendStatus(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.status(200).send(found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          // console.log("Error reading URL heading: ", err);
          return res.sendStatus(404);
        }

        Links.create({
          url: uri,
          title: title,
          baseUrl: req.headers.origin
        }).then(function(newLink) {
          res.status(200).send(newLink);
        });
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/

var public = app.get("views");

app.get("/login", function(req, res) {
  // res.send('hello');
  res.render(`${public}/login.ejs`);
});

app.get("/signup", function(req, res) {
  // res.send('hello');
  res.render(`${public}/signup.ejs`);
});

app.post("/signup", function(req, res) {
  new User({
    username: req.body.username,
    password: req.body.password
  })
    .save()
    .then(function(newUser) {
      req.session.user = true; 
      // console.log(req.session.user);
      // req.session.regenerate(function() {
      //   req.session.user=req.body.username;
        res.redirect(302, "/");
        // console.log('this is signup', req.session.user);
      });
    // });
});

app.post("/login", function(req, res) {
  db
    .knex("users")
    .where("username", "=", req.body.username)
    .then(function(data) {
      if (data[0].password === req.body.password) {
        // res.render('index');
        // req.session.regenerate(function() {
          req.session.user = true;
          // console.log(req.session);
          res.redirect(302, '/');
          // console.log(req.session.user, 'this is login cookie');
      } else {
        res.redirect(302, 'login');
      }
    });
});

/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get("/*", function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect("/");
    } else {
      var click = new Click({
        linkId: link.get("id")
      });

      click.save().then(function() {
        link.set("visits", link.get("visits") + 1);
        link.save().then(function() {
          return res.redirect(link.get("url"));
        });
      });
    }
  });
});

module.exports = app;
