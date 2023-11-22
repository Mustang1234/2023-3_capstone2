const express = require('express')
const fs = require('fs');
const app = express()
const template = require('./lib/template.js');
const path = require('path');
//const qs = require('querystring');
const sanitizeHtml = require('sanitize-html');
const port = 1234;
const ip = '20.39.186.138';
const bodyParser = require('body-parser');
const compression = require('compression');
const helmet = require('helmet');
//const cookie = require('cookie');
const session = require('express-session')
const FileStore = require('session-file-store')(session)
var passport = require('passport')
  , LocalStrategy = require('passport-local')
    .Strategy;

//var db = require('./db');
//const crypto = require('crypto')
var FindUser = require('./FindUser');
const { assert } = require('console');

const Eclass = require('./Eclass');
const DB_IO = require('./db_io.js');
const { post } = require('request');



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
  done(null, user.Student_id);
})

passport.deserializeUser(function (Student_id, done) {
  console.log("deserializeUser");
  FindUser.findById(Student_id, function (user) {
    assert(user);
    done(null, user);
    return;
  });
  //done(null, FindUser.findById(id));
})

app.get('*', function (req, res, next) {
  fs.readdir('./data', function (error, filelist) {
    req.list = filelist;
    next();
  });
});

app.get('/signup', function (req, res) {
  res.setHeader('Content-Security-Policy', "form-action 'self' *");
  if (req.user !== undefined) {
    res.redirect(`/pages`);
    return false;
  }
  var title = 'signup';
  var list = template.list(req.list);
  var html = template.HTML(title, list,
    `<form action="signup_process" method="post">
    <p><input type="text" name="Student_id" placeholder="id"></p>
    <p><input type="password" name="Student_pw" placeholder="password"></p>
    <p><input type="text" name="student_name" placeholder="student_name"></p>
    <p><input type="text" name="student_number" placeholder="student_number"></p>
    <p><input type="text" name="department" placeholder="department"></p>
    <p><input type="submit"></p>
    </form>`,
    ``,
    req.session.isLogedin
  );
  //console.log(html);
  res.send(html);
});

app.post('/signup_process', async (req, res) => {
  const { Student_id, Student_pw, student_name, student_number, department } = req.body;

  if (!Student_id || !Student_pw) {
    return res.status(400).json({ message: 'Username and password are required' });
  }
  FindUser.findById(Student_id, async (user) => {
    if (user === false) {
      const result = await DB_IO.add_student_table(Student_id, Student_pw, student_name, student_number, department);
      res.redirect(`/pages`);
      return result;
    }
    else {
      res.redirect(`/signup`);
      //return res.status(400).json({ message: 'username already exists' });
      return;
    }
  });
});

/*app.post('/login', function (req, res) {
  res.setHeader('Content-Security-Policy', "form-action 'self' *");
  if (req.user !== undefined) {
    res.redirect(`/pages`);
    return false;
  }

  console.log('login :', req.body);

  const secondPostData = {
    Student_id: req.body.Student_id,
    Student_pw: req.body.Student_pw
  };

  var data;
  fetch(`http://${ip}:${port}/login_process`, {
    method: 'POST',
    body: JSON.stringify(secondPostData),
  })
    .then(response => response.json())
    .then(_data => {
      data = _data;
      console.log('Response from second POST request:', data);
    })
    .catch(error => {
      console.error('Error during second POST request:', error);
    });

  res.json({ result: 'success', result: data });
  //console.log("postData", postData);
  //res.status(307).location('/login_process').json(postData);
  //res.json({ redirectTo: '/login_process', type:'post', data: postData });
  //return;

  //res.redirect(307, '/login_process');

  var title = 'login';
  var list = template.list(req.list);
  var html = template.HTML(title, list,
    `<form action="login_process" method="post">
    <p><input type="text" name="Student_id" placeholder="id"></p>
    <p><input type="password" name="Student_pw" placeholder="password"></p>
    <p><input type="submit"></p>
    </form>`,
    ``,
    req.session.isLogedin
  );
  res.send(html);
});*/

app.post('/login', async (req, res) => {
  try {
      const requestData = req.body;
      console.log('Received data from first POST request:', requestData);
      const secondPostData = {
          Student_id: requestData.Student_id,
          Student_pw: requestData.Student_pw
      };
      const response = await fetch(`http://${ip}:${port}/login_process`, {
          method: 'POST',
          body: JSON.stringify(secondPostData),
          headers: {
              'Content-Type': 'application/json'
          },
      });
      if (!response.ok) {
          throw new Error('Failed to fetch');
      }

      const data = await response.json();
      console.log('Response from second POST request:', data);
      res.json({ result: 'success', data });
  } catch (error) {
      console.error('Error during first POST request:', error);
      res.status(500).json({ result: 'error', error: error.message });
  }
});

app.post('/login_process', (req, res) => {
  const requestData = req.body;
  console.log('Received data from second POST request:', requestData);

  // 두 번째 POST 요청에 응답
  res.json({ result: 'success', data: requestData });
});

/*app.post('/login_process',
  passport.authenticate('local', {
    //successFlash: '로그인 성공!',
    //failureFlash: '로그인 실패!',
    successRedirect: '/pages', // 성공 시 리다이렉트할 경로
    failureRedirect: '/login' // 실패 시 리다이렉트할 경로
  }));
*/

/*app.post('/login_process', async (req, res) => {
  console.log('req.body', req.body);
  res.redirect(`/pages`);
  return;
});*/

passport.use(new LocalStrategy(
  {
    usernameField: 'Student_id',
    passwordField: 'Student_pw'
  },
  function verify(Student_id, Student_pw, cb) {
    /*db.query('SELECT * from Users', (error, rows, fields) => {
      if (error) throw error;
      else{
        console.log('User info is: ', rows);
      }
    });
 
    if (id === authdata.id && pw === authdata.pw) {
      console.log("ok");
      return cb(null, authdata);
    }
    else {
      console.log("no");
      return cb(null, false, { message: 'no' });
    }*/
    console.log(Student_id, Student_pw);
    FindUser.findByIdPw(Student_id, Student_pw, function (user) {
      //console.log('j', user.Student_id);
      if (user !== false) return cb(null, user);
      return cb(null, false, { message: 'no' });
    });/* 
      db.get('SELECT * FROM Users WHERE id = ?', [id], function (err, user) {
        console.log("hi");
        if (err) { return cb(err); }
        if (!user) { console.log('Incorrect id or pw.'); return cb(null, false, { message: 'Incorrect id or pw.' }); }
        if (user.id == id) {
          if (user.pw == pw) {
            console.log("ok");
            return cb(null, authdata);
          }
          else {
            console.log("no");
            return cb(null, false, { message: 'no' });
          }
        }
        crypto.pbkdf2(pw, user.salt, 310000, 32, 'sha256', function(err, hashedpw) {
          if (err) { return cb(err); }
          if (!crypto.timingSafeEqual(user.hashed_pw, hashedpw)) {
            console.log('Incorrect id or pw.');
            return cb(null, false, { message: 'Incorrect id or pw.' });
          }
          return cb(null, user);
        });
      });*/
  }));
/*
app.post('/login_process', function (req, res) {
  var post = req.body;
  var id = post.id;
  var pw = post.pw;
  if(id === 'fdsa' && pw === 'rewq'){
    req.session.isLogedin = true;
    req.session.id = id;
    req.session.save(function(){
      res.redirect(`/pages`);
    });
  }
  else{
    req.session.isLogedin = false;
    req.session.id = '';
    req.session.save(function(){
      res.redirect(`/login`);
    });
  }
});*/

app.get('/logout', (req, res) => {
  req.logout(() => {
    res.redirect('/login');
  });
});

app.get('/pages', function (req, res) {
  res.setHeader('Content-Security-Policy', "form-action 'self' *");
  if (req.user === undefined) {
    res.redirect(`/login`);
    return false;
  }
  var title = 'Welcome! ' + req.user.Student_id;
  var description = 'Hello, Node.js';
  var list = template.list(req.list);
  var html = template.HTML(title, list,
    `<h2>${title}</h2>${description}
    <img src="image/hello.jpg" style="width:100px; display:block;">`,
    `<a href="/page_create">create</a>`,
    req.user.Student_id
  );
  res.send(html);
});

app.get('/page/:pageId', function (req, res, next) {
  res.setHeader('Content-Security-Policy', "form-action 'self' *");
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
        req.user.Student_id
      );
      res.send(html);
    }
  });
});



app.get('/page_create', function (req, res) {
  res.setHeader('Content-Security-Policy', "form-action 'self' *");
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
  `, `<a href="/pages">main page</a>`, req.user.Student_id);
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
  res.setHeader('Content-Security-Policy', "form-action 'self' *");
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
      req.user.Student_id
    );
    res.send(html);
  });
});

app.post('/page_update_process', function (req, res) {
  res.setHeader('Content-Security-Policy', "form-action 'self' *");
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

app.get('/get_timetable_from_portal', async (req, res) => {
  try {
    const _result = await Eclass.Eclass_Timetable('StudentID', 'Student_id', 'Student_pw');
    const result = JSON.parse(_result);
    console.log(result);
    res.redirect('/pages');
  } catch (error) {
    console.error('오류 발생:', error);
    res.status(500).send('오류 발생');
  }
});

app.get('/test', async (req, res) => {
  try {
    var i = 0;
    var jsonInfo = {};
    while (true) {
      i = i + 1;
      try {
        jsonInfo = JSON.parse(await Eclass.Eclass('admin', 'joonkkkk1234', '@kjkszpj12'));
        if (jsonInfo.timeTable.length !== 0) break;
      } catch (error) {
      }
    }
    console.log(jsonInfo);
    const result1 = await DB_IO.course_to_db("2023-3", jsonInfo.timeTable);
    const result2 = await DB_IO.timetable_to_db("admin", "2023-3", jsonInfo.timeTable_small);
    console.log(result1);
    console.log(result2);
    res.redirect('/pages');
  } catch (error) {
    console.error('오류 발생:', error);
    res.status(500).send('오류 발생');
  }
});

app.get('/test2', async (req, res) => {
  try {
    const _result = await DB_IO.db_to_timetable("admin", "2023-3");
    const result = JSON.parse(_result);
    console.log(result)
    res.redirect('/pages');
  } catch (error) {
    console.error('오류 발생:', error);
    res.status(500).send('오류 발생');
  }
});

app.get('/test3', async (req, res) => {
  try {
    const _result = await DB_IO.get_schedule("admin");
    const result = JSON.parse(_result);
    console.log(result);
    res.redirect('/pages');
  } catch (error) {
    console.error('오류 발생:', error);
    res.status(500).send('오류 발생');
  }
});

app.get('/add_project1', function (req, res) {
  res.setHeader('Content-Security-Policy', "form-action 'self' *");
  /*if (req.user !== undefined) {
    res.redirect(`/pages`);
    return false;
  }*/
  var title = 'add_project';
  var list = template.list(req.list);
  var html = template.HTML(title, list,
    `<form action="/add_project_process" method="post">
    <p><input type="text" name="Course_id" placeholder="course id"></p>
    <p><input type="text" name="start_time" placeholder="yyyy-mm-dd HH:MM"></p>
    <p><input type="text" name="Finish_time" placeholder="yyyy-mm-dd HH:MM"></p>
    <p><input type="text" name="description" placeholder="description"></p>
    <p><input type="submit"></p>
    </form>`,
    ``,
    req.session.isLogedin
  );
  res.send(html);
});

app.post('/add_project_process', async (req, res) => {
  /*if (req.user === undefined) {
    res.redirect(`/login`);
    return false;
  }*/
  try {
    const { Course_id, start_time, Finish_time, description } = req.body;
    const result = await DB_IO.add_project(Course_id, start_time, Finish_time, description);
    console.log(result);
    res.redirect(`/pages`);
    res.end();
  } catch (error) {
    console.error('오류 발생:', error);
    res.status(500).send('오류 발생');
  }
});

app.get('/list_project', function (req, res) {
  res.setHeader('Content-Security-Policy', "form-action 'self' *");
  /*if (req.user !== undefined) {
    res.redirect(`/pages`);
    return false;
  }*/
  var title = 'list_project';
  var list = template.list(req.list);
  var html = template.HTML(title, list,
    `<form action="/list_project_process" method="post">
    <p><input type="text" name="Student_id" placeholder="Student_id"></p>
    <p><input type="text" name="year_semester" placeholder="year_semester"></p>
    <p><input type="submit"></p>
    </form>`,
    ``,
    req.session.isLogedin
  );
  res.send(html);
});

app.post('/list_project_process', async (req, res) => {
  /*if (req.user === undefined) {
    res.redirect(`/login`);
    return false;
  }*/
  try {
    const { Student_id, year_semester } = req.body;
    const _result = await DB_IO.list_project(Student_id, year_semester);
    const result = JSON.parse(_result);
    console.log(result);
    res.redirect(`/pages`);
    res.end();
  } catch (error) {
    console.error('오류 발생:', error);
    res.status(500).send('오류 발생');
  }
});

app.get('/create_team', function (req, res) {
  res.setHeader('Content-Security-Policy', "form-action 'self' *");
  /*if (req.user !== undefined) {
    res.redirect(`/pages`);
    return false;
  }*/
  var title = 'create_team';
  var list = template.list(req.list);
  var html = template.HTML(title, list,
    `<form action="/create_team_process" method="post">
    <p><input type="text" name="Project_id" placeholder="Project_id"></p>
    <p><input type="text" name="Team_name" placeholder="Team_name"></p>
    <p><input type="submit"></p>
    </form>`,
    ``,
    req.session.isLogedin
  );
  res.send(html);
});

app.post('/create_team_process', async (req, res) => {
  /*if (req.user === undefined) {
    res.redirect(`/login`);
    return false;
  }*/
  try {
    const { Project_id, Team_name } = req.body;
    const result = await DB_IO.create_team(parseInt(Project_id, 10), Team_name);
    console.log(result);
    res.redirect(`/pages`);
    res.end();
  } catch (error) {
    console.error('오류 발생:', error);
    res.status(500).send('오류 발생');
  }
});

app.get('/list_team', function (req, res) {
  res.setHeader('Content-Security-Policy', "form-action 'self' *");
  /*if (req.user !== undefined) {
    res.redirect(`/pages`);
    return false;
  }*/
  var title = 'list_team';
  var list = template.list(req.list);
  var html = template.HTML(title, list,
    `<form action="/list_team_process" method="post">
    <p><input type="text" name="Project_id" placeholder="Project_id"></p>
    <p><input type="submit"></p>
    </form>`,
    ``,
    req.session.isLogedin
  );
  res.send(html);
});

app.post('/list_team_process', async (req, res) => {
  /*if (req.user === undefined) {
    res.redirect(`/login`);
    return false;
  }*/
  try {
    var post = req.body;
    Project_id = post.Project_id;
    const _result = await DB_IO.list_team(Project_id);
    const result = JSON.parse(_result);
    console.log(result);
    res.redirect(`/pages`);
    res.end();
  } catch (error) {
    console.error('오류 발생:', error);
    res.status(500).send('오류 발생');
  }
});

app.get('/add_schedule', function (req, res) {
  res.setHeader('Content-Security-Policy', "form-action 'self' *");
  /*if (req.user !== undefined) {
    res.redirect(`/pages`);
    return false;
  }*/
  var title = 'add_schedule';
  var list = template.list(req.list);
  var html = template.HTML(title, list,
    `<form action="/add_schedule_process" method="post">
     <p><input type="text" name="Team_id" placeholder="Team_id"></p>
     <p><input type="text" name="Deadline" placeholder="Deadline"></p>
     <p><input type="text" name="description" placeholder="description"></p>
     <p><input type="submit"></p>
     </form>`,
    ``,
    req.session.isLogedin
  );
  res.send(html);
});

app.post('/add_schedule_process', async (req, res) => {
  /*if (req.user === undefined) {
    res.redirect(`/login`);
    return false;
  }*/
  try {
    const { Team_id, Deadline, description } = req.body;
    const _result = await DB_IO.add_schedule(Team_id, Deadline, description);
    const result = JSON.parse(_result);
    console.log(result);
    res.redirect(`/pages`);
    res.end();
  } catch (error) {
    console.error('오류 발생:', error);
    res.status(500).send('오류 발생');
  }
});

app.get('/join_team', function (req, res) {
  res.setHeader('Content-Security-Policy', "form-action 'self' *");
  /*if (req.user !== undefined) {
    res.redirect(`/pages`);
    return false;
  }*/
  var title = 'join_team';
  var list = template.list(req.list);
  var html = template.HTML(title, list,
    `<form action="/join_team_process" method="post">
    <p><input type="text" name="Team_id" placeholder="Team_id"></p>
    <p><input type="text" name="Student_id" placeholder="Student_id"></p>
    <p><input type="submit"></p>
    </form>`,
    ``,
    req.session.isLogedin
  );
  res.send(html);
});

app.post('/join_team_process', async (req, res) => {
  /*if (req.user === undefined) {
    res.redirect(`/login`);
    return false;
  }*/
  try {
    const { Team_id, Student_id } = req.body;
    const _result = await DB_IO.join_team(Team_id, Student_id);
    const result = JSON.parse(_result);
    console.log(result);
    res.redirect(`/pages`);
    res.end();
  } catch (error) {
    console.error('오류 발생:', error);
    res.status(500).send('오류 발생');
  }
});

app.get('/tester', function (req, res) {
  res.setHeader('Content-Security-Policy', "form-action 'self' *");
  /*if (req.user !== undefined) {
      res.redirect(`/pages`);
      return false;
  }*/
  var title = 'list_team';
  var list = template.list(req.list);
  var html = template.HTML(title, list,
    `<form action="/tester_process" method="post">
    <p><input type="text" name="Project_id" placeholder="Project_id"></p>
    <p><input type="submit"></p>
    </form>`,
    ``,
    req.session.isLogedin
  );
  res.send(html);
});

app.post('/tester_process', async (req, res) => {
  /*if (req.user === undefined) {
    res.redirect(`/login`);
    return false;
  }*/
  try {
    //var post = req.body;
    //Project_id = post.Project_id;
    //const _result = await DB_IO.list_team(Project_id);
    //const result = JSON.parse(_result);
    //console.log(Project_id);
    res.redirect(`/pages`);
    res.end();
  } catch (error) {
    console.error('오류 발생:', error);
    res.status(500).send('오류 발생');
  }
});

/*
INSERT INTO ProjectTable (Course_id, start_time, finish_time, description)
  VALUES ('2023-3월14:00인공지능', '2023-10-25 00:00', '2023-12-25 23:59', '인공지능 구현');
*/

/*app.get('/test4', async (req, res) => {
  try {
    const result = await DB_IO.timetable_to_db("admin", "fdsa", _result.timeTable_small);
    console.log(result);
    res.redirect('/pages');
  } catch (error) {
    console.error('오류 발생:', error);
    res.status(500).send('오류 발생');
  } 
});*/


app.use(function (req, res, next) {
  res.status(404).send('page not found');
});
/*
app.use(function (err, req, res, next) {
  res.status(500).send(err);
});*/

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
