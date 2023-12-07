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


const compression = require('compression');
const helmet = require('helmet');

const jwt = require('jsonwebtoken');
const passport = require('passport')
  , LocalStrategy = require('passport-local')
    .Strategy;


const FindUser = require('./FindUser.js');


const Eclass = require('./Eclass.js');
const DB_IO = require('./db_io.js');
const token_secret_key = require('./token_secret_key.js');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const nodemailer = require('nodemailer');
const crypto = require('crypto');

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
    return res.status(401).json('Unauthorized');
  }

  jwt.verify(token, token_secret_key.token_secret_key, (err, user) => {
    if (err) {
      return res.sendStatus(400);
    }

    req.user = user;
    next();
  });
}

app.post('/login', express.json(), generateToken);

app.get('/id_duplicate_check', async (req, res) => {
  const Student_id = req.query.Student_id;
  const result = await DB_IO.id_duplicate_check(Student_id);
  if (result) {
    return res.status(200).json({ success: true, message: 'available id' });
  }
  else {
    return res.status(200).json({ success: false, message: 'username already exists' });
  }
});

function email_generateToken() {
  return crypto.randomBytes(4).toString('hex');
}

async function sendEmail(email, token) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: '32gurihs@gmail.com',
      pass: 'ofqh ukjz kycn orlv'
    }
  });

  const mailOptions = {
    from: 'KrooKrew@noreply.com',
    to: email,
    subject: 'KrooKrew 이메일 인증',
    text: `KrooKrew 인증을 완료하려면 다음 값을 입력하세요: ${token}`
  };

  await transporter.sendMail(mailOptions);
}

app.get('/verify1', async (req, res) => {
  try {
    const email = req.query.email;
    if (email !== undefined) {
      //if(await DB_IO.email_available(email))
      const token = email_generateToken();
      sendEmail(email, token);
      const result = await DB_IO.add_student_table_not_verified(email, token);

      if (result) {
        res.status(200).json({ success: true, message: 'email send success' });
      }
      else {
        res.status(200).json({ success: false, message: 'email already used' });
      }
    }
    else {
      res.status(200).json({ success: false, message: 'email required' });
    }
  } catch (error) {
    console.error('오류 발생:', error);
    res.status(400).send('오류 발생');
  }
});

app.post('/verify2', async (req, res) => {
  try {
    const { email, user_token } = req.body;
    if (email !== undefined && user_token !== undefined) {

      const result = await DB_IO.student_verify(email, user_token);

      if (result) {
        return res.status(200).json({ success: true, message: 'auth success' });
      }
      else {
        return res.status(200).json({ success: false, message: 'auth fail' });
      }
    }
    else {
      return res.status(200).json({ success: false, message: 'email and token required' });
    }
  } catch (error) {
    console.error('오류 발생:', error);
    res.status(400).send('오류 발생');
  }
});

app.post('/signup', async (req, res) => {
  const { Student_id, Student_pw, portal_id, portal_pw, email } = req.body;

  const has_verified = await DB_IO.has_student_verified(email);
  if (has_verified) {
    const year_semester = _year_semester();

    if (!Student_id || !Student_pw) {
      return res.status(200).json({ success: false, message: 'Username and password are required' });
    }
    if (portal_id === undefined || portal_pw === undefined) {
      return res.status(200).json({ success: false, message: 'portal id and password are required' });
    }
    const id_duplicate_check1 = await DB_IO.id_duplicate_check(Student_id);
    if (id_duplicate_check1) {
      const _email_used = await DB_IO.email_used(email);
      if (_email_used) {
        try {
          var jsonInfo = {};
          while (true) {
            try {
              jsonInfo = JSON.parse(await Eclass.Eclass(Student_id, portal_id, portal_pw));
              if (jsonInfo.timeTable.length !== 0) break;
              if (jsonInfo.retCode === false) return res.status(200).json({ success: false, message: 'portal_login_failed' });
            } catch (error) {
              console.error('오류 발생:', error);
            }
          }
          //console.log(jsonInfo);
          const id_duplicate_check2 = await DB_IO.id_duplicate_check(Student_id);
          if (id_duplicate_check2) {
            const result1 = await DB_IO.course_to_db(year_semester, jsonInfo.timeTable);
            const result2 = await DB_IO.timetable_to_db(Student_id, year_semester, jsonInfo.timeTable_small);
            //console.log('result1', result1);
            //console.log('result2', result2);

            const result = await DB_IO.add_student_table(email, Student_id, Student_pw, jsonInfo.student_name, jsonInfo.student_number, jsonInfo.department, portal_id, portal_pw);
            //console.log(result);
            if (result) {
              return res.status(200).json({ success: result, message: 'sign up success' });
            }
          }
          else {
            return res.status(200).json({ success: result, message: 'username already exists' });
          }
        } catch (error) {
          console.error('오류 발생:', error);
          res.status(400).send('오류 발생');
        }
      }
      else {
        return res.status(200).json({ success: false, message: 'already signed up with that email' });
      }
      //return res.status(400).json({ message: 'sign up success', status: true });
    }
    else {
      return res.status(200).json({ success: false, message: 'username already exists' });
    }
  }
  else {
    return res.status(200).json({ success: false, message: 'email not verified yet' });
  }
});

app.post('/change_password', authenticateToken, async (req, res) => {
  const Student_id = req.user.user.Student_id;
  const { current_password, new_password } = req.body;
  try {
    const result = await DB_IO.change_password(Student_id, current_password, new_password);
    if (result) {
      return res.status(200).json({ success: result, message: 'change password success' });
    }
    else {
      return res.status(200).json({ success: result, message: 'change password fail password incorrect' });
    }
  } catch (error) {
    console.error('오류 발생:', error);
    res.status(400).send('오류 발생');
  }
});

app.get('/signout', authenticateToken, async (req, res) => {
  const Student_id = req.user.user.Student_id;
  const year_semester = _year_semester();
  try {
    var result = true;
    result = result && await DB_IO.sign_out(Student_id);
    const teams = JSON.parse(await DB_IO.list_my_team(Student_id, year_semester));
    //console.log(teams);
    for (let i = 0; i < teams.length; i++) {
      //console.log(teams[i].Team_id, Student_id);
      result = result && (await DB_IO.leave_team(teams[i].Team_id, Student_id));
    }
    if (result) {
      return res.status(200).json({ success: result, message: 'sign out success' });
    }
    else {
      return res.status(200).json({ success: result, message: 'sign out fail' });
    }
  } catch (error) {
    console.error('오류 발생:', error);
    res.status(400).send('오류 발생');
  }
});

app.get('/find_id_by_email', async (req, res) => {
  const email = req.query.email;
  try {
    result = await DB_IO.find_id_by_email(email);
    if (result) {
      return res.status(200).json({ success: true, Student_id: result });
    }
    else {
      return res.status(200).json({ success: false, message: 'cannot find id' });
    }
  } catch (error) {
    console.error('오류 발생:', error);
    res.status(400).send('오류 발생');
  }
});

app.get('/find_pw_by_email_token_insert', async (req, res) => {
  try {
    const Student_id = req.query.Student_id;
    const email = await DB_IO.get_email_from_id(Student_id);
    if(email){
      const new_pw_token = email_generateToken();
      sendEmail(email, new_pw_token);
      result = await DB_IO.find_pw_by_email_token_insert(email, new_pw_token);
      if (result) {
        res.status(200).json({ success: true, message: 'email send success' });
      }
      else {
        res.status(200).json({ success: false, message: 'email send fail' });
      }
    }
    else{
      res.status(200).json({ success: false, message: 'no email found' });
    }
  } catch (error) {
    console.error('오류 발생:', error);
    res.status(400).send('오류 발생');
  }
});

app.post('/find_pw_by_email_token_check', async (req, res) => {
  try {
    const { Student_id, new_pw_token, new_password } = req.body;
    const email = await DB_IO.get_email_from_id(Student_id);
    if(email){
      result = await DB_IO.find_pw_by_email_token_check(email, new_pw_token, new_password);
      if (result) {
        res.status(200).json({ success: true, message: 'password changed' });
      }
      else {
        res.status(200).json({ success: false, message: 'wrong token or email' });
      }
    }
    else{
      res.status(200).json({ success: false, message: 'no email found' });
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

app.get('/main_page', authenticateToken, async (req, res) => {
  try {
    const Student_id = req.user.user.Student_id;
    const year_semester = _year_semester();
    var returnJson = { retCode: false, department: '', schedule: [] }
    const student_info = JSON.parse(await DB_IO.get_student_table(Student_id));
    //console.log(student_info);
    returnJson.department = student_info.department;
    const schedule = JSON.parse(await DB_IO.get_whole_schedule(Student_id, year_semester));
    //schedule.sort((a, b) => new Date(a.Deadline) - new Date(b.Deadline));
    returnJson.schedule = schedule;
    returnJson.retCode = true;
    res.status(200).json(returnJson);
  } catch (error) {
    console.error('오류 발생:', error);
    res.status(400).send('오류 발생');
  }
});

app.get('/my_page', authenticateToken, async (req, res) => {
  try {
    const Student_id = req.user.user.Student_id;
    var returnJson = {
      Student_id: Student_id, retCode: false, Student_name: '', Student_number: '',
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
    const description = req.query.description;
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
    const description = req.query.description;
    const Team_id = req.query.Team_id;
    const result = await DB_IO.add_team_description(description, Team_id, Student_id);
    res.status(200).json({ success: result });
  } catch (error) {
    console.error('오류 발생:', error);
    res.status(400).send('오류 발생');
  }
});

app.get('/rapid_match_on_off', authenticateToken, async (req, res) => {
  try {
    const Student_id = req.user.user.Student_id;
    const Team_id = req.query.Team_id;
    var rapid_match = req.query.rapid_match;
    if(rapid_match === undefined || rapid_match === 'false' || rapid_match === 0) rapid_match = 0;
    else rapid_match = 1;
    const result = await DB_IO.rapid_match_on_off(Team_id, Student_id, rapid_match);
    if(result){
      res.status(200).json({ success: result, message: "rapid_change updated" });
    }
    else{
      res.status(200).json({ success: result, message: "no team or not head" });
    }
  } catch (error) {
    console.error('오류 발생:', error);
    res.status(400).send('오류 발생');
  }
});

app.post('/my_page_photo_upload', authenticateToken, async (req, res) => {
  try {
    const Student_id = req.user.user.Student_id;
    const ProfilePhoto = req.body.ProfilePhoto;
    //const ProfilePhoto = fs.readFileSync('KrooKrew.png');
    const result = await DB_IO.update_photo_student_table(Student_id, ProfilePhoto);
    res.status(200).json({ Student_id: Student_id, success: result });
  } catch (error) {
    console.error('오류 발생:', error);
    res.status(400).send('오류 발생');
  }
});

app.get('/get_timetable_from_db', authenticateToken, async (req, res) => {
  try {
    const Student_id = req.user.user.Student_id;
    const year_semester = _year_semester();
    //const result1 = JSON.parse(await DB_IO.db_to_timetable(Student_id, year_semester));
    const result2 = JSON.parse(await DB_IO.db_to_timetable_small(Student_id, year_semester));
    const teams = JSON.parse(await DB_IO.list_my_team(Student_id, year_semester));
    //console.log(result)
    res.status(200).json({ /*timetable: result1, */timetable_small: result2, teams: teams });
  } catch (error) {
    console.error('오류 발생:', error);
    res.status(400).send('오류 발생');
  }
});

app.get('/get_timetable_from_portal', authenticateToken, async (req, res) => {
  try {
    const Student_id = req.user.user.Student_id;
    const year_semester = _year_semester();
    var jsonInfo = {};
    while (true) {
      try {
        const portal_info = JSON.parse(await DB_IO.get_portal_info(Student_id));
        jsonInfo = JSON.parse(await Eclass.Eclass(Student_id, portal_info.portal_id, portal_info.portal_pw));
        if (jsonInfo.timeTable.length !== 0) break;
        if (jsonInfo.retCode === false) return res.status(200).json({ success: false, message: 'portal_login_failed' });
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
    const teams = JSON.parse(await DB_IO.list_my_team(Student_id, year_semester));
    //console.log(result1);
    //console.log(result2);
    res.status(200).json({ success: true, /*timetable: result3, */timetable_small: result4, teams: teams });
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
    const jsonInfo = { teams: [] }
    for (let i = 0; i < result.length; i++) {
      result[i].average_speed = await DB_IO.get_team_avg_speed(result[i].Team_id);
      jsonInfo.teams.push(result[i])
    }
    res.status(200).json(jsonInfo);
  } catch (error) {
    console.error('오류 발생:', error);
    res.status(400).send('오류 발생');
  }
});

app.get('/list_whole_team', authenticateToken, async (req, res) => {
  try {
    const Student_id = req.user.user.Student_id;
    const search = req.query.search;
    const year_semester = _year_semester();
    const result = JSON.parse(await DB_IO.list_whole_team(Student_id, year_semester));
    const jsonInfo = { teams: [] }
    for (let i = 0; i < result.length; i++) {
      if (search !== undefined && result[i].Course_name.includes(search) || search === undefined) {
        result[i].average_speed = await DB_IO.get_team_avg_speed(result[i].Team_id);
        jsonInfo.teams.push(result[i])
      }
    }
    res.status(200).json(jsonInfo);
  } catch (error) {
    console.error('오류 발생:', error);
    res.status(400).send('오류 발생');
  }
});

app.get('/delete_team', authenticateToken, async (req, res) => {
  try {
    const Student_id = req.user.user.Student_id;
    const Team_id = req.query.Team_id;
    const result = await DB_IO.delete_team(Team_id, Student_id);
    //console.log(result);
    res.status(200).json({ retCode: result });
  } catch (error) {
    console.error('오류 발생:', error);
    res.status(400).send('오류 발생');
  }
});

app.get('/get_team_avg_speed', authenticateToken, async (req, res) => {
  try {
    const Team_id = req.query.Team_id;
    //const Team_name = req.query.Team_name
    const result = await DB_IO.get_team_avg_speed(Team_id);
    //console.log(result);
    res.status(200).json({ success: result });
  } catch (error) {
    console.error('오류 발생:', error);
    res.status(400).send('오류 발생');
  }
});

app.get('/leave_team', authenticateToken, async (req, res) => {
  try {
    const Student_id = req.user.user.Student_id;
    const Team_id = req.query.Team_id;
    //const Team_name = req.query.Team_name
    const result = await DB_IO.leave_team(Team_id, Student_id);
    //console.log(result);
    res.status(200).json({ success: result });
  } catch (error) {
    console.error('오류 발생:', error);
    res.status(400).send('오류 발생');
  }
});

app.get('/vote_my_team_list_expired_teams', authenticateToken, async (req, res) => {
  //res.setHeader('Content-Security-Policy', "form-action 'self' *");
  try {
    const Student_id = req.user.user.Student_id;
    const year_semester = _year_semester();
    const result = JSON.parse(await DB_IO.list_team_expired(Student_id, year_semester));
    //console.log(result);
    res.status(200).json({ teams: result });
  } catch (error) {
    console.error('오류 발생:', error);
    res.status(400).send('오류 발생');
  }
});

app.get('/vote_my_team_list_team_people', authenticateToken, async (req, res) => {
  //res.setHeader('Content-Security-Policy', "form-action 'self' *");
  try {
    const Student_id = req.user.user.Student_id;
    const Team_id = req.query.Team_id;
    if (!await DB_IO.has_team_expired(Team_id)) {
      res.status(200).json({ success: false, message: 'team not expired' });
      return;
    }
    const result = JSON.parse(await DB_IO.list_team_peole(Student_id, Team_id));
    //console.log(result);
    res.status(200).json({ Team_id: Team_id, people: result });
  } catch (error) {
    console.error('오류 발생:', error);
    res.status(400).send('오류 발생');
  }
});

app.post('/vote_my_team', authenticateToken, async (req, res) => {
  //res.setHeader('Content-Security-Policy', "form-action 'self' *");
  try {
    const Student_id = req.user.user.Student_id;
    const Team_id = req.body.Team_id;
    if (!await DB_IO.has_team_expired(Team_id)) {
      res.status(200).json({ success: false, message: 'team not expired' });
      return;
    }
    const votes = req.body.votes;
    if (await DB_IO.team_voted(Team_id, Student_id)) {
      res.status(200).json({ success: false, message: 'team already voted' });
      return;
    }
    const list_peole = JSON.parse(await DB_IO.list_team_peole(Student_id, Team_id));
    if (list_peole.length !== votes.length) {
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
      if (!['1', '2', '3', '4', '5'].includes(votes[i].vote_value)) {
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
    result = result && await DB_IO.team_vote(Team_id, Student_id);
    res.status(200).json({ success: result, message: 'success' });
  } catch (error) {
    console.error('오류 발생:', error);
    res.status(400).send('오류 발생');
  }
});

app.get('/create_team', authenticateToken, async (req, res) => {
  try {
    const Student_id = req.user.user.Student_id;
    const Course_id = req.query.Course_id;
    const Team_name = req.query.Team_name;
    const max_member = req.query.max_member;
    const description = req.query.description;
    const finish_time = req.query.finish_time;
    var rapid_match = req.query.rapid_match;
    if(rapid_match === undefined || rapid_match === 'false' || rapid_match === 0) rapid_match = 0;
    else rapid_match = 1;
    const result = await DB_IO.create_team(Course_id, Team_name, max_member, Student_id, description, finish_time, rapid_match);
    //console.log(result);
    res.status(200).json({ success: result });
  } catch (error) {
    console.error('오류 발생:', error);
    res.status(400).send('오류 발생');
  }
});

app.get('/rapid_match', authenticateToken, async (req, res) => {
  try {
    const Student_id = req.user.user.Student_id;
    const Course_id = req.query.Course_id;
    //const Team_name = req.query.Team_name
    const result = await DB_IO.rapid_match(Course_id, Student_id);
    //console.log(result);
    res.status(200).json(JSON.parse(result));
  } catch (error) {
    console.error('오류 발생:', error);
    res.status(400).send('오류 발생');
  }
});

app.get('/join_team_request', authenticateToken, async (req, res) => {
  try {
    const Student_id = req.user.user.Student_id;
    const Team_id = req.query.Team_id;
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
    if (permit === 'true') {
      const result = await DB_IO.join_team_response_accept(JoinRequest_id, Team_id, requested_Student_id, Student_id);
      res.status(200).json(JSON.parse(result));
    }
    else if (permit === 'false') {
      const result = await DB_IO.join_team_response_reject(JoinRequest_id, Team_id, requested_Student_id, Student_id);
      res.status(200).json(JSON.parse(result));
    }
    else {
      res.status(200).json({ success: false, message: 'unknown permit value' });
    }
  } catch (error) {
    console.error('오류 발생:', error);
    res.status(400).send('오류 발생');
  }
});

app.get('/add_schedule', authenticateToken, async (req, res) => {
  try {
    const Student_id = req.user.user.Student_id;
    const Team_id = req.query.Team_id;
    const Deadline = req.query.Deadline;
    const description = req.query.description;
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

app.get('/kill', authenticateToken, async (req, res) => {
  const Student_id = req.user.user.Student_id;
  if(Student_id === 'admin') process.exit();
});

app.use(function (req, res, next) {
  res.status(404).send('page not found');
});

app.listen(port, () => {
  console.log(`Amazing app listening on port ${port}`)
})
