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
const FindUser = require('./FindUser.js');
const { assert } = require('console');

const Eclass = require('./Eclass.js');
const DB_IO = require('./db_io.js');
const { post } = require('request');



app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
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
})

app.get('*', function (req, res, next) {
  fs.readdir('./data', function (error, filelist) {
    req.list = filelist;
    next();
  });
});

/*app.get('/signup', async (req, res) => {
  try {
      const requestData = req.body;
      console.log('Received data from first POST request:', requestData);
      const secondPostData = {
          Student_id: requestData.Student_id,
          Student_pw: requestData.Student_pw
      };
      const response = await fetch(`http://${ip}:${port}/signup_process`, {
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
});*/

app.post('/signup', async (req, res) => {
  const { Student_id, year_semester, Student_pw, portal_id, portal_pw } = req.body;

  if (!Student_id || !Student_pw) {
    return res.status(400).json({ message: 'Username and password are required' });
  }
  FindUser.findById(Student_id, async (user) => {
    if (user === false) {
      try {
        var jsonInfo = {};
        while (true) {
          try {
            jsonInfo = JSON.parse(await Eclass.Eclass(Student_id, portal_id, portal_pw));
            if (jsonInfo.timeTable.length !== 0) break;
          } catch (error) {
          }
        }
        console.log(jsonInfo);
        const result1 = await DB_IO.course_to_db(year_semester, jsonInfo.timeTable);
        const result2 = await DB_IO.timetable_to_db(Student_id, year_semester, jsonInfo.timeTable_small);
        console.log('result1', result1);
        console.log('result2', result2);
 
        //const result = await DB_IO.add_student_table(Student_id, Student_pw, student_name, student_number, department);

        res.redirect('/pages');
      } catch (error) {
        console.error('오류 발생:', error);
        res.status(500).send('오류 발생');
      }
      return res.status(400).json({ message: 'sign up success', status: true });
    }
    else {
      return res.status(400).json({ message: 'username already exists' });
    }
  });
});


app.post('/login', async (req, res, next) => {
  try {
    passport.authenticate('local', (err, user, info) => {
      if (err) { return next(err); }
      if (!user) {
        // 로그인 실패 시 JSON 응답과 함께 리다이렉트
        return res.json({ success: false, message: 'login failed' });
      }
      // 로그인 성공 시 JSON 응답과 함께 리다이렉트
      return res.json({ success: true, message: 'login success', data: user });
    })(req, res, next);
    //res.json({ result: 'success' });
  } catch (error) {
      console.error('Error during first POST request:', error);
      res.status(500).json({ result: 'error', error: error.message });
  }
});

passport.use(new LocalStrategy(
  {
    usernameField: 'Student_id',
    passwordField: 'Student_pw'
  },
  function verify(Student_id, Student_pw, cb) {
    FindUser.findByIdPw(Student_id, Student_pw, function (user) {
      //console.log('j', user.Student_id);
      if (user !== false) return cb(null, user);
      return cb(null, false, { message: 'no' });
    });
  }));

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

app.get('/main_page', async (req, res) => {
  try {
    const Student_id = req.query.studStudent_ident_id;
    const year_semester = req.query.year_semester;
    /*const _result = await Eclass.Eclass_Timetable('StudentID', 'Student_id', 'Student_pw');
    const result = JSON.parse(_result);
    console.log(result);
    res.json(result);*/

    var returnJson = { Student_id: Student_id, retCode: false, student_name: '', student_number: '',
      department: '',
      timeTable: [], schedule: [], photo: {}
    }
    const _timetable = await DB_IO.db_to_timetable(Student_id, year_semester );
    const timetable = JSON.parse(_timetable);
    returnJson.timeTable = timetable;
    const _schedule = await DB_IO.get_schedule(Student_id);
    const schedule = JSON.parse(_schedule);
    returnJson.schedule = schedule;
    console.log(returnJson);
    res.json(returnJson);
  } catch (error) {
    console.error('오류 발생:', error);
    res.status(500).send('오류 발생');
  }
});

app.get('/get_timetable_from_portal', async (req, res) => {
  try {
    const _result = await Eclass.Eclass_Timetable('StudentID', 'Student_id', 'Student_pw');
    const result = JSON.parse(_result);
    console.log(result);
    res.json(result);
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
