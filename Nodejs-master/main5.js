const express = require('express')
const fs = require('fs');
const app = express()
const template = require('./lib/template.js');
const path = require('path');
//const qs = require('querystring');
const sanitizeHtml = require('sanitize-html');
const port = 1234;
//const ip = '20.39.186.138';
const bodyParser = require('body-parser');
//var swaggerJsdoc = require("swagger-jsdoc");
//var swaggerUi = require("swagger-ui-express");

/*const options = {
  definition: {
    openapi: "4.0.0",
    info: {
      title: "LogRocket Express API with Swagger",
      version: "0.1.0",
      description:
        "This is a simple CRUD API application made with Express and documented with Swagger",
      license: {
        name: "MIT",
        url: "https://spdx.org/licenses/MIT.html",
      },
    },
    servers: [
      {
        url: "http://20.39.186.138:1234",
      },
    ],
  },
  apis: ["./Eclass.js", "./db_id.js"],
};
const specs = swaggerJsdoc(options);
app.use("/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(specs)
);*/

const compression = require('compression');
const helmet = require('helmet');
//const cookie = require('cookie');
//const session = require('express-session')
//const FileStore = require('session-file-store')(session)
const jwt = require('jsonwebtoken');
const passport = require('passport')
  , LocalStrategy = require('passport-local')
    .Strategy;

//var db = require('./db');
//const crypto = require('crypto')
const FindUser = require('./FindUser.js');
//const { assert } = require('console');

const Eclass = require('./Eclass.js');
const DB_IO = require('./db_io.js');
const token_secret_key = require('./token_secret_key.js');
//const { post } = require('request');



app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(compression());
app.use(express.static('public'));
app.use(helmet());

app.get('*', function (req, res, next) {
  fs.readdir('./data', function (error, filelist) {
    req.list = filelist;
    next();
  });
});

function _year_semester() {
  const date = new Date();
  const currentMonth = date.getMonth() + 1; // 월은 0부터 시작하므로 1을 더해줍니다.
  const currentDay = date.getDate();

  if ((currentMonth === 3 && currentDay >= 1) || (currentMonth > 3 && currentMonth < 6) || (currentMonth === 6 && currentDay <= 22)) {
    return `${date.getFullYear()}-1`;
  } else if ((currentMonth === 6 && currentDay >= 23) || (currentMonth > 6 && currentMonth < 9) || (currentMonth === 8 && currentDay <= 31)) {
    return `${date.getFullYear()}-2`;
  } else if ((currentMonth === 9 && currentDay >= 1) || (currentMonth > 9 && currentMonth < 12) || (currentMonth === 12 && currentDay <= 25)) {
    return `${date.getFullYear()}-3`;
  } else {
    return `${date.getFullYear()}-4`;
  }
}

passport.use(new LocalStrategy(
  {
    usernameField: 'Student_id',
    passwordField: 'Student_pw'
  },
  function verify(Student_id, Student_pw, cb) {
    FindUser.findByIdPw(Student_id, Student_pw, function (user) {
      if (user !== false) return cb(null, user);
      return cb(null, false, { message: 'no' });
    });
  }
));

// Serialize user information to store in the token
passport.serializeUser(function (user, done) {
  done(null, user.Student_id);
});

// Deserialize user information from the token
passport.deserializeUser(function (Student_id, done) {
  FindUser.findById(Student_id, function (user) {
    done(null, user);
  });
});

// Middleware to generate and sign a token after successful login
function generateToken(req, res, next) {
  passport.authenticate('local', { session: false }, (err, user, info) => {
    if (err) { return next(err); }
    if (!user) {
      return res.status(200).json({ success: false, message: 'login failed' });
    }

    const token = jwt.sign({ user }, token_secret_key.token_secret_key, { expiresIn: '1w' });
    res.status(200).json({ success: true, message: 'login success', token });
  })(req, res, next);
}

// Middleware to protect routes that require authentication
function authenticateToken(req, res, next) {
  const token = req.headers['authorization'];

  if (!token) {
    return res.sendStatus(200);
  }

  jwt.verify(token, token_secret_key.token_secret_key, (err, user) => {
    if (err) {
      return res.sendStatus(403);
    }

    req.user = user;
    next();
  });
}

app.post('/login', express.json(), generateToken);

/*app.get('/logout', (req, res) => {
  req.logout(() => {
    //res.redirect('/login');
    res.json({ success: true, message: 'log out' });
  });
});*/

app.get('/id_duplicate_check', async (req, res) => {
  const Student_id = req.query.Student_id;
  FindUser.findById(Student_id, async (user) => {
    if (user === false) {
      return res.status(200).json({ success: true, message: 'available id' });
    }
    else {
      return res.status(200).json({ success: false, message: 'username already exists' });
    }
  });
});

app.post('/signup', async (req, res) => {
  const { Student_id, Student_pw, portal_id, portal_pw } = req.body;

  const year_semester = _year_semester();

  if (!Student_id || !Student_pw) {
    return res.status(200).json({success: false,  message: 'Username and password are required' });
  }
  if (portal_id === undefined || portal_pw === undefined) {
    return res.status(200).json({success: false,  message: 'portal id and password are required' });
  }
  FindUser.findById(Student_id, async (user) => {
    if (user === false) {
      try {
        var jsonInfo = {};
        while (true) {
          try {
            jsonInfo = JSON.parse(await Eclass.Eclass(Student_id, portal_id, portal_pw));
            if (jsonInfo.timeTable.length !== 0) break;
            if (jsonInfo.retCode === false) return res.status(200).json({success: false,  message: 'portal_login_failed' });
          } catch (error) {
            console.error('오류 발생:', error);
            //res.status(200).json({ retCode: false, error: error });
            //return;
          }
        }
        //console.log(jsonInfo);
        FindUser.findById(Student_id, async (user) => {
          if (user === false) {
            const result1 = await DB_IO.course_to_db(year_semester, jsonInfo.timeTable);
            const result2 = await DB_IO.timetable_to_db(Student_id, year_semester, jsonInfo.timeTable_small);
            //console.log('result1', result1);
            //console.log('result2', result2);

            const result = await DB_IO.add_student_table(Student_id, Student_pw, jsonInfo.student_name, jsonInfo.student_number, jsonInfo.department);
            //console.log(result);
            return res.status(200).json({ success: true, message: 'sign up success', status: result });
          }
          else {
            return res.status(200).json({success: false, message: 'username already exists' });
          }
        });
      } catch (error) {
        console.error('오류 발생:', error);
        res.status(400).send('오류 발생');
      }
      //return res.status(400).json({ message: 'sign up success', status: true });
    }
    else {
      return res.status(200).json({success: false, message: 'username already exists' });
    }
  });
});

app.get('/signout', authenticateToken, async (req, res) => {
  const Student_id = req.user.user.Student_id;
  const year_semester = _year_semester();
  try {
    var result = true;
    result = result && await DB_IO.sign_out(Student_id);
    const teams = JSON.parse(await DB_IO.list_my_team(Student_id, year_semester));
    console.log(teams);
    for (let i = 0; i < teams.length; i++) {
      console.log(teams[i].Team_id, Student_id);
      result = result && (await DB_IO.leave_team(teams[i].Team_id, Student_id));
    }
    if(result) {
      return res.status(200).json({success: result, message: 'sign out success' });
    }
    else {
      return res.status(200).json({success: !result, message: 'sign out fail' });
    }
  } catch (error) {
    console.error('오류 발생:', error);
    res.status(400).send('오류 발생');
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

app.get('/pages', authenticateToken, function (req, res) {
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

app.get('/page/:pageId', authenticateToken, function (req, res, next) {
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

app.get('/page_create', authenticateToken, function (req, res) {
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

app.post('/page_create_process', authenticateToken, function (req, res) {
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

app.get('/page_update/:pageId', authenticateToken, function (req, res) {
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

app.post('/page_update_process', authenticateToken, function (req, res) {
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

app.post('/page_delete_process', authenticateToken, function (req, res) {
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

app.get('/main_page', authenticateToken, async (req, res) => {
  try {
    const Student_id = req.user.user.Student_id;
    const year_semester = _year_semester();
    var returnJson = { retCode: false, department: '', schedule: [] }
    const student_info = JSON.parse(await DB_IO.get_student_table(Student_id));
    //console.log(student_info);
    returnJson.department = student_info.department;
    const schedule = JSON.parse(await DB_IO.get_whole_schedule(Student_id, year_semester));
    returnJson.schedule = schedule;
    returnJson.retCode = true;
    res.status(200).json(returnJson);
  } catch (error) {
    console.error('오류 발생:', error);
    res.status(400).send('오류 발생');
  }
});

/*// Example route that requires authentication
app.get('/protected', authenticateToken, (req, res) => {
  res.json({ message: 'Protected route', user: req.user });
});

// Example route that requires authentication
app.post('/protected2', authenticateToken, (req, res) => {
  res.json({ message: 'Protected route2', user: req.user });
});*/

app.get('/my_page', authenticateToken, async (req, res) => {
  try {
    const Student_id = req.user.user.Student_id;
    var returnJson = { Student_id: Student_id, retCode: false, Student_name: '', Student_number: '',
      department: '', Speed: 0, ProfilePhoto: null, description: ''
    }
    const student_info = JSON.parse(await DB_IO.get_student_table(Student_id));
    //console.log(student_info);
    returnJson.Student_name = student_info.Student_name;
    returnJson.Student_number = student_info.Student_number;
    returnJson.department = student_info.department;
    returnJson.Speed = student_info.Speed;
    returnJson.description = student_info.description;
    returnJson.ProfilePhoto = JSON.parse(await DB_IO.get_student_photo_table(Student_id)).ProfilePhoto;
    returnJson.retCode = true;
    res.status(200).json(returnJson);
  } catch (error) {
    console.error('오류 발생:', error);
    res.status(400).send('오류 발생');
  }
});

app.get('/add_student_description', authenticateToken, async (req, res) => {
  try {
    const Student_id = req.user.user.Student_id;
    const description  = req.query.description;
    const result = await DB_IO.add_student_description(description, Student_id);
    res.status(200).json({ success: result });
  } catch (error) {
    console.error('오류 발생:', error);
    res.status(400).send('오류 발생');
  }
});

app.get('/add_team_description', authenticateToken, async (req, res) => {
  try {
    const Student_id = req.user.user.Student_id;
    const description  = req.query.description;
    const Team_id  = req.query.Team_id;
    const result = await DB_IO.add_team_description(description, Team_id, Student_id);
    res.status(200).json({ success: result });
  } catch (error) {
    console.error('오류 발생:', error);
    res.status(400).send('오류 발생');
  }
});

app.post('/my_page_photo_upload', authenticateToken, async (req, res) => {
  try {
    const Student_id = req.user.user.Student_id;
    const ProfilePhoto = req.body.ProfilePhoto;
    //const ProfilePhoto = fs.readFileSync('hello.jpg');
    const result = await DB_IO.update_photo_student_table(Student_id, ProfilePhoto);
    res.status(200).json({ Student_id: Student_id, success: result });
  } catch (error) {
    console.error('오류 발생:', error);
    res.status(400).send('오류 발생');
  }
});

app.post('/get_timetable_from_db', authenticateToken, async (req, res) => {
  try {
    const Student_id = req.user.user.Student_id;
    const year_semester = _year_semester();
    const result1 = JSON.parse(await DB_IO.db_to_timetable(Student_id, year_semester));
    const result2 = JSON.parse(await DB_IO.db_to_timetable_small(Student_id, year_semester));
    const projects = JSON.parse(await DB_IO.list_whole_project(Student_id, year_semester));
    //console.log(result)
    res.status(200).json({ timetable: result1, timetable_small: result2, projects: projects });
  } catch (error) {
    console.error('오류 발생:', error);
    res.status(400).send('오류 발생');
  }
});

app.post('/get_timetable_from_portal', authenticateToken, async (req, res) => {
  try {
    const Student_id = req.user.user.Student_id;
    const { portal_id, portal_pw } = req.body;
    const year_semester = _year_semester();
    if (portal_id === undefined || portal_pw === undefined) {
      return res.status(200).json({ message: 'portal id and password are required' });
    }
    ///console.log(Student_id, year_semester, portal_id, portal_pw);
    var jsonInfo = {};
    while (true) {
      try {
        jsonInfo = JSON.parse(await Eclass.Eclass(Student_id, portal_id, portal_pw));
        if (jsonInfo.timeTable.length !== 0) break;
        if (jsonInfo.retCode === false) return res.status(200).json({ message: 'portal_login_failed' });
      } catch (error) {
        console.error('오류 발생:', error);
        //res.status(400).json({ returnCode: false, error: error });  
        //return;
      }
    }
    //console.log(jsonInfo);
    const result1 = await DB_IO.course_to_db(year_semester, jsonInfo.timeTable);
    const result2 = await DB_IO.timetable_to_db(Student_id, year_semester, jsonInfo.timeTable_small);
    const result3 = JSON.parse(await DB_IO.db_to_timetable(Student_id, year_semester));
    const result4 = JSON.parse(await DB_IO.db_to_timetable_small(Student_id, year_semester));
    const projects = JSON.parse(await DB_IO.list_whole_project(Student_id, year_semester));
    //console.log(result1);
    //console.log(result2);
    res.status(200).json({ timetable: result3, timetable_small: result4, projects: projects });
  } catch (error) {
    console.error('오류 발생:', error);
    res.status(400).send('오류 발생');
  }
});

app.get('/list_my_project', authenticateToken, async (req, res) => {
  //res.setHeader('Content-Security-Policy', "form-action 'self' *");
  try {
    const Student_id = req.user.user.Student_id;
    const year_semester = _year_semester();
    const result = JSON.parse(await DB_IO.list_my_project(Student_id, year_semester));
    //console.log(result);
    res.status(200).json({ projects: result });
  } catch (error) {
    console.error('오류 발생:', error);
    res.status(400).send('오류 발생');
  }
});

app.get('/list_whole_project', authenticateToken, async (req, res) => {
  try {
    const Student_id = req.user.user.Student_id;
    const year_semester = _year_semester();
    const result = JSON.parse(await DB_IO.list_whole_project(Student_id, year_semester));
    //console.log(result);
    res.status(200).json({projects: result});
  } catch (error) {
    console.error('오류 발생:', error);
    res.status(400).send('오류 발생');
  }
});

app.get('/list_my_team', authenticateToken, async (req, res) => {
  //res.setHeader('Content-Security-Policy', "form-action 'self' *");
  try {
    const Student_id = req.user.user.Student_id;
    const year_semester = _year_semester();
    const result = JSON.parse(await DB_IO.list_my_team(Student_id, year_semester));
    //console.log(result);
    res.status(200).json({ teams: result });
  } catch (error) {
    console.error('오류 발생:', error);
    res.status(400).send('오류 발생');
  }
});

app.get('/list_whole_team', authenticateToken, async (req, res) => {
  try {
    const Student_id = req.user.user.Student_id;
    const search  = req.query.search;
    const year_semester = _year_semester();
    const result = JSON.parse(await DB_IO.list_whole_team(Student_id, year_semester));
    console.log(result)
    if(search !== undefined) {
      const jsonInfo = { teams: [] }
      for(let i = 0; i < result.length; i++){
        if(result[i].Course_name.includes(search)){
          jsonInfo.teams.push(result[i])
        }
      }
      //console.log(result);
      res.status(200).json(jsonInfo);
    }
    else {
      res.status(200).json({ teams: result });
    }
  } catch (error) {
    console.error('오류 발생:', error);
    res.status(400).send('오류 발생');
  }
});

app.get('/delete_team', authenticateToken, async (req, res) => {
  try {
    const Student_id = req.user.user.Student_id;
    const Team_id  = req.query.Team_id;
    const result = await DB_IO.delete_team(Team_id, Student_id);
    //console.log(result);
    res.status(200).json({retCode: result});
  } catch (error) {
    console.error('오류 발생:', error);
    res.status(400).send('오류 발생');
  }
});

app.get('/leave_team', authenticateToken, async (req, res) => {
  try {
    const Student_id = req.user.user.Student_id;
    const Team_id  = req.query.Team_id;
    const result = await DB_IO.leave_team(Team_id, Student_id);
    //console.log(result);
    res.status(200).json({retCode: result});
  } catch (error) {
    console.error('오류 발생:', error);
    res.status(400).send('오류 발생');
  }
});

app.get('/vote_my_project1', authenticateToken, async (req, res) => {
  //res.setHeader('Content-Security-Policy', "form-action 'self' *");
  try {
    const Student_id = req.user.user.Student_id;
    const year_semester = _year_semester();
    const result = JSON.parse(await DB_IO.list_project_expired(Student_id, year_semester));
    //console.log(result);
    res.status(200).json({ projects: result });
  } catch (error) {
    console.error('오류 발생:', error);
    res.status(400).send('오류 발생');
  }
});

app.get('/vote_my_project2', authenticateToken, async (req, res) => {
  //res.setHeader('Content-Security-Policy', "form-action 'self' *");
  try {
    const Student_id = req.user.user.Student_id;
    const Project_id = req.query.Project_id;
    if(!await DB_IO.has_project_expired(Project_id)){
      res.status(200).json({ success: false, message: 'project not expired' });
      return;
    }
    const result = JSON.parse(await DB_IO.list_project_peole(Student_id, Project_id));
    //console.log(result);
    res.status(200).json({ Project_id: Project_id, people: result });
  } catch (error) {
    console.error('오류 발생:', error);
    res.status(400).send('오류 발생');
  }
});

app.post('/vote_my_project3', authenticateToken, async (req, res) => {
  //res.setHeader('Content-Security-Policy', "form-action 'self' *");
  try {
    const Student_id = req.user.user.Student_id;
    const Project_id = req.body.Project_id;
    if(!await DB_IO.has_project_expired(Project_id)){
      res.status(200).json({ success: false, message: 'project not expired' });
      return;
    }
    const votes = req.body.votes;
    if(await DB_IO.project_voted(Project_id, Student_id)){
      res.status(200).json({ success: false, message: 'project already voted' });
      return;
    }
    const list_peole = JSON.parse(await DB_IO.list_project_peole(Student_id, Project_id));
    if(list_peole.length !== votes.length){
      res.status(200).json({ success: false, message: 'vote info incorrect' });
      return;
    }
    const j = votes.length;
    for (let i = 0; i < j; i++) {
      if (list_peole[i].Student_id !== votes[i].Student_id) {
        res.status(200).json({ success: false, message: 'vote info incorrect' });
        return;
      }
      if (Student_id === votes[i].Student_id) {
        res.status(200).json({ success: false, message: 'no vote for self' });
        return;
      }
      if(!['1', '2', '3', '4', '5'].includes(votes[i].vote_value)) {
        res.status(200).json({ success: false, message: 'unknown vote value' });
        return;
      }
    }
    var result = true;
    for (let i = 0; i < j; i++) {
      var vote_value = 0;
      if (votes[i].vote_value === '1') vote_value = -15;
      else if (votes[i].vote_value === '2') vote_value = -8;
      else if (votes[i].vote_value === '3') vote_value = 0;
      else if (votes[i].vote_value === '4') vote_value = 8;
      else if (votes[i].vote_value === '5') vote_value = 15;
      result = result && await DB_IO.vote_peole(votes[i].Student_id, vote_value);
    }
    result = result && await DB_IO.project_vote(Project_id, Student_id);
    res.status(200).json({ success: result, message: 'success' });
  } catch (error) {
    console.error('오류 발생:', error);
    res.status(400).send('오류 발생');
  }
});

app.get('/add_project1', authenticateToken, async (req, res) => {
  try {
    const Student_id = req.user.user.Student_id;
    const year_semester = _year_semester();
    const result = JSON.parse(await DB_IO.db_to_timetable_small(Student_id, year_semester));
    //console.log(result);
    res.status(200).json({timeTable: result});
  } catch (error) {
    console.error('오류 발생:', error);
    res.status(400).send('오류 발생');
  }
});

app.get('/add_project2', authenticateToken, async (req, res) => {
  try {
    const Course_id = req.query.Course_id
    const Project_name = req.query.Project_name
    const start_time = req.query.start_time
    const finish_time = req.query.finish_time
    const description = req.query.description
    const result = await DB_IO.add_project(Course_id, Project_name, start_time, finish_time, description);
    //console.log(result);
    res.status(200).json({ success: result });
  } catch (error) {
    console.error('오류 발생:', error);
    res.status(400).send('오류 발생');
  }
});

app.get('/create_team1', authenticateToken, async (req, res) => {
  try {
    const Student_id = req.user.user.Student_id;
    const year_semester = _year_semester();
    const result = JSON.parse(await DB_IO.db_to_timetable_small(Student_id, year_semester));
    //console.log(result);
    res.status(200).json({timeTable: result});
  } catch (error) {
    console.error('오류 발생:', error);
    res.status(400).send('오류 발생');
  }
});

app.get('/create_team2', authenticateToken, async (req, res) => {
  try {
    //const Student_id = req.user.user.Student_id;
    const Course_id = req.query.Course_id;
    const result = JSON.parse(await DB_IO.list_project(Course_id));
    //console.log(result);
    res.status(200).json({projects: result});
  } catch (error) {
    console.error('오류 발생:', error);
    res.status(400).send('오류 발생');
  }
});

app.get('/create_team3', authenticateToken, async (req, res) => {
  try {
    const Student_id = req.user.user.Student_id;
    const Project_id  = req.query.Project_id;
    const Team_name = req.query.Team_name;
    const max_member = req.query.max_member;
    const description = req.query.description;
    const result = await DB_IO.create_team(Project_id, Team_name, max_member, Student_id, description);
    //console.log(result);
    res.status(200).json({ success: result });
  } catch (error) {
    console.error('오류 발생:', error);
    res.status(400).send('오류 발생');
  }
});

app.get('/join_team1', authenticateToken, async (req, res) => {
  try {
    const Student_id = req.user.user.Student_id;
    const year_semester = _year_semester();
    const result = JSON.parse(await DB_IO.db_to_timetable_small(Student_id, year_semester))
    //console.log(result);
    res.status(200).json({timeTable: result});
  } catch (error) {
    console.error('오류 발생:', error);
    res.status(400).send('오류 발생');
  }
});

app.get('/join_team2', authenticateToken, async (req, res) => {
  try {
    //const Student_id = req.user.user.Student_id;
    const Course_id  = req.query.Course_id;
    const result = JSON.parse(await DB_IO.list_project(Course_id));
    //console.log(result);
    res.status(200).json({projects: result});
  } catch (error) {
    console.error('오류 발생:', error);
    res.status(400).send('오류 발생');
  }
});

app.get('/join_team3', authenticateToken, async (req, res) => {
  try {
    //const Student_id = req.user.user.Student_id;
    const Project_id  = req.query.Project_id;
    const result = JSON.parse(await DB_IO.list_team(Project_id));
    //console.log(result);
    res.status(200).json({teams: result});
  } catch (error) {
    console.error('오류 발생:', error);
    res.status(400).send('오류 발생');
  }
});

app.get('/join_team_request', authenticateToken, async (req, res) => {
  try {
    const Student_id = req.user.user.Student_id;
    const Team_id  = req.query.Team_id;
    //const Team_name = req.query.Team_name
    const result = await DB_IO.join_team_request(Team_id, Student_id);
    //console.log(result);
    res.status(200).json(JSON.parse(result));
  } catch (error) {
    console.error('오류 발생:', error);
    res.status(400).send('오류 발생');
  }
});

app.get('/join_team_request_list', authenticateToken, async (req, res) => {
  try {
    const Student_id = req.user.user.Student_id;
    //const Team_name = req.query.Team_name
    const result = await DB_IO.join_team_request_list(Student_id);
    //console.log(result);
    res.status(200).json({ requested_list: JSON.parse(result) });
  } catch (error) {
    console.error('오류 발생:', error);
    res.status(400).send('오류 발생');
  }
});

app.get('/join_team_response', authenticateToken, async (req, res) => {
  try {
    const Student_id = req.user.user.Student_id;
    const JoinRequest_id = req.query.JoinRequest_id;
    const Team_id = req.query.Team_id;
    const requested_Student_id = req.query.requested_Student_id;
    const permit = req.query.permit;
    if(permit === 'true') {
      const result = await DB_IO.join_team_response_accept(JoinRequest_id, Team_id, requested_Student_id, Student_id);
      res.status(200).json(JSON.parse(result));
    }
    else if (permit === 'false'){
      const result = await DB_IO.join_team_response_reject(JoinRequest_id, Team_id, requested_Student_id, Student_id);
      res.status(200).json(JSON.parse(result));
    }
    else {
      res.status(200).json({success: false, message: 'unknown permit value'});
    }
  } catch (error) {
    console.error('오류 발생:', error);
    res.status(400).send('오류 발생');
  }
});

app.get('/leave_team', authenticateToken, async (req, res) => {
  try {
    const Student_id = req.user.user.Student_id;
    const Team_id  = req.query.Team_id;
    //const Team_name = req.query.Team_name
    const result = await DB_IO.leave_team(Team_id, Student_id);
    //console.log(result);
    res.status(200).json({ success: result });
  } catch (error) {
    console.error('오류 발생:', error);
    res.status(400).send('오류 발생');
  }
});
/*
app.get('/add_schedule1', authenticateToken, async (req, res) => {
  try {
    const Student_id = req.user.user.Student_id;
    const year_semester = _year_semester();
    //const Team_name = req.query.Team_name
    const result = JSON.parse(await DB_IO.list_my_project(Student_id, year_semester));
    //console.log(result);
    res.status(200).json({projects: result});
  } catch (error) {
    console.error('오류 발생:', error);
    res.status(400).send('오류 발생');
  }
});
*/
app.get('/add_schedule', authenticateToken, async (req, res) => {
  try {
    const Student_id = req.user.user.Student_id;
    const Team_id = req.query.Team_id;
    const Deadline  = req.query.Deadline;
    const description  = req.query.description;
    //const Team_name = req.query.Team_name
    const result = await DB_IO.add_schedule(Student_id, Team_id, Deadline, description);
    //console.log(result);
    res.status(200).json({ success: result });
  } catch (error) {
    console.error('오류 발생:', error);
    res.status(400).send('오류 발생');
  }
});

app.get('/get_schedule', authenticateToken, async (req, res) => {
  try {
    const Student_id = req.user.user.Student_id;
    const Team_id = req.query.Team_id;
    //const Team_name = req.query.Team_name
    const result = JSON.parse(await DB_IO.get_schedule(Student_id, Team_id));
    //console.log(result);
    res.status(200).json(result);
  } catch (error) {
    console.error('오류 발생:', error);
    res.status(400).send('오류 발생');
  }
});

app.get('/test', authenticateToken, async (req, res) => {
  try {
    var jsonInfo = {};
    while (true) {
      try {
        jsonInfo = JSON.parse(await Eclass.Eclass('admin'));
        if (jsonInfo.timeTable.length !== 0) break;
      } catch (error) {
      }
    }
    //console.log(jsonInfo);
    const result1 = await DB_IO.course_to_db("2023-3", jsonInfo.timeTable);
    const result2 = await DB_IO.timetable_to_db("admin", "2023-3", jsonInfo.timeTable_small);
    //console.log(result1);
    //console.log(result2);
    res.redirect('/pages');
  } catch (error) {
    console.error('오류 발생:', error);
    res.status(400).send('오류 발생');
  }
});

app.get('/test2', authenticateToken, async (req, res) => {
  try {
    const _result = await DB_IO.db_to_timetable("admin", "2023-3");
    const result = JSON.parse(_result);
    //console.log(result)
    res.redirect('/pages');
  } catch (error) {
    console.error('오류 발생:', error);
    res.status(400).send('오류 발생');
  }
});

app.get('/test3', authenticateToken, async (req, res) => {
  try {
    const result = JSON.parse(await DB_IO.get_schedule("admin"));
    //console.log(result);
    res.redirect('/pages');
  } catch (error) {
    console.error('오류 발생:', error);
    res.status(400).send('오류 발생');
  }
});

/*app.get('/tester', authenticateToken, function (req, res) {
  res.setHeader('Content-Security-Policy', "form-action 'self' *");
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

app.post('/tester_process', authenticateToken, async (req, res) => {
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
    res.status(400).send('오류 발생');
  }
});*/

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
    res.status(400).send('오류 발생');
  } 
});*/


app.use(function (req, res, next) {
  res.status(404).send('page not found');
});
/*
app.use(function (err, req, res, next) {
  res.status(400).send(err);
});*/

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
