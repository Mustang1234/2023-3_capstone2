const db = require('./db');
const lodash = require('lodash');
//const Eclass = require('./Eclass');

module.exports = {
    course_to_db: async (year_semester, timetable) => {
        try {
            if (timetable.length === 0) {
                console.log('no table');
                return false;
            }
            const groupedData = lodash.groupBy(timetable, 'name');
            const timetable_result = Object.values(groupedData).map(group => group);
            const j = timetable_result.length;
            for (let i = 0; i < j; i++) {
                const time_table_index = timetable_result[i];
                const CourseID = year_semester + time_table_index[0].day + time_table_index[0].time + time_table_index[0].name;
                const answer = await new Promise((resolve, reject) => {
                    db.query(`SELECT * FROM CourseTable WHERE Course_id = ?`,[CourseID], (error, rows) => {
                        if (error) {
                            console.error(error);
                            reject(error);
                        } else {
                            resolve(rows.length);
                        }
                    });
                });
                if(answer === 0){
                    const l = time_table_index.length;
                    for (let k = 0; k < l; k++) {
                        const time_table_index2 = time_table_index[k];
                        await new Promise((resolve, reject) => {
                            db.query(`INSERT INTO CourseTable (Course_id, Course_name, year_semester, day, time) VALUES (?, ?, ?, ?, ?)`,
                            [CourseID, time_table_index2.name, year_semester, time_table_index2.day, time_table_index2.time], (error) => {
                                if (error) {
                                    console.error(error);
                                    reject(error);
                                } else {
                                    resolve();
                                }
                            });
                        });
                    }
                }
            }

            return true;
        } catch (error) {
            console.error('오류 발생:', error);
            //res.status(500).send('오류 발생');
        }
    },
    timetable_to_db: async (Student_id, year_semester, timetable_small) => {
        try {
            if (timetable_small.length === 0) {
                console.log('no table');
                return false;
            }
            // 먼저 해당 학생 및 학기의 시간표 데이터를 모두 삭제
            await new Promise((resolve, reject) => {
                db.query(`DELETE FROM TimeTable WHERE Student_id = ? AND year_semester = ?`, [Student_id, year_semester], (error) => {
                    if (error) {
                        console.error(error);
                        reject(error);
                    } else {
                        resolve();
                    }
                });
            });

            const j = timetable_small.length;
            for (let i = 0; i < j; i++) {
                const data = timetable_small[i];
                await new Promise((resolve, reject) => {
                    db.query(`INSERT INTO TimeTable (Student_id, Course_id, year_semester) VALUES (?, ?, ?)`, 
                    [Student_id, year_semester+data.day+data.time+data.name, year_semester], (error) => {
                        if (error) {
                            console.error(error);
                            reject(error);
                        } else {
                            resolve();
                        }
                    });
                });
            }

            return true;
        } catch (error) {
            console.error('오류 발생:', error);
            res.status(500).send('오류 발생');
        }
    },
    db_to_timetable: async (Student_id, year_semester) => {
        try {
            const timeTable = await new Promise((resolve, reject) => {
                db.query(`SELECT B.day, B.time, B.Course_name
                FROM TimeTable as A INNER JOIN  CourseTable as B 
                ON A.Course_id = B.Course_id and A.Student_id = ? and A.year_semester = ?`, [Student_id, year_semester], (error, rows) => {
                    if (error) {
                        console.error(error);
                        reject(error);
                    } else {
                        const j = rows.length;
                        var result = [];
                        for (let i = 0; i < j; i++) {
                            result.push(rows[i]);
                        }
                        const Days_kor = ['월', '화', '수', '목', '금', '토', '일'];
                        result.sort((a, b) => Days_kor.indexOf(a.day) - Days_kor.indexOf(b.day));
                        resolve(result);
                    }
                });
            });
            return JSON.stringify(timeTable);
        } catch (error) {
            console.error('오류 발생:', error);
            res.status(500).send('오류 발생');
        }
    },
    db_to_timetable_small: async (Student_id, year_semester) => {
        try {
            const timeTable = await new Promise((resolve, reject) => {
                db.query(`SELECT Course_id FROM TimeTable WHERE Student_id = ? and year_semester = ?;`, [Student_id, year_semester], (error, rows) => {
                    if (error) {
                        console.error(error);
                        reject(error);
                    } else {
                        const j = rows.length;
                        var result = [];
                        for (let i = 0; i < j; i++) {
                            result.push(rows[i]);
                        }
                        resolve(result);
                    }
                });
            });
            return JSON.stringify(timeTable);
        } catch (error) {
            console.error('오류 발생:', error);
            res.status(500).send('오류 발생');
        }
    },
    get_student_table: async (Student_id) => {
        try {
            const _get_student_table = await new Promise((resolve, reject) => {
                db.query(`SELECT * FROM StudentTable where Student_id = ?`, [Student_id], (error, rows) => {
                    if (error) {
                        console.error(error);
                        reject(error);
                    } else {
                        resolve(rows[0]);
                    }
                });
            });
            return JSON.stringify(_get_student_table);
        } catch (error) {
            console.error('오류 발생:', error);
            throw new Error('오류 발생');
        }
    },
    get_student_photo_table: async (Student_id) => {
        try {
            const _get_student_photo_table = await new Promise((resolve, reject) => {
                db.query(`SELECT * FROM StudentPhotoTable where Student_id = ?`, [Student_id], (error, rows) => {
                    if (error) {
                        console.error(error);
                        reject(error);
                    } else {
                        resolve(rows[0]);
                    }
                });
            });
            return JSON.stringify(_get_student_photo_table);
        } catch (error) {
            console.error('오류 발생:', error);
            throw new Error('오류 발생');
        }
    },
    update_photo_student_table: async (Student_id, ProfilePhoto) => {
        try {
            const _update_photo_student_table = await new Promise((resolve, reject) => {
                db.query(`UPDATE StudentPhotoTable SET ProfilePhoto = ? WHERE Student_id= ?;`, [ProfilePhoto, Student_id], (error) => {
                    if (error) {
                        console.error(error);
                        reject(error);
                    } else {
                        resolve(true);
                    }
                });
            });
            return _update_photo_student_table;
        } catch (error) {
            console.error('오류 발생:', error);
            throw new Error('오류 발생');
        }
    },
    add_student_table: async (Student_id, Student_pw, student_name, student_number, department) => {
        try {
            const _add_student_table = await new Promise((resolve, reject) => {
                db.query(`INSERT INTO StudentTable
                (Student_id, Student_pw, Student_name, Student_number, Speed, department)
                VALUES (?, ?, ?, ?, ?, ?)`, [Student_id, Student_pw, student_name, student_number, 100, department], (error) => {
                    if (error) {
                        console.error(error);
                        reject(error);
                    } else {
                        resolve(true);
                    }
                });
            });
            const _add_student_photo_table = await new Promise((resolve, reject) => {
                db.query(`INSERT INTO StudentPhotoTable
                (Student_id, ProfilePhoto) VALUES (?, ?)`, [Student_id, null], (error) => {
                    if (error) {
                        console.error(error);
                        reject(error);
                    } else {
                        resolve(true);
                    }
                });
            });
            return _add_student_table && _add_student_photo_table;
        } catch (error) {
            console.error('오류 발생:', error);
            throw new Error('오류 발생');
        }
    },
    get_schedule: async (Student_id) => {
        try {
            const schedules = await new Promise((resolve, reject) => {
                db.query(`SELECT DISTINCT F.Course_name, A.Team_name, C.Deadline, C.description
                FROM TeamTable as A INNER JOIN  TeamPeopleTable as B INNER JOIN ScheduleTable as C INNER JOIN ProjectTable as D INNER JOIN TimeTable as E INNER JOIN CourseTable as F
                ON A.Team_id = B.Team_id and B.Team_id = C.Team_id and A.Project_id = D.Project_id and D.Course_id = E.Course_id and E.Course_id = F.Course_id and E.Student_id = ?`, [Student_id], (error, rows) => {
                    if (error) {
                        console.error(error);
                        reject(error);
                    } else {
                        const j = rows.length;
                        var result = [];
                        for (let i = 0; i < j; i++) {
                        const scheduleTimeString = rows[i].Deadline+':59';
                        const currentTimeString = new Date().toLocaleString();
                        console.log(scheduleTimeString);
                        console.log(currentTimeString);
                        const scheduleTime = new Date(scheduleTimeString);
                        const currentTime = new Date(currentTimeString);
                        console.log(scheduleTime);
                        console.log(currentTime);
                            result.push(rows[i]);
                        }
                        resolve(result);
                    }
                });
            });
            return JSON.stringify(schedules);
        } catch (error) {
            console.error('오류 발생:', error);
            // res 객체가 정의되지 않았으므로, 여기서 직접 응답을 처리하거나 에러를 던져야 합니다.
            throw new Error('오류 발생');
        }
    },
    add_schedule: async (Team_id, Deadline, description) => {
        try {
            const _add_schedule = await new Promise((resolve, reject) => {
            db.query(`INSERT INTO ScheduleTable (Team_id, Deadline, description)VALUES (?, ?, ?);`, [Team_id, Deadline, description], (error) => {
                if (error) {
                    console.error(error);
                    reject(error);
                } else {
                    resolve(true);
                }
            });
        });
            return _add_schedule;
        } catch (error) {
            console.error('오류 발생:', error);
            // res 객체가 정의되지 않았으므로, 여기서 직접 응답을 처리하거나 에러를 던져야 합니다.
            throw new Error('오류 발생');
        }
    },
    add_project: async (Course_id, start_time, finish_time, description) => {
        try {
            const _add_project = await new Promise((resolve, reject) => {
                db.query(`INSERT INTO ProjectTable (Course_id, start_time, finish_time, description, voted)
                VALUES (?, ?, ?, ?);`, [Course_id, start_time, finish_time, description, 0], (error) => {
                    if (error) {
                        console.error(error);
                        reject(error);
                    } else {
                        resolve(true);
                    }
                });
            });
            return _add_project;
        } catch (error) {
            console.error('오류 발생:', error);
            // res 객체가 정의되지 않았으므로, 여기서 직접 응답을 처리하거나 에러를 던져야 합니다.
            throw new Error('오류 발생');
        }
    },
    list_project: async (Course_id) => {
        try {
            const projects = await new Promise((resolve, reject) => {
                db.query(`SELECT * FROM ProjectTable WHERE Course_id = ?;`, [Course_id], (error, rows) => {
                    if (error) {
                        console.error(error);
                        reject(error);
                    } else {
                        const j = rows.length;
                        var result = [];
                        for (let i = 0; i < j; i++) {
                            result.push(rows[i]);
                        }
                        resolve(result);
                    }
                });
            });
            return JSON.stringify(projects);
        } catch (error) {
            console.error('오류 발생:', error);
            // res 객체가 정의되지 않았으므로, 여기서 직접 응답을 처리하거나 에러를 던져야 합니다.
            throw new Error('오류 발생');
        }
    },
    list_my_project: async (Student_id, year_semester) => {
        try {
            const projects = await new Promise((resolve, reject) => {
                db.query(`SELECT DISTINCT B.Project_id, B.Course_id, B.start_time, B.finish_time, B.description
                FROM TimeTable as A INNER JOIN ProjectTable as B
                ON A.Student_id = ? and A.year_semester = ? and A.Course_id = B.Course_id`, [Student_id, year_semester], (error, rows) => {
                    if (error) {
                        console.error(error);
                        reject(error);
                    } else {
                        const j = rows.length;
                        var result = [];
                        for (let i = 0; i < j; i++) {
                            result.push(rows[i]);
                        }
                        resolve(result);
                    }
                });
            });
            return JSON.stringify(projects);
        } catch (error) {
            console.error('오류 발생:', error);
            // res 객체가 정의되지 않았으므로, 여기서 직접 응답을 처리하거나 에러를 던져야 합니다.
            throw new Error('오류 발생');
        }
    },
    create_team: async (Project_id, Team_name) => {
        try {
            const _create_team = await new Promise((resolve, reject) => {
                db.query(`INSERT INTO TeamTable (Project_id, Team_name) VALUES (?, ?)`, [Project_id, Team_name], (error) => {
                    if (error) {
                        console.error(error);
                        reject(error);
                    } else {
                        resolve(true);
                    }
                });
            });
            return _create_team;
        } catch (error) {
            console.error('오류 발생:', error);
            // res 객체가 정의되지 않았으므로, 여기서 직접 응답을 처리하거나 에러를 던져야 합니다.
            throw new Error('오류 발생');
        }
    },
    join_team: async (Team_id, Student_id) => {
        try {
            const _join_team = await new Promise((resolve, reject) => {
                db.query(`INSERT INTO TeamPeopleTable (Team_id, Student_id)VALUES (?, ?);`, [Team_id, Student_id], (error) => {
                    if (error) {
                        console.error(error);
                        reject(error);
                    } else {
                        resolve(true);
                    }
                });
            });
            return _join_team;
        } catch (error) {
            console.error('오류 발생:', error);
            // res 객체가 정의되지 않았으므로, 여기서 직접 응답을 처리하거나 에러를 던져야 합니다.
            throw new Error('오류 발생');
        }
    },
    list_team: async (Project_id) => {
        try {
            const teams = await new Promise((resolve, reject) => {
                db.query(`SELECT * FROM TeamTable where Project_id = ?`, [Project_id], (error, rows) => {
                    if (error) {
                        console.error(error);
                        reject(error);
                    } else {
                        const j = rows.length;
                        var result = [];
                        for (let i = 0; i < j; i++) {
                            result.push(rows[i]);
                        }
                        resolve(result);
                    }
                });
            });
            return JSON.stringify(teams);
        } catch (error) {
            console.error('오류 발생:', error);
            // res 객체가 정의되지 않았으므로, 여기서 직접 응답을 처리하거나 에러를 던져야 합니다.
            throw new Error('오류 발생');
        }
    }
}
