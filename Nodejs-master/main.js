const express = require('express')
const fs = require('fs');
const app = express()
const template = require('./lib/template.js');
const path = require('path');
const qs = require('querystring');
const sanitizeHtml = require('sanitize-html');
const port = 3000
const bodyParser = require('body-parser');
const compression = require('compression');
const helmet = require('helmet');
//const cookie = require('cookie');
const session = require('express-session')
const FileStore = require('session-file-store')(session)
var passport = require('passport')
  , LocalStrategy = require('passport-local')
    .Strategy;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(compression());
app.use(express.static('public'));
app.use(helmet());

app.use(session({
  HttpOnly: true,
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true,
  store: new FileStore()
}))

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function (user, done) {
  console.log("serializeUser");
  done(null, user.email);
})

passport.deserializeUser(function (id, done) {
  console.log("deserializeUser");
  done(null, authdata);
})

var authdata = {
  email: "fdsa",
  password: "rewq"
};

passport.use(new LocalStrategy(
  {
    usernameField: 'email',
    passwordField: 'password'
  },
  function verify(username, password, cb) {
    console.log('LocalStrategy', username, password)
    if (username === authdata.email && password === authdata.password) {
      console.log("ok");
      return cb(null, authdata);
    }
    else {
      console.log("no");
      return cb(null, false, { message: 'no' });
    }

    /*
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
    });*/
  }));

app.get('*', function (req, res, next) {
  fs.readdir('./data', function (error, filelist) {
    req.list = filelist;
    next();
  });
});

app.get('/login', function (req, res) {
  var title = 'login';
  var list = template.list(req.list);
  var html = template.HTML(title, list,
    `<form action="login_process" method="post">
    <p><input type="text" name="email" placeholder="email"></p>
    <p><input type="password" name="password" placeholder="password"></p>
    <p><input type="submit"></p>
    </form>`,
    `<a href="/page_create">create</a>`,
    req.session.isLogedin
  );
  res.send(html);
});

app.post('/login_process',
  passport.authenticate('local', {
    successRedirect: '/pages',
    failureRedirect: '/login'
  }));
/*
app.post('/login_process', function (req, res) {
  var post = req.body;
  var email = post.email;
  var password = post.password;
  if(email === 'fdsa' && password === 'rewq'){
    req.session.isLogedin = true;
    req.session.email = email;
    req.session.save(function(){
      res.redirect(`/pages`);
    });
  }
  else{
    req.session.isLogedin = false;
    req.session.email = '';
    req.session.save(function(){
      res.redirect(`/login`);
    });
  }
});*/

app.get('/logout', (req, res) => {
  req.logout(() => {
    res.redirect('/pages');
  });
});

app.get('/pages', function (req, res) {
  if (req.user === undefined) {
    res.redirect(`/login`);
    return false;
  }
  var title = 'Welcome! ' + req.user.email;
  var description = 'Hello, Node.js';
  var list = template.list(req.list);
  var html = template.HTML(title, list,
    `<h2>${title}</h2>${description}
    <img src="image/hello.jpg" style="width:100px; display:block;">`,
    `<a href="/page_create">create</a>`,
    req.user.email
  );
  res.send(html);
});

app.get('/page/:pageId', function (req, res, next) {
  if (req.user === undefined) {
    res.redirect(`/login`);
    return false;
  }
  var filteredId = path.parse(req.params.pageId).base;
  fs.readFile(`data/${filteredId}`, 'utf8', function (err, description) {
    if (err) {
      next('Error');
    }
    else {
      var title = req.params.pageId;
      var sanitizedTitle = sanitizeHtml(title);
      var sanitizedDescription = sanitizeHtml(description, {
        allowedTags: ['h1']
      });
      var list = template.list(req.list);
      var html = template.HTML(sanitizedTitle, list,
        `<h2>${sanitizedTitle}</h2>${sanitizedDescription}`,
        ` <a href="/pages">main page</a>
          <a href="/page_update/${sanitizedTitle}">update</a>
          <form action="/page_delete_process" method="post">
            <input type="hidden" name="id" value="${sanitizedTitle}">
            <input type="submit" value="delete">
          </form>`,
        req.user.email
      );
      res.send(html);
    }
  });
});



app.get('/page_create', function (req, res) {
  if (req.user === undefined) {
    res.redirect(`/login`);
    return false;
  }
  var title = 'WEB - create';
  var list = template.list(req.list);
  var html = template.HTML(title, list, `
    <form action="/page_create_process" method="post">
      <p><input type="text" name="title" placeholder="title"></p>
      <p>
        <textarea name="description" placeholder="description"></textarea>
      </p>
      <p>
        <input type="submit">

      </p>
    </form>
  `, `<a href="/pages">main page</a>`, req.user.email);
  res.send(html);
});

app.post('/page_create_process', function (req, res) {
  if (req.user === undefined) {
    res.redirect(`/login`);
    return false;
  }
  if (req.headers.cookie === undefined) {
    res.end('login plz');
    return false;
  }
  var post = req.body;
  var title = post.title;
  var description = post.description;
  fs.writeFile(`data/${title}`, description, 'utf8', function (err) {
    res.redirect(`/pages`);
    res.end();
  });
});

app.get('/page_update/:pageId', function (req, res) {
  if (req.user === undefined) {
    res.redirect(`/login`);
    return false;
  }
  var filteredId = path.parse(req.params.pageId).base;
  fs.readFile(`data/${filteredId}`, 'utf8', function (err, description) {
    var title = req.params.pageId;
    var list = template.list(req.list);
    var html = template.HTML(title, list,
      `
      <form action="/page_update_process" method="post">
        <input type="hidden" name="id" value="${title}">
        <p><input type="text" name="title" placeholder="title" value="${title}"></p>
        <p>
          <textarea name="description" placeholder="description">${description}</textarea>
        </p>
        <p>
          <input type="submit">
        </p>
      </form>
      `,
      `<a href="/">main page</a>`,
      req.user.email
    );
    res.send(html);
  });
});

app.post('/page_update_process', function (req, res) {
  if (req.user === undefined) {
    res.redirect(`/login`);
    return false;
  }
  if (req.headers.cookie === undefined) {
    res.end('login plz');
    return false;
  }
  var post = req.body;
  var id = post.id;
  var title = post.title;
  var description = post.description;
  fs.rename(`data/${id}`, `data/${title}`, function (error) {
    fs.writeFile(`data/${title}`, description, 'utf8', function (err) {
      res.redirect(`/page/${title}`);
    })
  });
});

app.post('/page_delete_process', function (req, res) {
  if (req.user === undefined) {
    res.redirect(`/login`);
    return false;
  }/*
  if (req.headers.cookie === undefined) {
    res.end('login plz');
    return false;
  }*/
  var post = req.body;
  var id = post.id;
  var filteredId = path.parse(id).base;
  fs.unlink(`data/${filteredId}`, function (error) {
    res.redirect('/pages');
  });
});

app.use(function (req, res, next) {
  res.status(404).send('page not found');
});

app.use(function (err, req, res, next) {
  res.status(500).send(err);
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
