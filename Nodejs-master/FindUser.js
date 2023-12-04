const db = require('./db');
module.exports = {
    findByIdPw: function (Student_id, Student_pw, callback) {
        db.query(`SELECT * from StudentTable where Student_id = ? and Student_pw = ? and verified = 1`, [Student_id, Student_pw], (error, rows) => {
            if (error || rows.length == 0) {
                callback(false);
                return;
            }
            var json = JSON.stringify(rows[0]);
            var userinfo = JSON.parse(json);
            //console.log(userinfo);
            callback(userinfo);
        });
    },
    findById: function (Student_id, callback) {
        db.query(`SELECT * from StudentTable where Student_id = ? and verified = 1`, [Student_id], (error, rows) => {
            if (error || rows.length == 0) {
                callback(false);
                return;
            }
            var json = JSON.stringify(rows[0]);
            var userinfo = JSON.parse(json);
            //console.log(userinfo);
            callback(userinfo);
        });
    }
}