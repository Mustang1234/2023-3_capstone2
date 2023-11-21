const express = require('express')
const parseurl = require('parseurl')
var passport = require('passport');
var LocalStrategy = require('passport-local');


passport.use(new LocalStrategy(function verify(username, password, cb) {
  db.get('SELECT * FROM users WHERE username = ?', [ username ], function(err, user) {
    if (err) { return cb(err); }
    if (!user) { return cb(null, false, { message: 'Incorrect username or password.' }); }

    crypto.pbkdf2(password, user.salt, 310000, 32, 'sha256', function(err, hashedPassword) {
      if (err) { return cb(err); }
      if (!crypto.timingSafeEqual(user.hashed_password, hashedPassword)) {
        return cb(null, false, { message: 'Incorrect username or password.' });
      }
      return cb(null, user);
    });
  });
}));

app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true,
    store: new FileStore()
}))

app.post('/auth/login_process', function (req, res, next) {
    if (req.session.num == undefined) {
        req.session.num = 1;
    }
    else {
        req.session.num += 1;
    }
    res.send(`Hello session ${req.session.num}`);
})

app.listen(5000, function () {
    console.log('5000!');
})